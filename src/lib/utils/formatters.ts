import { TicketStatus } from '@/types';

/**
 * Formatuje datę do czytelnej formy polskiej
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Oblicza czas od zgłoszenia (np. "2 godz. temu", "3 dni temu")
 */
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 7) return formatDate(dateStr);
  if (diffDay >= 1) return `${diffDay} ${diffDay === 1 ? 'dzień' : 'dni'} temu`;
  if (diffHour >= 1) return `${diffHour} godz. temu`;
  if (diffMin >= 1) return `${diffMin} min. temu`;
  return 'Przed chwilą';
}

/**
 * Skraca tekst do zadanej długości
 */
export function truncate(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Generuje ścieżkę do pliku w Supabase Storage
 * Format: {clientId}/{ticketId}/{timestamp}-{randomSuffix}.jpg
 */
export function generateStoragePath(
  clientId: string,
  subfolder: string,
  filename: string
): string {
  const timestamp = Date.now();
  const safeName = filename.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
  return `${clientId}/${subfolder}/${timestamp}-${safeName}`;
}

/**
 * Zwraca CSS klasy dla StatusBadge
 */
export function getStatusClasses(status: TicketStatus): {
  badge: string;
  dot: string;
  label: string;
} {
  const map = {
    pending: {
      badge: 'bg-amber-100 text-amber-800 border border-amber-200',
      dot: 'bg-amber-400',
      label: 'Oczekujące',
    },
    in_progress: {
      badge: 'bg-sky-100 text-sky-800 border border-sky-200',
      dot: 'bg-sky-400',
      label: 'W trakcie',
    },
    resolved: {
      badge: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      dot: 'bg-emerald-400',
      label: 'Rozwiązane',
    },
  };
  return map[status];
}
