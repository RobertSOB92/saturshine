'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Clock, MapPin, User, ImageOff, X, Upload, ChevronDown, Save, Camera, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Ticket, TicketStatus } from '@/types';
import { ticketService, createImagePreview } from '@/lib/services/ticketService';
import { formatDate } from '@/lib/utils/formatters';
import { STATUS_LABELS } from '@/types';

interface TicketDetailProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function TicketDetail({ ticket, isOpen, onClose, onUpdated }: TicketDetailProps) {
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [adminNotes, setAdminNotes] = useState(ticket.admin_notes ?? '');
  const [resolutionFile, setResolutionFile] = useState<File | null>(null);
  const [resolutionPreview, setResolutionPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [resolutionUrl, setResolutionUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Reset state when ticket changes
    setStatus(ticket.status);
    setAdminNotes(ticket.admin_notes ?? '');
    setResolutionFile(null);
    setResolutionPreview(null);
    setError(null);
    setSaved(false);

    // Pobierz signed URLs
    if (ticket.photo_url) {
      ticketService.getSignedUrl(ticket.photo_url).then(url => setPhotoUrl(url));
    }
    if (ticket.resolution_photo_url) {
      ticketService.getSignedUrl(ticket.resolution_photo_url).then(url => setResolutionUrl(url));
    }
  }, [ticket]);

  const handleResolutionPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = await createImagePreview(file);
    setResolutionPreview(preview);
    setResolutionFile(file);
  };

  const removeResolutionPhoto = () => {
    setResolutionFile(null);
    setResolutionPreview(null);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    const { error: updateError } = await ticketService.updateTicket(ticket.id, {
      status,
      admin_notes: adminNotes,
      resolutionPhotoFile: resolutionFile ?? undefined,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError);
    } else {
      setSaved(true);
      onUpdated();
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    }
  };

  const hasChanges =
    status !== ticket.status ||
    adminNotes !== (ticket.admin_notes ?? '') ||
    resolutionFile !== null;

  const statusOptions: Array<{ value: TicketStatus; label: string; color: string }> = [
    { value: 'pending', label: 'Oczekujące', color: 'text-amber-600' },
    { value: 'in_progress', label: 'W trakcie', color: 'text-sky-600' },
    { value: 'resolved', label: 'Rozwiązane', color: 'text-emerald-600' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Szczegóły zgłoszenia" size="lg">
      <div className="p-5 space-y-5">
        {/* Info nagłówkowe */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={14} className="text-emerald-500" />
              <h3 className="font-bold text-slate-900 text-lg">{ticket.area}</h3>
            </div>
            {ticket.client && (
              <p className="text-sm text-slate-500">{ticket.client.name}</p>
            )}
          </div>
          <StatusBadge status={ticket.status} />
        </div>

        {/* Metadane */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <User size={12} />
              <span className="text-xs font-medium">Zgłaszający</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {ticket.profile?.full_name ?? 'Nieznany'}
            </p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <Clock size={12} />
              <span className="text-xs font-medium">Data zgłoszenia</span>
            </div>
            <p className="text-sm font-semibold text-slate-800">
              {formatDate(ticket.created_at)}
            </p>
          </div>
        </div>

        {/* Opis */}
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Opis problemu</h4>
          <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 leading-relaxed">
            {ticket.description}
          </p>
        </div>

        {/* Zdjęcia */}
        <div className="grid grid-cols-2 gap-3">
          {/* Zdjęcie problemu */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Zdjęcie problemu
            </h4>
            <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden">
              {photoUrl ? (
                <Image
                  src={photoUrl}
                  alt="Zdjęcie problemu"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 300px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageOff size={24} className="text-slate-300" />
                </div>
              )}
            </div>
          </div>

          {/* Zdjęcie rozwiązania */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Po sprzątaniu
            </h4>
            {resolutionPreview || resolutionUrl ? (
              <div className="relative aspect-video bg-slate-100 rounded-xl overflow-hidden">
                <Image
                  src={resolutionPreview ?? resolutionUrl!}
                  alt="Zdjęcie po sprzątaniu"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 300px"
                />
                {resolutionPreview && (
                  <button
                    onClick={removeResolutionPhoto}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <label
                htmlFor={`resolution-photo-${ticket.id}`}
                className="block aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-300 hover:bg-slate-100 transition-all"
              >
                <Camera size={20} className="text-slate-400" />
                <span className="text-xs text-slate-400">Dodaj zdjęcie</span>
              </label>
            )}
            <input
              id={`resolution-photo-${ticket.id}`}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleResolutionPhoto}
              className="sr-only"
            />
            {!resolutionPreview && !resolutionUrl && (
              <label
                htmlFor={`resolution-photo-${ticket.id}`}
                className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-emerald-600 transition-colors"
              >
                <Upload size={12} />
                lub wybierz z pliku
              </label>
            )}
          </div>
        </div>

        {/* Zmiana statusu */}
        <div>
          <label
            htmlFor={`status-select-${ticket.id}`}
            className="text-sm font-semibold text-slate-700 mb-2 block"
          >
            Status zgłoszenia
          </label>
          <div className="relative">
            <select
              id={`status-select-${ticket.id}`}
              value={status}
              onChange={e => setStatus(e.target.value as TicketStatus)}
              className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium input-ring focus:outline-none"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Notatka wewnętrzna */}
        <Textarea
          id={`admin-notes-${ticket.id}`}
          label="Notatka (widoczna dla zarządcy)"
          placeholder="Opcjonalna notatka do przekazania zarządcy nieruchomości..."
          value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)}
          rows={3}
        />

        {/* Błąd */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Przyciski */}
        <div className="flex gap-3 pb-2">
          <Button variant="secondary" size="md" onClick={onClose} fullWidth>
            Anuluj
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            loading={loading}
            disabled={!hasChanges}
            fullWidth
          >
            {saved ? (
              <>✓ Zapisano</>
            ) : (
              <>
                <Save size={16} />
                Zapisz zmiany
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
