// apps/web/src/components/hq/superadmin/ResetPasswordModal.tsx
'use client';

import React, { useState } from 'react';
import { X, Key, Loader2, AlertCircle, Shield, Eye, EyeOff } from 'lucide-react';
import { resetPortalUserPassword } from '@/app/hq/actions/resetPortalUserPassword';

interface ResetPasswordModalProps {
  uid: string;
  portal: 'hq' | 'rehab' | 'spims';
  onClose: () => void;
  isPasswordSet?: boolean;
}

export function ResetPasswordModal({ uid, portal, onClose, isPasswordSet = true }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await resetPortalUserPassword(uid, portal, password);
      if (res.success) {
        setSuccess(true);
        setTimeout(onClose, 2000);
      } else {
        setError(res.error || `Failed to ${isPasswordSet ? 'reset' : 'set'} password`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      onMouseDown={onClose}
    >
      <div 
        className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl dark:bg-[#0A0A0A] dark:border dark:border-white/10 animate-in fade-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-8 py-6 dark:border-white/5">
          <h2 className="text-xl font-black text-gray-900 dark:text-white">
            {isPasswordSet ? 'Reset Password' : 'Set Password'}
          </h2>
          <button onClick={onClose} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {success ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center dark:bg-green-500/10">
                <Key className="text-green-600 dark:text-green-400" size={32} />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900 dark:text-white">
                  Password {isPasswordSet ? 'Reset' : 'Set'} Successfully!
                </p>
                <p className="text-sm text-gray-500">The user can now login with the new password.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                  New Secure Password
                </label>
                <div className="relative group">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-500 transition-colors" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 py-3 pl-12 pr-12 text-sm font-bold text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:focus:border-orange-500"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10">
                  <AlertCircle size={16} />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gray-900 text-xs font-black uppercase tracking-widest text-white hover:bg-black transition-colors shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 dark:bg-orange-600 dark:hover:bg-orange-700"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {isPasswordSet ? 'Reset User Password' : 'Set User Password'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
