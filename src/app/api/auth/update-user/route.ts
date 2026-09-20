import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';

export async function PUT(req: NextRequest) {
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
        { error: 'Tylko administrator może edytować konta.' },
        { status: 403 }
      );
    }

    // 2. Parsuj payload
    const body = await req.json();
    const { id, full_name, role, client_ids } = body;

    if (!id || !full_name || !role) {
      return NextResponse.json(
        { error: 'Wymagane pola: id, full_name, role.' },
        { status: 400 }
      );
    }

    if (role === 'client_rep' && (!client_ids || client_ids.length === 0)) {
      return NextResponse.json(
        { error: 'Zarządca musi mieć przypisany co najmniej jeden obiekt.' },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminSupabaseClient();

    // 3. Aktualizuj tabelę profiles
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .update({ full_name, role })
      .eq('id', id)
      .select()
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: `Błąd aktualizacji profilu: ${profileError.message}` },
        { status: 500 }
      );
    }

    // 4. Zaktualizuj powiązania w profile_clients
    // Najpierw usuń obecne
    await adminSupabase
      .from('profile_clients')
      .delete()
      .eq('profile_id', id);

    // Następnie dodaj nowe, jeśli to zarządca
    if (role === 'client_rep' && client_ids.length > 0) {
      const { error: profileClientsError } = await adminSupabase
        .from('profile_clients')
        .insert(
          client_ids.map((clientId: string) => ({
            profile_id: id,
            client_id: clientId
          }))
        );

      if (profileClientsError) {
        console.error('Błąd aktualizacji powiązań budynków:', profileClientsError);
      }
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('[API] /api/auth/update-user błąd:', error);
    return NextResponse.json(
      { error: 'Błąd wewnętrzny serwera.' },
      { status: 500 }
    );
  }
}
