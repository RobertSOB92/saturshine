'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { usePushSubscription } from '@/lib/hooks/usePushSubscription';
import { useAuth } from '@/lib/hooks/useAuth';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { isSupported, permission, subscribe } = usePushSubscription(user?.id ?? null);

  // Ochrona routy — tylko client_rep
  useEffect(() => {
    if (!loading) {
      if (!user || !profile) {
        router.replace('/login');
      } else if (profile.requires_password_change) {
        router.replace('/change-password');
      } else if (profile.role !== 'client_rep') {
        router.replace('/admin');
      }
    }
  }, [user, profile, loading, router]);

  // Poproś o zgodę na push przy pierwszym wejściu
  useEffect(() => {
    if (isSupported && permission === 'default' && user) {
      // Opóźnij prośbę o 3s żeby nie wyskakiwała od razu
      const timer = setTimeout(() => {
        subscribe();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, user, subscribe]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p className="text-slate-400 text-sm">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!user || (profile && profile.role !== 'client_rep')) {
    return null;
  }

  return <>{children}</>;
}
