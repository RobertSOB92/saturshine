import { CreateUserPayload, ApiResponse, Profile, UserRole } from '@/types';

export interface UpdateUserPayload {
  id: string;
  full_name: string;
  role: UserRole;
  client_ids: string[];
}

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

  /**
   * Aktualizuje profil użytkownika (wymaga roli admin)
   */
  async updateUser(payload: UpdateUserPayload): Promise<ApiResponse<Profile>> {
    try {
      const response = await fetch('/api/auth/update-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Błąd aktualizacji użytkownika.' };
      }

      return { data: data.profile as Profile };
    } catch (error) {
      return { error: `Błąd sieci: ${(error as Error).message}` };
    }
  },

  /**
   * Usuwa konto użytkownika (wymaga roli admin)
   */
  async deleteUser(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`/api/auth/delete-user?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Błąd usuwania użytkownika.' };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: `Błąd sieci: ${(error as Error).message}` };
    }
  },

  /**
   * Resetuje hasło użytkownika przez admina (wymaga roli admin)
   * Ustawia hasło i wymusza jego zmianę po pierwszym logowaniu
   */
  async adminResetPassword(userId: string, newPassword: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch('/api/auth/admin-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Błąd resetowania hasła.' };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: `Błąd sieci: ${(error as Error).message}` };
    }
  },
};
