import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowLeft, Send } from 'lucide-react';

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotFields = z.infer<typeof forgotSchema>;

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotFields>({
    resolver: zodResolver(forgotSchema)
  });

  const onSubmit = async (data: ForgotFields) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/otp-verification', { state: { email: data.email } });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#fbf9f8] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-[#864f19]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[280px] h-[280px] bg-[#34647b]/08 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        <Link to="/login" className="flex items-center text-xs font-bold text-[#52443a] hover:text-[#864f19] transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Sign In
        </Link>

        <div className="bg-white rounded-[20px] border border-[#eae8e7] shadow-sm p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-[#ffdcc2] text-[#864f19] mx-auto mb-2">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-[#1b1c1c] tracking-tight">
              Reset Password
            </h2>
            <p className="text-xs font-medium text-[#52443a] max-w-xs mx-auto leading-relaxed">
              Enter your email and we'll send you a 4-digit OTP to reset your password.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-[#52443a] uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#847468]" />
                <input
                  type="email"
                  placeholder="email@example.com"
                  className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/70 rounded-xl py-3 pl-10 pr-4 text-sm text-[#1b1c1c] placeholder-[#847468] focus:outline-none focus:border-[#864f19] focus:ring-1 focus:ring-[#864f19] transition-all font-medium"
                  {...register('email')}
                />
              </div>
              {errors.email?.message && (
                <p className="text-[10px] text-[#ba1a1a] font-bold mt-1">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-2 bg-[#864f19] hover:bg-[#a3672f] text-white rounded-xl text-xs font-bold uppercase tracking-wider active:scale-[0.98] transition-all border-none shadow-md shadow-[#864f19]/20 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Send OTP Verification
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
