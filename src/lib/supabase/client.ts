import { createBrowserClient } from '@supabase/ssr';

// Klient Supabase dla przeglądarki
// persistSession: true jest domyślne w @supabase/ssr (używa localStorage)
// anon key jest bezpieczny po stronie klienta — chroniony przez RLS
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  return createBrowserClient(url, key);
}
