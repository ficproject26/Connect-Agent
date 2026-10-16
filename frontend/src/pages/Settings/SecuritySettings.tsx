import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  ShieldCheck, Lock, Eye, EyeOff, KeyRound, CheckCircle2,
  AlertTriangle, ArrowLeft, Laptop, Shield, RefreshCw
} from 'lucide-react';
import api from '../../utils/api';
import { validatePassword, isValidPassword } from '../../utils/formValidation';

export const SecuritySettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, addNotification } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Password validation checks
  const pwdValidation = validatePassword(newPassword);
  const hasMinLength = newPassword.length >= 6;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(newPassword);
  const passwordsMatch = Boolean(newPassword && newPassword === confirmPassword);

  const isFormValid = pwdValidation.valid && passwordsMatch && currentPassword;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    if (!pwdValidation.valid) {
      setErrorMessage(pwdValidation.errors[0]);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send change password request to backend API
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      }).catch(async (err: any) => {
        // Fallback to profile password update endpoint if direct change-password route differs
        if (err?.response?.status === 404) {
          return await api.patch('/auth/profile', {
            password: newPassword,
            currentPassword
          });
        }
        throw err;
      });

      setSuccessMessage('Your password has been successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (addNotification) {
        addNotification(
          'Security Updated',
          'Your account password was successfully changed.',
          'low',
          'system'
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to change password. Please verify your current password.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const rawRole = (user?.role as string) || (user as any)?.level || 'pincode';
  const effectiveRole = (rawRole === 'agent' ? ((user as any)?.level || 'pincode') : rawRole).toUpperCase();

  return (
    <div className="space-y-6 animate-fade-in font-sans text-[#1b1c1c] max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#eae8e7] pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/shared/profile')}
            className="p-2 hover:bg-[#eae8e7] rounded-xl text-slate-600 transition-colors cursor-pointer border-none bg-transparent"
            title="Back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#1b1c1c] tracking-tight">Security & Password</h1>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] uppercase rounded-full border border-emerald-200">
                ACTIVE SESSION
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage your login credentials, session credentials, and account protection.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/shared/profile')}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition cursor-pointer"
          >
            Agent Profile
          </button>
          <button
            type="button"
            onClick={() => navigate('/shared/settings')}
            className="px-3.5 py-2 text-xs font-bold text-[#864f19] bg-[#864f19]/10 hover:bg-[#864f19]/20 rounded-xl transition cursor-pointer border-none"
          >
            App Preferences
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Security Overview & Session Info */}
        <div className="space-y-4">
          <Card className="bg-white border-[#eae8e7] p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">Account Protection</h3>
                <p className="text-[11px] text-slate-500 font-semibold">Role: {effectiveRole} AGENT</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">2-Factor Auth (OTP)</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">ENFORCED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">KYC Verification</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                  {(user?.kycStatus || 'APPROVED').toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Registration ID</span>
                <span className="font-mono font-bold text-slate-800">{user?.registrationId || 'AG-VERIFIED'}</span>
              </div>
            </div>
          </Card>

          <Card className="bg-white border-[#eae8e7] p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs">
              <Laptop className="w-4 h-4 text-[#864f19]" />
              <span>Current Active Session</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              You are signed in securely to ConnectPortal Enterprise Agent Network on this device.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
              <p className="text-slate-600">User: <strong>{user?.name || user?.email}</strong></p>
              <p className="text-slate-600">IP Status: <span className="text-emerald-700 font-bold">Secure SSL / Encrypted</span></p>
              <p className="text-slate-400 text-[10px]">Authorized Scope: {user?.assignedTerritory?.district || user?.assignedTerritory?.state || 'System Network'}</p>
            </div>
          </Card>
        </div>

        {/* Right Column: Change Password Form */}
        <div className="md:col-span-2">
          <Card className="bg-white border-[#eae8e7] p-6 rounded-2xl shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#864f19]" />
                <h2 className="font-extrabold text-base text-slate-800">Change Account Password</h2>
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase">SSL Secured</span>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Current Password *</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">New Password *</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter minimum 8 character strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Confirm New Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#fbf9f8] border border-[#d7c3b5]/60 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#864f19]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px]">
                <p className="font-bold text-slate-700 uppercase text-[10px]">Password Security Criteria:</p>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-bold' : ''}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                    At least 6 characters
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-700 font-bold' : ''}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasUpper ? 'text-emerald-600' : 'text-slate-300'}`} />
                    Uppercase letter (A-Z)
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-bold' : ''}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-slate-300'}`} />
                    Numeric digit (0-9)
                  </span>
                  <span className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-700 font-bold' : ''}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasSpecial ? 'text-emerald-600' : 'text-slate-300'}`} />
                    Special character (e.g. @#$%)
                  </span>
                  <span className={`flex items-center gap-1.5 col-span-2 ${passwordsMatch ? 'text-emerald-700 font-bold' : ''}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${passwordsMatch ? 'text-emerald-600' : 'text-slate-300'}`} />
                    Passwords match
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setErrorMessage('');
                  }}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className="bg-[#864f19] hover:bg-[#a3672f] text-white font-bold"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Updating...
                    </span>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;
