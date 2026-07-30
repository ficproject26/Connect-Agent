import React, { useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { KeyRound, ShieldAlert, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const OTPVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addNotification } = useAuth();
  
  const email = location.state?.email || 'user@example.com';
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Fields for Password Resetting
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
    useRef<HTMLInputElement | null>(null),
  ];

  const handleOtpChange = (value: string, idx: number) => {
    if (isNaN(Number(value))) return;
    const nextOtp = [...otp];
    nextOtp[idx] = value.substring(value.length - 1);
    setOtp(nextOtp);

    // Auto-focus next input
    if (value && idx < 3) {
      inputRefs[idx + 1].current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs[idx - 1].current?.focus();
    }
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const code = otp.join('');
    setTimeout(() => {
      setIsLoading(false);
      // Demo code: 1234
      if (code === '1234') {
        setIsVerified(true);
        addNotification('OTP Verified', 'Your code was verified. Please set a new password.', 'medium', 'system');
      } else {
        setErrorMsg('Invalid OTP. Please enter 1234 for simulation.');
      }
    }, 1200);
  };

  const handlePasswordResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      addNotification('Password Reset Successful', 'You can now login with your new credentials.', 'high', 'system');
      navigate('/login');
    }, 1500);
  };

  return (
    <div className="min-h-screen auth-bg flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md z-10 space-y-6">
        
        <Link to="/login" className="flex items-center text-xs font-bold text-forgeGray-300 hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Login
        </Link>

        <Card className="glass-card-auth text-white relative">
          {!isVerified ? (
            /* OTP Code Verification Form */
            <form onSubmit={handleOtpVerify} className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-black font-sans tracking-wide text-white">
                  Enter Verification Code
                </h2>
                <p className="text-xs font-semibold text-forgeGray-300 mt-1">
                  Verification OTP code sent to: <span className="text-white font-bold">{email}</span>
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/20 text-red-400 text-xs font-bold rounded-xl flex items-center space-x-2 border border-red-500/20">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex justify-center space-x-4">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    placeholder="-"
                    aria-label={`OTP Digit ${idx + 1}`}
                    title={`Digit ${idx + 1}`}
                    ref={(el) => { inputRefs[idx].current = el; }}
                    onChange={(e) => handleOtpChange(e.target.value, idx)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    className="w-12 h-14 text-center font-sans font-extrabold text-xl glass-input-auth rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                ))}
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full py-3.5 bg-primary hover:bg-primary-hover text-forgeGray-950 shadow-md"
              >
                Verify Code
              </Button>

              <div className="text-center text-xs font-bold">
                <span className="text-forgeGray-450">Didn't receive code?</span>{' '}
                <button
                  type="button"
                  onClick={() => addNotification('OTP Resent', 'Code was sent again to your inbox.', 'low', 'system')}
                  className="text-primary hover:underline"
                >
                  Resend OTP
                </button>
              </div>

              <p className="text-[10px] text-center text-forgeGray-400 font-semibold uppercase tracking-wider">
                Hint: Enter 1234 to verify
              </p>
            </form>
          ) : (
            /* Reset Password Form */
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl mb-3">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black font-sans tracking-wide text-white">
                  Reset Password
                </h2>
                <p className="text-xs font-semibold text-forgeGray-300 mt-1">
                  Create a new secure password for your account.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-950/20 text-red-400 text-xs font-bold rounded-xl flex items-center space-x-2 border border-red-500/20 animate-fade-in">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <Input
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                leftIcon={<KeyRound className="w-4 h-4 text-forgeGray-350" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="focus:outline-none cursor-pointer text-forgeGray-450 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                }
                className="glass-input-auth"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />

              <Input
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                leftIcon={<KeyRound className="w-4 h-4 text-forgeGray-350" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="focus:outline-none cursor-pointer text-forgeGray-450 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                }
                className="glass-input-auth"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                className="w-full py-3.5 mt-2 bg-primary hover:bg-primary-hover text-forgeGray-950 shadow-md"
              >
                Reset Password
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OTPVerification;
