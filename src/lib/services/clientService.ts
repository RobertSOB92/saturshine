import { createClient } from '@/lib/supabase/client';
import { Client, CreateClientPayload } from '@/types';

const supabase = createClient();

/**
 * Serwis do zarządzania klientami (obiektami nieruchomości)
 */
export const clientService = {
  async getAll(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (error) {
      console.error('Błąd pobierania klientów:', error);
      return [];
    }
    return data as Client[];
  },

  async getById(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Client;
  },

  async create(payload: CreateClientPayload): Promise<{ data: Client | null; error: string | null }> {
    const { data, error } = await supabase
      .from('clients')
      .insert(payload)
      .select()
      .single();

    if (error) {
      return { data: null, error: `Błąd tworzenia klienta: ${error.message}` };
    }
    return { data: data as Client, error: null };
  },

  async update(id: string, payload: Partial<CreateClientPayload>): Promise<{ data: Client | null; error: string | null }> {
    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: `Błąd aktualizacji klienta: ${error.message}` };
    }
    return { data: data as Client, error: null };
  },

  async delete(id: string): Promise<{ success: boolean; error: string | null }> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: `Błąd usuwania klienta: ${error.message}` };
    }
    return { success: true, error: null };
  },
};
