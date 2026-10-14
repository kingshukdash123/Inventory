import { useState } from 'react';
import { Pill, Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(cleanEmail, password);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 selection:bg-white selection:text-black">
      <div className="w-full max-w-sm animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 mb-3 shadow-md">
            <Pill className="h-6 w-6 text-zinc-100" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Inventory</h1>
          <p className="text-xs text-zinc-400 mt-1">Sign in with your Firebase credentials</p>
        </div>

        {/* Sign In Card */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4">Sign In</h2>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded-xl shadow transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
