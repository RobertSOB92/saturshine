import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';

export async function DELETE(req: NextRequest) {
  try {
    // 1. Weryfikacja admina
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Tylko administrator może usuwać konta.' },
        { status: 403 }
      );
    }

    // 2. Parsuj ID z query
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'Brak identyfikatora użytkownika do usunięcia.' },
        { status: 400 }
      );
    }
    
    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Nie możesz usunąć własnego konta.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminSupabaseClient();

    // 3. Usuń konto w auth.users (to usunie też kaskadowo profile, zgłoszenia itp.)
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Błąd podczas usuwania użytkownika: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] /api/auth/delete-user błąd:', error);
    return NextResponse.json(
      { error: 'Błąd wewnętrzny serwera.' },
      { status: 500 }
    );
  }
}
