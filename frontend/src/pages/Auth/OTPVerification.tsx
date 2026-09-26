import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { KeyRound, ShieldAlert, ArrowLeft, CheckCircle, RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export const OTPVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification, loginWithToken } = useAuth();


  const phone: string = location.state?.phone || location.state?.mobileNumber || '';

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  // Start countdown on mount
  useEffect(() => {
    if (!phone) {
      navigate('/login');
      return;
    }
    startResendTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startResendTimer = () => {
    setCanResend(false);
    setResendCooldown(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (value: string, idx: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    setErrorMsg('');

    if (digit && idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    // Focus last filled or next empty
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');

    if (code.length < OTP_LENGTH) {
      setErrorMsg('Please enter all 6 digits of the OTP.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/auth/verify-mobile-otp', { phone, otp: code });
      const { token, agent } = res.data || {};

      if (!token || !agent) {
        setErrorMsg('Verification failed: invalid server response. Please try again.');
        setIsLoading(false);
        return;
      }

      // Establish full authenticated session (same path as email login)
      loginWithToken(token, agent);

      setIsVerified(true);
      addNotification('Login Successful', `Welcome back, ${agent.name || 'Agent'}!`, 'high', 'system');

      // Redirect based on role / status
      setTimeout(() => {
        const role = agent.role || '';
        if (role === 'delivery_partner') {
          navigate('/dashboard/delivery');
        } else if (role === 'technician') {
          navigate('/dashboard/technician');
        } else {
          navigate('/dashboard');
        }
      }, 1200);
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data || {};

      if (data.expired) {
        setErrorMsg('OTP has expired. Please click "Resend OTP" to get a new one.');
      } else if (status === 403 && data.status === 'pending') {
        // Pending approval – redirect to pending page
        navigate('/pending');
      } else if (status === 403) {
        setErrorMsg(data.message || 'Your account is not active. Please contact the Administrator.');
      } else if (status === 400) {
        setErrorMsg(data.message || 'Incorrect OTP. Please try again.');
      } else if (err?.code === 'ERR_NETWORK') {
        setErrorMsg('Cannot reach the server. Please check your connection.');
      } else {
        setErrorMsg(data.message || 'Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMsg('');
    setOtp(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();

    try {
      const res = await api.post('/auth/send-otp', { phone });
      const data = res.data || {};
      if (data.otp) {
        addNotification('OTP Resent', `Your new OTP for +91 ${phone} is: ${data.otp}`, 'high', 'system');
      } else {
        addNotification('OTP Resent', `A new OTP has been sent to +91 ${phone}.`, 'low', 'system');
      }
      startResendTimer();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to resend OTP. Please try again.';
      setErrorMsg(msg);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-[#fbf9f8] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl border border-[#eae8e7] shadow-lg p-10 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-emerald-500" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black text-[#1b1c1c] tracking-tight">Verified!</h2>
            <p className="text-xs text-[#52443a] font-medium mt-1">Redirecting to your dashboard…</p>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-[#864f19] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf9f8] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm space-y-5">

        {/* Back */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#52443a] hover:text-[#864f19] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#eae8e7] shadow-sm p-8 space-y-7">

          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-amber-50 items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7 text-[#864f19]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1b1c1c] tracking-tight">Enter OTP</h2>
              <p className="text-[11px] text-[#52443a] font-medium mt-1">
                6-digit code sent to{' '}
                <span className="font-extrabold text-[#864f19]">+91 {phone}</span>
              </p>
            </div>
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-[11px] font-bold text-red-700">{errorMsg}</span>
            </div>
          )}

          {/* OTP Inputs */}
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center gap-2.5">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  type="text"
                  maxLength={1}
                  inputMode="numeric"
                  value={digit}
                  placeholder="–"
                  aria-label={`OTP digit ${idx + 1}`}
                  ref={el => { inputRefs.current[idx] = el; }}
                  onChange={e => handleOtpChange(e.target.value, idx)}
                  onKeyDown={e => handleKeyDown(e, idx)}
                  onPaste={idx === 0 ? handlePaste : undefined}
                  className={`w-11 h-14 text-center text-xl font-extrabold rounded-xl border-2 transition-all bg-[#fbf9f8] focus:outline-none focus:border-[#864f19] focus:ring-1 focus:ring-[#864f19]/30 text-[#1b1c1c] ${
                    digit ? 'border-[#864f19]' : 'border-[#d7c3b5]/60'
                  }`}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              type="submit"
              disabled={isLoading || otp.join('').length < OTP_LENGTH}
              className="w-full py-3.5 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-[#864f19]/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Verifying…
                </>
              ) : 'Verify & Login'}
            </button>
          </form>

          {/* Resend */}
          <div className="text-center text-[11px] font-bold">
            {canResend ? (
              <button
                type="button"
                onClick={handleResendOtp}
                className="inline-flex items-center gap-1.5 text-[#864f19] hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Resend OTP
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[#847468]">
                <Clock className="w-3 h-3" />
                Resend in {resendCooldown}s
              </span>
            )}
          </div>

        </div>

        {/* Expiry note */}
        <p className="text-center text-[10px] text-[#847468] font-medium">
          OTP is valid for 5 minutes · One-time use only
        </p>

      </div>
    </div>
  );
};

export default OTPVerification;
