import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { AgentNetworkHero } from '../../components/auth/AgentNetworkHero';

import connectPortalLogo from '../../assets/connect_portal_logo.png';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

type LoginFields = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register: formRegister, handleSubmit, formState: { errors }, setValue } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

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
      if (err.response?.data?.message) {
        setErrorMsg(err.response.data.message);
      } else {
        setErrorMsg('Something went wrong. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

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
                <Link to="/register" className="text-[#864f19] font-bold hover:underline">
                  Apply now
                </Link>
              </p>
            </div>
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
                  onClick={(e) => { e.preventDefault(); alert('Password reset instructions sent to your email.'); }}
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
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full py-3.5 mt-3 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider active:scale-[0.98] transition-all border-none shadow-md shadow-[#864f19]/20 cursor-pointer flex items-center justify-center gap-2"
            >
              Register Now
            </button>
          </div>

          {/* Sandbox Demo Accounts */}
          <div className="space-y-3">
            <p className="text-[9px] font-black text-[#847468] uppercase tracking-widest text-center">
              Sandbox Demo Accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'State Agent', email: 'state@forge.in' },
                { label: 'Division Agent', email: 'division@forge.in' },
                { label: 'District Agent', email: 'district@forge.in' },
                { label: 'Pincode Agent', email: 'pincode@forge.in' },
              ].map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => { setValue('email', acc.email); setValue('password', 'password123'); }}
                  className="px-3 py-2.5 bg-white border border-[#d7c3b5]/70 text-[#52443a] rounded-xl text-[10px] font-bold hover:bg-[#ffdcc2] hover:border-[#864f19] hover:text-[#864f19] transition-all cursor-pointer"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
