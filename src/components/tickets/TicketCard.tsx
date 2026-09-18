'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Clock, MapPin, ImageOff, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Ticket } from '@/types';
import { timeAgo } from '@/lib/utils/formatters';
import { ticketService } from '@/lib/services/ticketService';

interface TicketCardProps {
  ticket: Ticket;
  onClick?: (ticket: Ticket) => void;
}

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resolutionPhotoUrl, setResolutionPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (ticket.photo_url) {
      ticketService.getSignedUrl(ticket.photo_url).then(url => setPhotoUrl(url));
    }
    if (ticket.resolution_photo_url) {
      ticketService.getSignedUrl(ticket.resolution_photo_url).then(url => setResolutionPhotoUrl(url));
    }
  }, [ticket.photo_url, ticket.resolution_photo_url]);

  return (
    <Card
      padding="none"
      hover={!!onClick}
      className="overflow-hidden animate-fade-in"
      onClick={() => onClick?.(ticket)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(ticket) : undefined}
    >
      <div className="flex gap-0">
        {/* Miniatura zdjęcia problemu */}
        <div className="relative w-28 h-28 flex-shrink-0 bg-slate-100">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={`Zdjęcie: ${ticket.area}`}
              fill
              className="object-cover"
              sizes="112px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageOff size={24} className="text-slate-300" />
            </div>
          )}

          {/* Badge "Rozwiązane" z zdjęciem po sprzątaniu */}
          {ticket.status === 'resolved' && resolutionPhotoUrl && (
            <div className="absolute inset-0 bg-emerald-900/60 flex items-center justify-center">
              <CheckCircle2 className="text-emerald-300 w-8 h-8" />
            </div>
          )}
        </div>

        {/* Treść kafelka */}
        <div className="flex-1 p-3 min-w-0">
          {/* Header: strefa + status */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin size={12} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-slate-900 truncate">
                {ticket.area}
              </span>
            </div>
            <StatusBadge status={ticket.status} size="sm" />
          </div>

          {/* Opis */}
          <p className="text-xs text-slate-500 line-clamp-2 mb-2">
            {ticket.description}
          </p>

          {/* Footer: data */}
          <div className="flex items-center gap-1 text-slate-400">
            <Clock size={11} />
            <span className="text-xs">{timeAgo(ticket.created_at)}</span>
          </div>

          {/* Zdjęcie po sprzątaniu — podgląd jeśli resolved */}
          {ticket.status === 'resolved' && resolutionPhotoUrl && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border-2 border-emerald-400">
                <Image
                  src={resolutionPhotoUrl}
                  alt="Po sprzątaniu"
                  fill
                  className="object-cover"
                  sizes="32px"
                />
              </div>
              <span className="text-xs text-emerald-600 font-medium">
                ✓ Zdjęcie po sprzątaniu
              </span>
            </div>
          )}

          {/* Notatka admina jeśli jest */}
          {ticket.admin_notes && (
            <div className="mt-2 p-2 rounded-lg bg-sky-50 border border-sky-100">
              <p className="text-xs text-sky-700 line-clamp-2">
                📝 {ticket.admin_notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
