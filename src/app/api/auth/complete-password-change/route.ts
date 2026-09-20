import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // 1. Weryfikacja zalogowanego użytkownika
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
    }

    const adminSupabase = createAdminSupabaseClient();

    // 2. Zaktualizuj flagę requires_password_change w profilu
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({ requires_password_change: false })
      .eq('id', user.id);

    if (profileError) {
      return NextResponse.json(
        { error: `Błąd podczas aktualizacji profilu: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] /api/auth/complete-password-change błąd:', error);
    return NextResponse.json(
      { error: 'Błąd wewnętrzny serwera.' },
      { status: 500 }
    );
  }
}
