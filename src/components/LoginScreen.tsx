import React, { useState } from 'react';
import { AuthUser, qcApi } from '../services/api';
import { Lock, User, AlertCircle, ArrowRight, UserPlus, LogIn } from 'lucide-react';

interface LoginScreenProps {
  onSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const user = await qcApi.login(username.trim(), password);
        onSuccess(user);
      } else {
        const user = await qcApi.register(username.trim(), password);
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || (mode === 'login' ? 'Failed to sign in. Please verify your credentials.' : 'Registration failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-beige-100 flex flex-col justify-center items-center p-4 selection:bg-brand-forest-500/20">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <img
            src="/thumbnail.png"
            alt="Olive & Cocoa Logo"
            className="w-16 h-16 rounded-2xl border border-brand-beige-300 shadow-sm object-cover bg-white mb-3"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">
            Daily QC Defect Log
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Woodshop Inspection Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-brand-beige-200 overflow-hidden">
          {/* Mode Switch Tabs */}
          <div className="flex border-b border-brand-beige-200 bg-brand-beige-50/70 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-3 px-4 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'border-brand-forest-600 text-brand-forest-700 bg-white font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-3 px-4 text-center transition-colors border-b-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'border-brand-forest-600 text-brand-forest-700 bg-white font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create User
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                {mode === 'login' ? 'Username' : 'Username / Your Name'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === 'login' ? 'Enter username' : 'e.g. Mike Price'}
                  autoComplete="username"
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-brand-beige-200 bg-brand-beige-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-forest-500 text-sm text-gray-900 placeholder:text-gray-400 transition-all"
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-brand-beige-200 bg-brand-beige-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-forest-500 text-sm text-gray-900 placeholder:text-gray-400 transition-all font-mono"
                />
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 bg-brand-forest-600 hover:bg-brand-forest-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                'Processing...'
              ) : mode === 'login' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-6 font-mono">
          Olive &amp; Cocoa &bull; Woodshop QC
        </p>
      </div>
    </div>
  );
};
