import { createClient } from '@/lib/supabase/client';
import { compressImage, createImagePreview } from '@/lib/utils/imageCompression';
import { generateStoragePath } from '@/lib/utils/formatters';
import { Ticket, CreateTicketPayload, UpdateTicketPayload } from '@/types';

const supabase = createClient();

/**
 * Serwis do zarządzania zgłoszeniami
 * Single Responsibility: CRUD na tickets + upload zdjęć + signed URLs
 */
export const ticketService = {
  /**
   * Tworzy nowe zgłoszenie:
   * 1. Kompresuje zdjęcie
   * 2. Uploaduje do Storage
   * 3. Wstawia rekord do tickets
   * 4. Wywołuje NotificationService (przez API route)
   */
  async createTicket(payload: CreateTicketPayload): Promise<{ data: Ticket | null; error: string | null }> {
    try {
      // 1. Kompresja zdjęcia
      const compressedFile = await compressImage(payload.photoFile);

      // 2. Upload do Supabase Storage
      const storagePath = generateStoragePath(
        payload.client_id,
        'tickets',
        compressedFile.name
      );

      const { error: uploadError } = await supabase.storage
        .from('ticket-photos')
        .upload(storagePath, compressedFile, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) {
        return { data: null, error: `Błąd przesyłania zdjęcia: ${uploadError.message}` };
      }

      // 3. Pobierz ID zalogowanego użytkownika
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: 'Brak autoryzacji.' };
      }

      // 4. Wstaw zgłoszenie do bazy
      const { data: ticket, error: insertError } = await supabase
        .from('tickets')
        .insert({
          client_id: payload.client_id,
          user_id: user.id,
          area: payload.area,
          description: payload.description,
          photo_url: storagePath,
          status: 'pending',
        })
        .select(`*, client:clients(id, name, address), profile:profiles(id, full_name)`)
        .single();

      if (insertError) {
        // Spróbuj usunąć uploadowane zdjęcie jeśli zapis do DB się nie powiódł
        await supabase.storage.from('ticket-photos').remove([storagePath]);
        return { data: null, error: `Błąd tworzenia zgłoszenia: ${insertError.message}` };
      }

      // 5. Wywołaj NotificationService server-side (wyślij push do adminów)
      try {
        await fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'new_ticket',
            ticketId: ticket.id,
            clientName: ticket.client?.name,
            area: ticket.area,
            description: ticket.description,
          }),
        });
      } catch (notifError) {
        // Błąd push nie blokuje tworzenia zgłoszenia
        console.warn('Nie udało się wysłać powiadomienia push:', notifError);
      }

      return { data: ticket as Ticket, error: null };
    } catch (error) {
      return { data: null, error: `Nieoczekiwany błąd: ${(error as Error).message}` };
    }
  },

  /**
   * Aktualizuje zgłoszenie (admin):
   * - Zmiana statusu
   * - Notatka wewnętrzna
   * - Opcjonalne zdjęcie rozwiązania
   */
  async updateTicket(
    ticketId: string,
    payload: UpdateTicketPayload
  ): Promise<{ data: Ticket | null; error: string | null }> {
    try {
      const updates: Record<string, unknown> = {};

      if (payload.status !== undefined) updates.status = payload.status;
      if (payload.admin_notes !== undefined) updates.admin_notes = payload.admin_notes;

      // Upload zdjęcia rozwiązania jeśli dostarczone
      if (payload.resolutionPhotoFile) {
        // Pobierz client_id dla tej sprawy
        const { data: existingTicket } = await supabase
          .from('tickets')
          .select('client_id')
          .eq('id', ticketId)
          .single();

        if (!existingTicket) {
          return { data: null, error: 'Nie znaleziono zgłoszenia.' };
        }

        const compressedFile = await compressImage(payload.resolutionPhotoFile);
        const storagePath = generateStoragePath(
          existingTicket.client_id,
          'resolutions',
          compressedFile.name
        );

        const { error: uploadError } = await supabase.storage
          .from('ticket-photos')
          .upload(storagePath, compressedFile, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (uploadError) {
          return { data: null, error: `Błąd przesyłania zdjęcia rozwiązania: ${uploadError.message}` };
        }

        updates.resolution_photo_url = storagePath;
      }

      const { data: ticket, error: updateError } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', ticketId)
        .select(`*, client:clients(id, name, address), profile:profiles(id, full_name)`)
        .single();

      if (updateError) {
        return { data: null, error: `Błąd aktualizacji zgłoszenia: ${updateError.message}` };
      }

      // Wyślij push do autora zgłoszenia jeśli status się zmienił
      if (payload.status) {
        try {
          await fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'ticket_updated',
              ticketId: ticket.id,
              userId: ticket.user_id,
              newStatus: payload.status,
              area: ticket.area,
              adminNotes: payload.admin_notes,
            }),
          });
        } catch (notifError) {
          console.warn('Nie udało się wysłać powiadomienia push:', notifError);
        }
      }

      return { data: ticket as Ticket, error: null };
    } catch (error) {
      return { data: null, error: `Nieoczekiwany błąd: ${(error as Error).message}` };
    }
  },

  /**
   * Pobiera signed URL dla zdjęcia z prywatnego Storage (ważny 1h)
   */
  async getSignedUrl(storagePath: string): Promise<string | null> {
    try {
      const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(storagePath)}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.url || null;
    } catch {
      return null;
    }
  },
};

export { createImagePreview };
