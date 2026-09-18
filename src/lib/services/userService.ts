import { CreateUserPayload, ApiResponse, Profile } from '@/types';

/**
 * Serwis do zarządzania użytkownikami
 * Tworzenie kont odbywa się WYŁĄCZNIE przez chroniony API route (server-side)
 * nigdy bezpośrednio z klienta przez Supabase Admin API
 */
export const userService = {
  /**
   * Tworzy nowe konto użytkownika przez chroniony API route
   * Weryfikacja admina i tworzenie konta odbywa się server-side
   */
  async createUser(payload: CreateUserPayload): Promise<ApiResponse<Profile>> {
    try {
      const response = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include', // Wyślij cookies sesji dla weryfikacji roli
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Błąd tworzenia użytkownika.' };
      }

      return { data: data.profile as Profile };
    } catch (error) {
      return { error: `Błąd sieci: ${(error as Error).message}` };
    }
  },
};
