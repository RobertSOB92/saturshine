'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Eye, EyeOff, Sparkles } from 'lucide-react';

export function LoginForm() {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // Domyślnie zaznaczony

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4 safe-top safe-bottom">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          {/* Logo SVG */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-900/40 mb-5">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Satur<span className="text-emerald-400">Shine</span>
          </h1>
          <p className="text-slate-400 mt-1.5 text-sm">
            System Zgłoszeń Serwisowych
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl">
          <h2 className="text-white font-bold text-xl mb-6">Zaloguj się</h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-slate-300">
                Adres e-mail
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="twoj@email.pl"
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/8 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              />
            </div>

            {/* Hasło */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-slate-300">
                Hasło
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Zapamiętaj mnie */}
            <label className="flex items-center gap-3 cursor-pointer group mt-1">
              <input
                type="checkbox"
                id="remember-me"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500/40 cursor-pointer"
              />
              <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                Zapamiętaj mnie
              </span>
            </label>

            {/* Błąd logowania */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                ⚠ {error}
              </div>
            )}

            {/* Przycisk */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-cta mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spinner" /> Logowanie...
                </span>
              ) : (
                'Zaloguj się'
              )}
            </button>
          </form>

          {/* Brak rejestracji publicznej */}
          <p className="text-center text-slate-600 text-xs mt-5">
            Konto tworzone przez administratora
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          © {new Date().getFullYear()} SaturShine. Wszelkie prawa zastrzeżone.
        </p>
      </div>
    </div>
  );
}
