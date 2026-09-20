import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // 1. Weryfikacja wywołującego (musi być adminem)
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
        { error: 'Tylko administrator może resetować hasła.' },
        { status: 403 }
      );
    }

    // 2. Parsuj payload
    const body = await req.json();
    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: 'Wymagane pola: userId, newPassword.' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Hasło musi mieć minimum 8 znaków.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminSupabaseClient();

    // 3. Zaktualizuj hasło w auth.users
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json(
        { error: `Błąd zmiany hasła w auth: ${updateError.message}` },
        { status: 500 }
      );
    }

    // 4. Zaktualizuj flagę requires_password_change w profilach
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({ requires_password_change: true })
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json(
        { error: `Hasło zostało zmienione, ale wystąpił błąd profilu: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[API] /api/auth/admin-reset-password błąd:', error);
    return NextResponse.json(
      { error: 'Błąd wewnętrzny serwera.' },
      { status: 500 }
    );
  }
}
