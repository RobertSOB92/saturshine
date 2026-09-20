// ============================================================
// SaturShine — Definicje typów TypeScript
// ============================================================

export type UserRole = 'admin' | 'client_rep';

export type TicketStatus = 'pending' | 'in_progress' | 'resolved';

export interface Client {
  id: string;
  name: string;
  address: string;
  assigned_staff_name?: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  requires_password_change: boolean;
  created_at: string;
  // Relacje (opcjonalne, join)
  clients?: Client[];
}

export interface Ticket {
  id: string;
  client_id: string;
  user_id: string;
  area: string;
  description: string;
  photo_url?: string | null;
  resolution_photo_url?: string | null;
  admin_notes?: string | null;
  status: TicketStatus;
  created_at: string;
  resolved_at?: string | null;
  // Relacje (opcjonalne, join)
  client?: Client | null;
  profile?: Profile | null;
  // Signed URLs (generowane server-side, nie przechowywane w DB)
  photo_signed_url?: string | null;
  resolution_photo_signed_url?: string | null;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

// Payload dla tworzenia zgłoszenia
export interface CreateTicketPayload {
  client_id: string;
  area: string;
  description: string;
  photoFile?: File | null;
}

// Payload dla aktualizacji zgłoszenia (przez admina)
export interface UpdateTicketPayload {
  status?: TicketStatus;
  admin_notes?: string;
  resolutionPhotoFile?: File;
}

// Payload dla tworzenia klienta
export interface CreateClientPayload {
  name: string;
  address: string;
  assigned_staff_name?: string;
}

// Payload dla tworzenia użytkownika (przez admin API route)
export interface CreateUserPayload {
  email: string;
  password: string;
  full_name: string;
  client_ids: string[];
  role: UserRole;
}

// Odpowiedź API
export interface ApiResponse<T = void> {
  data?: T;
  error?: string;
}

// Payload Web Push
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  tag?: string;
}

// Dane Supabase Push Subscription (do API)
export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Strefa zgłoszenia
export const TICKET_AREAS = [
  'Garaż -1',
  'Garaż -2',
  'Klatka schodowa',
  'Recepcja / Hol',
  'Windy',
  'Toalety',
  'Biuro',
  'Sala konferencyjna',
  'Zewnętrzne tereny',
  'Inne',
] as const;

export type TicketArea = typeof TICKET_AREAS[number];

// Etykiety statusów
export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: 'Oczekujące',
  in_progress: 'W trakcie',
  resolved: 'Rozwiązane',
};

export const STATUS_COLORS: Record<TicketStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  in_progress: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-400' },
  resolved: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
};
