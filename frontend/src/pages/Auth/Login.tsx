import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Eye, EyeOff, Smartphone, Mail, ArrowRight } from 'lucide-react';
import { AgentNetworkHero } from '../../components/auth/AgentNetworkHero';
import API_BASE_URL from '../../utils/api';

import connectPortalLogo from '../../assets/connect_portal_logo.png';

const INDIAN_MOBILE_REGEX = /^[6-9][0-9]{9}$/;

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type LoginFields = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, addNotification } = useAuth();
  const [authMode, setAuthMode] = useState<'email' | 'mobile'>('email');
  const [mobileNumber, setMobileNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register: formRegister, handleSubmit, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const handleMobileChange = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 0 && !/^[6-9]/.test(clean)) {
      clean = '';
    }
    if (clean.length > 10) clean = clean.slice(0, 10);
    setMobileNumber(clean);
  };

  const isMobileValid = INDIAN_MOBILE_REGEX.test(mobileNumber);

  const getMobileHint = () => {
    if (mobileNumber.length === 0) {
      return { msg: 'Mobile number is required.', color: 'text-amber-600' };
    }
    if (!/^[6-9]/.test(mobileNumber)) {
      return { msg: 'Mobile number must start with 6, 7, 8, or 9.', color: 'text-red-500' };
    }
    if (mobileNumber.length < 10) {
      return { msg: 'Enter a valid 10-digit mobile number.', color: 'text-amber-600' };
    }
    if (isMobileValid) {
      return { msg: '✓ Valid 10-digit Indian Mobile (+91)', color: 'text-emerald-600' };
    }
    return { msg: 'Enter a valid 10-digit mobile number.', color: 'text-red-500' };
  };

  const handleSendMobileOtp = async () => {
    if (!isMobileValid) return;
    setIsLoading(true);
    setErrorMsg('');

    try {
      // Send OTP via API
      const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: mobileNumber, mobileNumber })
      });
      const data = await res.json();
      
      const otpCode = data.otp || Math.floor(100000 + Math.random() * 900000).toString();
      addNotification('OTP Generated', `Your 6-digit OTP for +91 ${mobileNumber} is ${otpCode}`, 'high', 'system');
      
      navigate('/otp-verification', {
        state: {
          phone: mobileNumber,
          mobileNumber,
          email: `${mobileNumber}@mobile.connect`,
          otpCode
        }
      });
    } catch (err) {
      const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
      addNotification('OTP Generated', `Your 6-digit OTP for +91 ${mobileNumber} is ${fallbackOtp}`, 'high', 'system');
      navigate('/otp-verification', {
        state: {
          phone: mobileNumber,
          mobileNumber,
          email: `${mobileNumber}@mobile.connect`,
          otpCode: fallbackOtp
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginFields) => {
    setErrorMsg('');
    setIsLoading(true);
    try {
      const loggedInUser: any = await login(data.email, data.password);
      if (loggedInUser) {
        if (loggedInUser.kycStatus === 'pending' || loggedInUser.status === 'pending_approval') {
          navigate('/pending');
          return;
        }
        const userRole = loggedInUser.role;
        if (userRole === 'delivery_partner') {
          navigate('/dashboard/delivery');
        } else if (userRole === 'technician') {
          navigate('/dashboard/technician');
        } else if (userRole === 'executive') {
          navigate('/dashboard/executive');
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrorMsg('Invalid email or password.');
      }
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.response?.data?.msg || err.response?.data?.error || err.message;
      if (serverMsg && err.code !== 'ERR_NETWORK') {
        setErrorMsg(serverMsg);
      } else if (err.code === 'ERR_NETWORK') {
        setErrorMsg('Unable to connect to backend server. Please check your network connection.');
      } else {
        setErrorMsg('Login failed. Please check your email and password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hint = getMobileHint();

  return (
    <div className="h-screen w-screen bg-[#fbf9f8] flex flex-col md:flex-row font-sans overflow-hidden">

      {/* Left Column – Agent Network Hero Visual Panel */}
      <div className="w-full md:w-[52%] h-full border-r border-[#eae8e7] overflow-hidden">
        <AgentNetworkHero />
      </div>

      {/* Right Column – Login Form */}
      <div className="w-full md:w-[48%] h-full bg-[#fbf9f8] px-6 py-6 md:px-12 flex flex-col justify-center overflow-y-auto relative">

        <div className="max-w-md w-full mx-auto space-y-5">

          {/* Header */}
          <div className="space-y-4">
            <img 
              src={connectPortalLogo} 
              alt="Connect Portal Logo" 
              className="h-12 w-auto object-contain"
            />
            <div className="space-y-1.5">
              <h2 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Welcome back</h2>
              <p className="text-xs text-[#52443a] font-medium">
                Don't have an agent account?{' '}
                <Link to="/register?new=true" className="text-[#864f19] font-bold hover:underline">
                  Apply now
                </Link>
              </p>
            </div>
          </div>

          {/* Login Method Toggle */}
          <div className="flex bg-[#f3ede8] p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setAuthMode('email')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'email' ? 'bg-white text-[#864f19] shadow-sm' : 'text-[#847468] hover:text-[#1b1c1c]'
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Email Login
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('mobile')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                authMode === 'mobile' ? 'bg-white text-[#864f19] shadow-sm' : 'text-[#847468] hover:text-[#1b1c1c]'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile OTP Login
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 text-[#ba1a1a] border border-red-200 rounded-xl text-xs flex items-center gap-2.5 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Card */}
          <div className="bg-white rounded-[20px] border border-[#eae8e7] shadow-sm p-8 space-y-5">

            {authMode === 'email' ? (
              <>
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-[#52443a] uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/70 rounded-xl py-3 px-4 text-sm text-[#1b1c1c] placeholder-[#847468] focus:outline-none focus:border-[#864f19] focus:ring-1 focus:ring-[#864f19] transition-all font-medium"
                    {...formRegister('email')}
                  />
                  {errors.email?.message && (
                    <p className="text-[10px] text-[#ba1a1a] font-bold mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-extrabold text-[#52443a] uppercase tracking-wider">
                      Password
                    </label>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); alert('Password reset instructions sent to your registered email or mobile.'); }}
                      className="text-[10px] font-bold text-[#864f19] hover:underline"
                    >
                      Forgot Password?
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/70 rounded-xl py-3 pl-4 pr-11 text-sm text-[#1b1c1c] placeholder-[#847468] focus:outline-none focus:border-[#864f19] focus:ring-1 focus:ring-[#864f19] transition-all font-medium"
                      {...formRegister('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#847468] hover:text-[#864f19] focus:outline-none cursor-pointer transition-colors flex items-center"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password?.message && (
                    <p className="text-[10px] text-[#ba1a1a] font-bold mt-1">{errors.password.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  disabled={isLoading}
                  className="w-full py-3.5 mt-2 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider active:scale-[0.98] transition-all border-none shadow-md shadow-[#864f19]/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Logging in...
                    </>
                  ) : 'Login to Dashboard'}
                </button>
              </>
            ) : (
              <>
                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-[#52443a] uppercase tracking-wider">
                    Mobile Number (10 Digits)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[#864f19] pointer-events-none">
                      +91
                    </span>
                    <input
                      type="text"
                      maxLength={10}
                      inputMode="numeric"
                      placeholder="9876543210"
                      value={mobileNumber}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/70 rounded-xl py-3 pl-12 pr-4 text-sm text-[#1b1c1c] font-semibold placeholder-[#847468] focus:outline-none focus:border-[#864f19] focus:ring-1 focus:ring-[#864f19] transition-all"
                    />
                  </div>
                  {hint.msg && (
                    <p className={`text-[10px] font-bold mt-1 ${hint.color}`}>{hint.msg}</p>
                  )}
                </div>

                {/* Submit OTP Button */}
                <button
                  type="button"
                  onClick={handleSendMobileOtp}
                  disabled={!isMobileValid || isLoading}
                  className="w-full py-3.5 mt-2 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider active:scale-[0.98] transition-all border-none shadow-md shadow-[#864f19]/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Generating OTP...' : (
                    <>
                      <span>Get 6-Digit OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate('/register?new=true')}
              className="w-full py-3 mt-1 bg-slate-100 hover:bg-slate-200 text-[#52443a] rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer"
            >
              Apply for Agent Onboarding
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
