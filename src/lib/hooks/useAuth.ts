'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook zarządzający sesją użytkownika, odczytem profilu i role-based routing
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, client:clients(*)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Błąd pobierania profilu:', error);
      return null;
    }
    return data as Profile;
  }, [supabase]);

  const redirectByRole = useCallback((role: UserRole) => {
    if (role === 'admin') {
      router.replace('/admin');
    } else if (role === 'client_rep') {
      router.replace('/app');
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    // Pobierz bieżącą sesję przy montowaniu (z localStorage — persistSession)
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (isMounted) {
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            error: null,
          });
        }
      } else {
        if (isMounted) {
          setState(prev => ({ ...prev, loading: false }));
        }
      }
    };

    initAuth();

    // Nasłuchuj zmian sesji (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id);
          if (isMounted) {
            setState({
              user: session.user,
              profile,
              session,
              loading: false,
              error: null,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setState({
              user: null,
              profile: null,
              session: null,
              loading: false,
              error: null,
            });
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, supabase]);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Nieprawidłowy e-mail lub hasło.',
      }));
      return { success: false, error: error.message };
    }

    if (data.user) {
      const profile = await fetchProfile(data.user.id);
      setState({
        user: data.user,
        profile,
        session: data.session,
        loading: false,
        error: null,
      });

      if (profile?.role) {
        redirectByRole(profile.role);
      }
    }

    return { success: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return {
    ...state,
    signIn,
    signOut,
    redirectByRole,
  };
}
