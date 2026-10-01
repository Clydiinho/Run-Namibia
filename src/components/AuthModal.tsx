import React, { useState } from 'react';
import { X, Lock, User, Phone, Eye, EyeOff, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { signUpPlayer, signInPlayer, isValidNickname, isValidPhone, PlayerProfile } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: 'signup' | 'login';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'signup',
}) => {
  const [mode, setMode] = useState<'signup' | 'login'>(initialMode);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ message: string; status?: number } | null>(null);

  if (!isOpen) return null;

  const handlePlayLocally = () => {
    const trimmedNick = nickname.trim() || 'Runner';
    const profile: PlayerProfile = {
      id: 'local-' + Date.now(),
      nickname: trimmedNick,
      phone: phone.trim() || undefined,
      best_score: 0,
    };
    localStorage.setItem('run_namibia_demo_player', JSON.stringify(profile));
    onSuccess();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);

    const trimmedNick = nickname.trim();

    if (!trimmedNick) {
      setErrorInfo({ message: mode === 'login' ? 'Wrong nickname or password.' : 'Please enter a nickname.' });
      return;
    }

    if (!password) {
      setErrorInfo({ message: mode === 'login' ? 'Wrong nickname or password.' : 'Please enter a password.' });
      return;
    }

    if (mode === 'signup') {
      if (!isValidNickname(trimmedNick)) {
        setErrorInfo({ message: 'Nickname must be 3–15 characters (letters, numbers and underscore only, no spaces).' });
        return;
      }

      if (password.length < 6) {
        setErrorInfo({ message: 'Password must be at least 6 characters.' });
        return;
      }

      const trimmedPhone = phone.trim();
      if (trimmedPhone && !isValidPhone(trimmedPhone)) {
        setErrorInfo({ message: 'Mobile number can only contain digits, spaces and an optional leading +.' });
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const res = await signUpPlayer(trimmedNick, password, phone.trim() || undefined);
        if (res.error) {
          setErrorInfo({
            message: res.error,
            status: res.status,
          });
          setLoading(false);
          return;
        }
      } else {
        const res = await signInPlayer(trimmedNick, password);
        if (res.error) {
          setErrorInfo({
            message: 'Wrong nickname or password.',
            status: res.status,
          });
          setLoading(false);
          return;
        }
      }

      setLoading(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Supabase auth catch error object:', err);
      console.error(err);

      if (mode === 'signup') {
        const isAlready = err?.message && err.message.toLowerCase().includes('already registered');
        if (isAlready) {
          setErrorInfo({ message: 'That nickname is taken, try another.', status: err?.status });
        } else {
          setErrorInfo({ message: err?.message || 'Signup failed', status: err?.status });
        }
      } else {
        setErrorInfo({ message: 'Wrong nickname or password.' });
      }
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-5 sm:p-7 flex flex-col relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Runner Profile</span>
        </div>

        <h3 className="text-2xl font-extrabold text-white mb-1 font-display">
          {mode === 'signup' ? 'Join Run Namibia' : 'Log In to Play'}
        </h3>
        <p className="text-xs text-neutral-400 mb-4">
          {mode === 'signup'
            ? 'Pick a nickname to record your best runs on the public leaderboard.'
            : 'Welcome back! Enter your nickname and password.'}
        </p>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-950 rounded-2xl border border-neutral-800 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorInfo(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorInfo(null);
            }}
            className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Log in
          </button>
        </div>

        {/* Minimal Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nickname Field */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Nickname <span className="text-neutral-500 font-normal">({mode === 'signup' ? '3–15 letters, numbers, _' : 'required'})</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                maxLength={15}
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  if (errorInfo) setErrorInfo(null);
                }}
                placeholder="e.g. Kalahari_Hero"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>
          </div>

          {/* Password Field with Show/Hide Toggle */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Password {mode === 'signup' && <span className="text-neutral-500 font-normal">(min. 6 characters)</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorInfo) setErrorInfo(null);
                }}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Required Password Reminder Notice */}
            <p className="text-[11px] text-amber-300/80 mt-1.5 leading-tight">
              Remember your password. There is no password reset, so write it down.
            </p>
          </div>

          {/* Mobile Number Field (Optional, Signup Only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1 leading-snug">
                Mobile number (optional, only so the organiser can contact the winner)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+264 81 123 4567"
                  className="w-full pl-9 pr-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Action Button: One single button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-98 text-white font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{mode === 'signup' ? 'Start playing' : 'Log in'}</span>
          </button>
        </form>

        {/* Real Error Message and Code under the form */}
        {errorInfo && (
          <div className="mt-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl p-3 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-rose-200 leading-snug break-words">
                {errorInfo.message}
              </p>
              {errorInfo.status !== undefined && (
                <p className="text-[11px] text-rose-400 font-mono mt-1">
                  Code / Status: {errorInfo.status}
                </p>
              )}
              {(errorInfo.status === 429 || errorInfo.message.toLowerCase().includes('rate limit')) && (
                <div className="mt-2.5 space-y-2">
                  <p className="text-[11px] text-amber-300 bg-amber-950/60 border border-amber-500/30 rounded-lg p-2 leading-relaxed">
                    <strong>Permanent Fix:</strong> In your Supabase dashboard, go to <strong>Authentication &rarr; Providers &rarr; Email</strong> and turn off <strong>&quot;Confirm email&quot;</strong> so players sign in instantly without sending emails.
                  </p>
                  <button
                    type="button"
                    onClick={handlePlayLocally}
                    className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow flex items-center justify-center gap-1.5"
                  >
                    <span>Play anyway as &ldquo;{nickname.trim() || 'Runner'}&rdquo; (Local Mode)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
