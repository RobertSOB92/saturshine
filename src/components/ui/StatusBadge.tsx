import { TicketStatus } from '@/types';
import { getStatusClasses } from '@/lib/utils/formatters';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export function StatusBadge({ status, size = 'md', showDot = true }: StatusBadgeProps) {
  const classes = getStatusClasses(status);

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full font-medium
        ${classes.badge}
        ${sizes[size]}
      `}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full ${classes.dot} flex-shrink-0`} />
      )}
      {classes.label}
    </span>
  );
}
