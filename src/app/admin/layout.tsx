'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePushSubscription } from '@/lib/hooks/usePushSubscription';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const { isSupported, permission, subscribe } = usePushSubscription(user?.id ?? null);

  // Ochrona routy — tylko admin
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (profile && profile.role !== 'admin') {
        router.replace('/app');
      }
    }
  }, [user, profile, loading, router]);

  // Poproś admina o zgodę na push przy pierwszym wejściu
  useEffect(() => {
    if (isSupported && permission === 'default' && user) {
      const timer = setTimeout(() => {
        subscribe();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, user, subscribe]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
          <p className="text-slate-400 text-sm">Ładowanie panelu...</p>
        </div>
      </div>
    );
  }

  if (!user || (profile && profile.role !== 'admin')) {
    return null;
  }

  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
