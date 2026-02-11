// File: apps/transport/src/app/auth/login/LoginPageClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  Car,
  Eye,
  EyeOff,
  CheckCircle2,
  Star,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirebaseAuth, getGoogleProvider } from '@/lib/firebase/config';

function getFriendlyErrorMessage(error: any): string {
  const errorCode = error?.code || '';
  const errorMessage = error?.message || '';

  if (
    errorCode === 'auth/user-not-found' ||
    errorCode === 'auth/invalid-credential' ||
    errorMessage.includes('user-not-found')
  ) {
    return 'account-not-found';
  }

  if (errorCode === 'auth/wrong-password' || errorMessage.includes('wrong-password')) {
    return 'Incorrect email or password. Please try again.';
  }

  if (errorCode === 'auth/too-many-requests') {
    return 'Too many failed attempts. Please try again later.';
  }

  if (errorCode === 'auth/user-disabled') {
    return 'This account has been disabled. Please contact support.';
  }

  if (errorCode === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }

  return 'Login failed. Please check your credentials and try again.';
}

export default function LoginPageClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const auth = getFirebaseAuth();
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      router.push('/');
    } catch (err: any) {
      const friendlyError = getFriendlyErrorMessage(err);
      setError(friendlyError);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      const auth = getFirebaseAuth();
      const provider = getGoogleProvider() as GoogleAuthProvider;
      await signInWithPopup(auth, provider);
      router.push('/');
    } catch (err: any) {
      setError('Google sign-in failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center bg-white py-20 px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E6F1EC] rounded-full blur-[120px] translate-x-1/2 -translate-y-1/2 opacity-50"></div>
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#3FA58E]/5 rounded-full blur-[80px] -translate-x-1/4 translate-y-1/4"></div>

      <div className="max-w-md w-full space-y-10 relative z-10">
        <div className="text-center">
          <Link
            href="/"
            className="inline-block mb-10 transition-transform hover:scale-105 active:scale-95 group"
          >
            <div className="flex items-center justify-center gap-4">
              <div className="bg-[#2F5D50] p-4 rounded-3xl shadow-xl shadow-[#2F5D50]/20 group-hover:bg-[#3FA58E] transition-all duration-500">
                <Car className="h-8 w-8 text-white" />
              </div>
              <span className="text-4xl font-black tracking-tighter text-[#2F5D50]">
                KHAN<span className="text-gray-900 font-bold">HUB</span>
              </span>
            </div>
          </Link>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">
            Welcome Back
          </h1>
          <p className="text-[#3FA58E] font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-2">
            <Star className="w-3 h-3 fill-current" />
            Professional Healthcare Transit
          </p>
        </div>

        <div className="glass-panel p-12 rounded-[4rem] premium-shadow border-white/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#2F5D50] to-[#3FA58E]"></div>

          <div className="space-y-4 mb-10">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-4 bg-white border border-gray-50 text-gray-700 py-5 rounded-[2rem] font-black hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-70 shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.4em] font-black">
                <span className="px-6 bg-white/40 backdrop-blur-md rounded-full text-gray-400">
                  Secure Access
                </span>
              </div>
            </div>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-600 p-5 rounded-[2rem] text-sm font-black border border-red-100">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-red-600 animate-ping mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    {error === 'account-not-found' ? (
                      <div className="space-y-3">
                        <p>Account not found. Please sign up first.</p>
                        <Link
                          href="/auth/register"
                          className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full text-xs font-black hover:bg-red-700 transition-colors"
                        >
                          Create Account
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <p>{error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <FormInput
                label="Medical ID / Email"
                name="email"
                type="email"
                placeholder="Enter your registered email"
                icon={<Mail className="h-5 w-5" />}
                value={formData.email}
                onChange={(e: any) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1 ml-2">
                  <label
                    htmlFor="password"
                    className="text-[10px] font-black uppercase tracking-widest text-[#2F5D50]/60"
                  >
                    Secret Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-[10px] font-black text-[#3FA58E] hover:text-[#2F5D50] transition-colors"
                  >
                    RECOVER
                  </Link>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none group-focus-within:text-[#2F5D50]">
                    <Lock className="h-5 w-5 text-gray-300 group-focus-within:text-[#2F5D50] transition-colors" />
                  </div>
                  <input
                    required
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="block w-full pl-16 pr-16 py-5 border border-gray-50 rounded-[2rem] leading-5 bg-gray-50/30 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#2F5D50]/5 focus:border-[#2F5D50] focus:bg-white transition-all font-bold text-[#2F5D50]"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-6 flex items-center text-gray-300 hover:text-[#2F5D50] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-6 px-4 border border-transparent text-xl font-black rounded-[2rem] text-white bg-[#2F5D50] hover:bg-[#3FA58E] focus:outline-none focus:ring-4 focus:ring-[#2F5D50]/20 transition-all active:scale-[0.98] disabled:opacity-70 shadow-2xl shadow-[#2F5D50]/30"
            >
              {isLoading ? (
                <Loader2 className="animate-spin h-7 w-7" />
              ) : (
                <div className="flex items-center gap-3">
                  Access Portal
                  <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-400 font-bold">
              New Partner?{' '}
              <Link
                href="/auth/register"
                className="text-[#3FA58E] hover:text-[#2F5D50] underline underline-offset-8 decoration-[#3FA58E]/30 transition-all font-black"
              >
                Join Network
              </Link>
            </p>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-[10px] text-gray-300 uppercase tracking-[0.5em] font-black">
            <CheckCircle2 className="h-4 w-4 text-[#3FA58E]" />
            <span>Khanhub Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormInput({
  label,
  name,
  type = 'text',
  placeholder,
  icon,
  value,
  onChange,
}: any) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="text-[10px] font-black uppercase tracking-widest text-[#2F5D50]/60 ml-2"
      >
        {label}
      </label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none group-focus-within:text-[#2F5D50]">
          <div className="text-gray-300 group-focus-within:text-[#2F5D50] transition-colors">
            {icon}
          </div>
        </div>
        <input
          required
          id={name}
          name={name}
          type={type}
          className="block w-full pl-16 pr-6 py-5 border border-gray-50 rounded-[2rem] leading-5 bg-gray-50/30 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#2F5D50]/5 focus:border-[#2F5D50] focus:bg-white transition-all font-bold text-[#2F5D50]"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          aria-label={label}
        />
      </div>
    </div>
  );
}
