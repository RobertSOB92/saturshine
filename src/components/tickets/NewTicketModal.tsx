'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Camera, X, MapPin, FileText, Send, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { ticketService, createImagePreview } from '@/lib/services/ticketService';
import { TICKET_AREAS } from '@/types';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

type Step = 1 | 2 | 3;

export function NewTicketModal({
  isOpen,
  onClose,
  clientId,
  onSuccess,
}: NewTicketModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [area, setArea] = useState<string>(TICKET_AREAS[0]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setStep(1);
    setPhotoFile(null);
    setPhotoPreview(null);
    setArea(TICKET_AREAS[0]);
    setDescription('');
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Podgląd miniatury
    const preview = await createImagePreview(file);
    setPhotoPreview(preview);
    setPhotoFile(file);
    setStep(2);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setStep(1);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!photoFile || !area || !description.trim()) {
      setError('Uzupełnij wszystkie pola przed wysłaniem.');
      return;
    }

    setLoading(true);
    setError(null);
    setStep(3);

    const { error: submitError } = await ticketService.createTicket({
      client_id: clientId,
      area,
      description: description.trim(),
      photoFile,
    });

    setLoading(false);

    if (submitError) {
      setError(submitError);
      setStep(2);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    }
  };

  const stepLabels = ['Zdjęcie', 'Szczegóły', 'Wysyłanie'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nowe zgłoszenie"
      size="md"
    >
      <div className="p-5 space-y-5 pb-8">
        {/* Progress steps */}
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => {
            const stepNum = (i + 1) as Step;
            const isActive = step === stepNum;
            const isDone = step > stepNum || success;

            return (
              <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${isDone
                        ? 'bg-emerald-500 text-white'
                        : isActive
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-400'
                      }
                    `}
                  >
                    {isDone ? '✓' : stepNum}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      isActive ? 'text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-all ${
                      step > stepNum ? 'bg-emerald-500' : 'bg-slate-100'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* === KROK 1: Zdjęcie === */}
        {step === 1 && (
          <div className="animate-fade-in space-y-4">
            <p className="text-sm text-slate-500">
              Zrób zdjęcie usterki lub wybierz z galerii.
            </p>

            {/* Pole aparatu */}
            <label
              htmlFor="ticket-photo-input"
              className="
                block w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200
                bg-slate-50 flex flex-col items-center justify-center gap-3
                cursor-pointer hover:bg-slate-100 hover:border-emerald-300 transition-all
                active:scale-98
              "
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center">
                <Camera className="w-8 h-8 text-slate-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-600 text-sm">Dotknij, aby zrobić zdjęcie</p>
                <p className="text-xs text-slate-400 mt-0.5">JPG, PNG, HEIC • Max 10MB</p>
              </div>
            </label>

            {/* Input dla aparatu — ukryty, dostęp przez label */}
            <input
              ref={fileInputRef}
              id="ticket-photo-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="sr-only"
            />
          </div>
        )}

        {/* === KROK 2: Strefa + Opis === */}
        {step === 2 && (
          <div className="animate-fade-in space-y-4">
            {/* Podgląd zdjęcia */}
            {photoPreview && (
              <div className="relative photo-preview-container bg-slate-100">
                <Image
                  src={photoPreview}
                  alt="Podgląd usterki"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 448px"
                />
                <button
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  aria-label="Usuń zdjęcie"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Wybór strefy */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ticket-area" className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-500" />
                Strefa / Lokalizacja <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="ticket-area"
                  value={area}
                  onChange={e => setArea(e.target.value as typeof TICKET_AREAS[number])}
                  className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm input-ring focus:outline-none"
                >
                  {TICKET_AREAS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Opis usterki */}
            <Textarea
              id="ticket-description"
              label="Opis usterki"
              required
              placeholder="Opisz krótko problem, np. 'Zabrudzona podłoga przy windzie, brud olejowy'"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Przyciski */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setStep(1)}
                fullWidth
              >
                ← Zdjęcie
              </Button>
              <Button
                variant="cta"
                size="md"
                onClick={handleSubmit}
                disabled={!description.trim()}
                fullWidth
              >
                <Send size={16} />
                Wyślij
              </Button>
            </div>
          </div>
        )}

        {/* === KROK 3: Wysyłanie / Sukces === */}
        {step === 3 && (
          <div className="animate-fade-in flex flex-col items-center py-8 gap-4">
            {success ? (
              <>
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-900">Zgłoszenie wysłane!</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Zespół SaturShine zostanie powiadomiony.
                  </p>
                </div>
              </>
            ) : loading ? (
              <>
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center">
                  <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-slate-900">Wysyłanie...</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Kompresowanie i wysyłanie zdjęcia
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-red-500" />
                <div className="text-center">
                  <p className="text-red-600 text-sm">{error}</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setStep(2)}
                    className="mt-3"
                  >
                    Wróć
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
