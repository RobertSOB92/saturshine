'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Ticket, TicketStatus, CreateTicketPayload, UpdateTicketPayload } from '@/types';

/**
 * Hook do zarządzania zgłoszeniami — pobieranie, tworzenie, aktualizacja
 * Obsługuje Supabase Realtime dla live updates w panelu admina
 */
export function useTickets(options?: {
  clientId?: string;
  statusFilter?: TicketStatus | 'all';
  enableRealtime?: boolean;
}) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('tickets')
      .select(`
        *,
        client:clients(id, name, address),
        profile:profiles(id, full_name, role)
      `)
      .order('created_at', { ascending: false });

    if (options?.clientId) {
      query = query.eq('client_id', options.clientId);
    }

    if (options?.statusFilter && options.statusFilter !== 'all') {
      query = query.eq('status', options.statusFilter);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError('Nie udało się pobrać zgłoszeń.');
      console.error('Błąd pobierania zgłoszeń:', fetchError);
    } else {
      setTickets(data as Ticket[] || []);
    }

    setLoading(false);
  }, [supabase, options?.clientId, options?.statusFilter]);

  useEffect(() => {
    fetchTickets();

    if (!options?.enableRealtime) return;

    // Supabase Realtime — live update panelu admina
    const channel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets, options?.enableRealtime, supabase]);

  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  return {
    tickets,
    loading,
    error,
    pendingCount,
    refetch: fetchTickets,
  };
}

/**
 * Hook do zarządzania pojedynczym zgłoszeniem
 */
export function useTicket(ticketId: string | null) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        client:clients(id, name, address),
        profile:profiles(id, full_name, role)
      `)
      .eq('id', ticketId)
      .single();

    if (!error && data) {
      // Pobierz signed URLs przez API route
      if (data.photo_url) {
        const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(data.photo_url)}`);
        const json = await res.json();
        data.photo_signed_url = json.url;
      }
      if (data.resolution_photo_url) {
        const res = await fetch(`/api/storage/signed-url?path=${encodeURIComponent(data.resolution_photo_url)}`);
        const json = await res.json();
        data.resolution_photo_signed_url = json.url;
      }
      setTicket(data as Ticket);
    }

    setLoading(false);
  }, [supabase, ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  return { ticket, loading, refetch: fetchTicket };
}
