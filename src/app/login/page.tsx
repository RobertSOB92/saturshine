import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';


export const metadata: Metadata = {
  title: 'Logowanie',
  description: 'Zaloguj się do systemu zgłoszeń SaturShine',
};

export default async function LoginPage() {
  // Jeśli już zalogowany — przekieruj na stronę główną
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/');
  }

  return <LoginForm />;
}
