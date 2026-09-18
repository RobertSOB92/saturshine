import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/storage/signed-url?path={storagePath}
 *
 * Generuje signed URL dla prywatnego pliku w Supabase Storage.
 * Ważność: 1 godzina (3600s).
 *
 * SECURITY: Tylko zalogowani użytkownicy mogą generować signed URLs.
 * RLS Storage zapewnia że można wygenerować URL tylko dla dostępnych plików.
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Weryfikacja sesji
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
    }

    // Pobierz ścieżkę pliku
    const path = req.nextUrl.searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Brak parametru path.' }, { status: 400 });
    }

    // Generuj signed URL (1 godzina)
    const { data, error } = await supabase.storage
      .from('ticket-photos')
      .createSignedUrl(path, 3600);

    if (error) {
      return NextResponse.json(
        { error: `Nie można wygenerować URL: ${error.message}` },
        { status: 403 }
      );
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    console.error('[API] /api/storage/signed-url błąd:', error);
    return NextResponse.json(
      { error: 'Błąd wewnętrzny serwera.' },
      { status: 500 }
    );
  }
}
