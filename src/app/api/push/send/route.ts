import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { PushNotificationPayload } from '@/types';

// Konfiguracja VAPID (wyłącznie server-side — private key nigdy nie idzie do klienta)
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_EMAIL) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

interface SendPushBody {
  type: 'new_ticket' | 'ticket_updated';
  // Dla new_ticket
  ticketId?: string;
  clientName?: string;
  area?: string;
  description?: string;
  // Dla ticket_updated
  userId?: string;
  newStatus?: string;
  adminNotes?: string;
}

/**
 * POST /api/push/send
 *
 * Wysyła powiadomienia Web Push.
 * - new_ticket: do wszystkich adminów
 * - ticket_updated: do autora zgłoszenia
 *
 * SECURITY: Wywołuje tylko zalogowany użytkownik (cookie sesji).
 * VAPID_PRIVATE_KEY jest WYŁĄCZNIE server-side.
 */
export async function POST(req: NextRequest) {
  try {
    // Weryfikacja sesji (musi być zalogowany użytkownik)
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 });
    }

    // Sprawdź czy klucze VAPID są skonfigurowane
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      return NextResponse.json(
        { warning: 'Web Push nie jest skonfigurowany (brak kluczy VAPID).' },
        { status: 200 }
      );
    }

    const body: SendPushBody = await req.json();
    const adminClient = createAdminSupabaseClient();

    let targetUserIds: string[] = [];
    let pushPayload: PushNotificationPayload;

    if (body.type === 'new_ticket') {
      // Pobierz wszystkich adminów
      const { data: adminProfiles } = await adminClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      targetUserIds = (adminProfiles || []).map((p: { id: string }) => p.id);

      pushPayload = {
        title: `🔔 Nowe zgłoszenie — ${body.clientName || 'Obiekt'}`,
        body: `${body.area}: ${(body.description || '').slice(0, 100)}`,
        tag: `ticket-${body.ticketId}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          url: `/admin?ticket=${body.ticketId}`,
          ticketId: body.ticketId,
        },
      };
    } else if (body.type === 'ticket_updated' && body.userId) {
      targetUserIds = [body.userId];

      const statusLabels: Record<string, string> = {
        in_progress: 'W trakcie realizacji',
        resolved: 'Rozwiązane ✅',
        pending: 'Oczekujące',
      };

      pushPayload = {
        title: `Zgłoszenie zaktualizowane`,
        body: `${body.area} → ${statusLabels[body.newStatus || ''] || body.newStatus}${
          body.adminNotes ? `\nNotatka: ${body.adminNotes.slice(0, 80)}` : ''
        }`,
        tag: `ticket-update-${body.ticketId}`,
        icon: '/icons/icon-192x192.png',
        data: {
          url: `/app`,
          ticketId: body.ticketId,
        },
      };
    } else {
      return NextResponse.json({ error: 'Nieprawidłowy typ powiadomienia.' }, { status: 400 });
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({ sent: 0, message: 'Brak odbiorców.' });
    }

    // Pobierz subskrypcje dla docelowych użytkowników
    const { data: subscriptions } = await adminClient
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, message: 'Brak subskrypcji push.' });
    }

    // Wyślij push do każdej subskrypcji
    const sendResults = await Promise.allSettled(
      subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string; id: string }) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(pushPayload),
            { TTL: 60 * 60 } // 1 godzina TTL
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (error: unknown) {
          // Usuń wygasłe/nieprawidłowe subskrypcje
          const err = error as { statusCode?: number };
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await adminClient
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
            console.log(`[Push] Usunięto wygasłą subskrypcję: ${sub.endpoint}`);
          }
          return { success: false, error: (error as Error).message };
        }
      })
    );

    const sent = sendResults.filter(
      r => r.status === 'fulfilled' && (r.value as { success: boolean }).success
    ).length;

    return NextResponse.json({
      sent,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error('[API] /api/push/send błąd:', error);
    return NextResponse.json(
      { error: 'Błąd wewnętrzny serwera.' },
      { status: 500 }
    );
  }
}
