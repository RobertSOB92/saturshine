import { PushNotificationPayload } from '@/types';

/**
 * Interfejs kanału powiadomień — Open/Closed Principle
 * Dodawanie nowego kanału (np. email) nie wymaga zmian w logice zgłoszeń
 */
export interface NotificationChannel {
  name: string;
  isEnabled(): boolean;
  send(payload: PushNotificationPayload, targetUserIds: string[]): Promise<void>;
}

// ============================================================
// KANAŁ 1: Web Push (server-side, VAPID)
// ============================================================
class WebPushChannel implements NotificationChannel {
  name = 'web-push';

  isEnabled(): boolean {
    // Włączony jeśli skonfigurowane klucze VAPID (sprawdzane server-side)
    return true;
  }

  async send(payload: PushNotificationPayload, targetUserIds: string[]): Promise<void> {
    // Wywołanie odbywa się server-side — ta metoda jest wywoływana z API routes
    // W kontekście klienta można tu zaimplementować wywołanie API route
    // Faktyczna wysyłka jest w /api/push/send
    console.log(`[WebPushChannel] Wysyłanie push do ${targetUserIds.length} użytkowników`);
  }
}

// ============================================================
// KANAŁ 2: Wewnętrzny (In-App) — badge/licznik
// ============================================================
class InAppChannel implements NotificationChannel {
  name = 'in-app';

  isEnabled(): boolean {
    return true; // Zawsze aktywny
  }

  async send(payload: PushNotificationPayload, targetUserIds: string[]): Promise<void> {
    // In-App powiadomienia są realizowane przez Supabase Realtime + licznik badge
    // w komponencie AdminHeader — nie wymaga dodatkowej akcji tutaj
    console.log(`[InAppChannel] Badge zaktualizowany — ${payload.title}`);
  }
}

// ============================================================
// GŁÓWNY NOTIFICATION SERVICE
// ============================================================
class NotificationServiceClass {
  private channels: NotificationChannel[];

  constructor() {
    this.channels = [
      new InAppChannel(),
      new WebPushChannel(),
      // Dodaj kolejne kanały tutaj (np. EmailChannel) bez zmian w logice biznesowej
    ];
  }

  /**
   * Notyfikuje administratorów o nowym zgłoszeniu
   * Wywoływane przez: ticketService.createTicket() → /api/push/send
   */
  async notifyAdmins(params: {
    ticketId: string;
    clientName: string;
    area: string;
    description: string;
    adminUserIds: string[];
  }): Promise<void> {
    const payload: PushNotificationPayload = {
      title: `🔔 Nowe zgłoszenie — ${params.clientName}`,
      body: `${params.area}: ${params.description.slice(0, 100)}`,
      tag: `ticket-${params.ticketId}`,
      data: {
        url: `/admin?ticket=${params.ticketId}`,
        ticketId: params.ticketId,
      },
    };

    await this.broadcast(payload, params.adminUserIds);
  }

  /**
   * Notyfikuje autora zgłoszenia o zmianie statusu
   * Wywoływane przez: ticketService.updateTicket() → /api/push/send
   */
  async notifyClient(params: {
    ticketId: string;
    userId: string;
    area: string;
    newStatus: string;
    adminNotes?: string;
  }): Promise<void> {
    const statusLabels: Record<string, string> = {
      in_progress: 'W trakcie realizacji',
      resolved: 'Rozwiązane ✅',
    };

    const payload: PushNotificationPayload = {
      title: `Zgłoszenie zaktualizowane`,
      body: `${params.area} → ${statusLabels[params.newStatus] || params.newStatus}${
        params.adminNotes ? `\n${params.adminNotes.slice(0, 80)}` : ''
      }`,
      tag: `ticket-update-${params.ticketId}`,
      data: {
        url: `/app`,
        ticketId: params.ticketId,
      },
    };

    await this.broadcast(payload, [params.userId]);
  }

  /**
   * Rozsyła powiadomienie przez wszystkie aktywne kanały
   */
  private async broadcast(payload: PushNotificationPayload, userIds: string[]): Promise<void> {
    const enabledChannels = this.channels.filter(ch => ch.isEnabled());

    await Promise.allSettled(
      enabledChannels.map(channel => channel.send(payload, userIds))
    );
  }
}

export const NotificationService = new NotificationServiceClass();
