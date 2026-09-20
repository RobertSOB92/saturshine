'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Sparkles, Shield, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ChangePasswordPage() {
  const { user, profile, loading, redirectByRole } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Zabezpieczenie: jeśli nie ma usera, do logowania
    // Jeśli user jest, ale nie wymaga zmiany hasła, przekieruj do jego appki
    if (!loading) {
      if (!user || !profile) {
        router.replace('/login');
      } else if (!profile.requires_password_change) {
        redirectByRole(profile);
      }
    }
  }, [user, profile, loading, router, redirectByRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (newPassword.length < 8) {
      setError('Hasło musi mieć co najmniej 8 znaków.');
      setSubmitting(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Podane hasła nie są identyczne.');
      setSubmitting(false);
      return;
    }

    // 1. Zmiana hasła w Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      setError(`Błąd zmiany hasła: ${updateError.message}`);
      setSubmitting(false);
      return;
    }

    // 2. Usunięcie flagi wymuszenia zmiany
    try {
      const response = await fetch('/api/auth/complete-password-change', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Wystąpił problem po zmianie hasła.');
        setSubmitting(false);
        return;
      }

      // Odśwież widok profilu wymuszając przeładowanie i wejście do aplikacji
      window.location.href = profile?.role === 'admin' ? '/admin' : '/app';
    } catch (err) {
      setError('Wystąpił błąd komunikacji z serwerem.');
      setSubmitting(false);
    }
  };

  if (loading || !user || !profile?.requires_password_change) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="spinner border-emerald-500" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl shadow-emerald-900/40 mb-5">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Wymagana zmiana hasła
          </h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">
            Ze względów bezpieczeństwa, przed kontynuacją musisz ustawić własne, unikalne hasło.
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">
                Nowe hasło
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 znaków"
                className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all bg-white/5"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-300">
                Powtórz nowe hasło
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Powtórz hasło"
                className="w-full px-4 py-3 rounded-xl border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-all bg-white/5"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !newPassword || !confirmPassword}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-cta mt-4"
            >
              {submitting ? 'Zapisywanie...' : 'Zmień hasło i zaloguj się'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
