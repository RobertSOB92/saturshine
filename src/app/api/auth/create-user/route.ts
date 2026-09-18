import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { CreateUserPayload } from '@/types';

/**
 * POST /api/auth/create-user
 *
 * Chroniony endpoint do tworzenia kont użytkowników.
 * - Weryfikuje że wywołujący ma rolę 'admin' (przez cookie sesji)
 * - Tworzy konto auth przez Supabase Admin API (service role key)
 * - Tworzy powiązany profil w tabeli profiles
 *
 * SECURITY: SUPABASE_SERVICE_ROLE_KEY nigdy nie opuszcza serwera
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Weryfikacja wywołującego (musi być adminem)
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
    }

    // Sprawdź rolę w tabeli profiles
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Tylko administrator może tworzyć konta użytkowników.' },
        { status: 403 }
      );
    }

    // 2. Parsuj payload
    const body: CreateUserPayload = await req.json();
    const { email, password, full_name, client_id, role } = body;

    if (!email || !password || !full_name || !client_id || !role) {
      return NextResponse.json(
        { error: 'Wymagane pola: email, password, full_name, client_id, role.' },
        { status: 400 }
      );
    }

    if (!['admin', 'client_rep'].includes(role)) {
      return NextResponse.json(
        { error: 'Nieprawidłowa rola. Dozwolone: admin, client_rep.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Hasło musi mieć minimum 8 znaków.' },
        { status: 400 }
      );
    }

    // 3. Utwórz konto auth przez Admin API (pomija limitacje rejestracji publicznej)
    const adminSupabase = createAdminSupabaseClient();

    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatycznie potwierdź email (brak publicznej rejestracji)
    });

    if (createError) {
      if (createError.message.includes('already registered') || createError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Użytkownik z tym adresem e-mail już istnieje.' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Błąd tworzenia konta: ${createError.message}` },
        { status: 500 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'Nie udało się utworzyć konta użytkownika.' },
        { status: 500 }
      );
    }

    // 4. Utwórz profil w tabeli profiles
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .insert({
        id: newUser.user.id,
        client_id: role === 'client_rep' ? client_id : null,
        full_name,
        role,
      })
      .select()
      .single();

    if (profileError) {
      // Rollback: usuń auth user jeśli tworzenie profilu się nie powiodło
      await adminSupabase.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: `Błąd tworzenia profilu: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error('[API] /api/auth/create-user błąd:', error);
    return NextResponse.json(
      { error: 'Błąd wewnętrzny serwera.' },
      { status: 500 }
    );
  }
}
