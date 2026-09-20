'use client';

import { useState } from 'react';
import { Plus, LogOut, Sparkles, Bell, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTickets } from '@/lib/hooks/useTickets';
import { NewTicketModal } from '@/components/tickets/NewTicketModal';
import { TicketCard } from '@/components/tickets/TicketCard';
import { Button } from '@/components/ui/Button';
import { TicketStatus } from '@/types';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';

export default function ClientAppPage() {
  const { user, profile, signOut } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const { tickets: allTickets, loading, error, refetch } = useTickets({});

  const tickets = statusFilter === 'all'
    ? allTickets
    : allTickets.filter(t => t.status === statusFilter);

  const clientName = profile?.clients && profile.clients.length === 1 
    ? profile.clients[0].name 
    : profile?.clients && profile.clients.length > 1
      ? 'Wiele obiektów'
      : 'Brak przypisanych obiektów';
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Witaj';

  const statusTabs: Array<{ label: string; value: TicketStatus | 'all'; count?: number }> = [
    { label: 'Wszystkie', value: 'all', count: allTickets.length },
    {
      label: 'Oczekujące',
      value: 'pending',
      count: allTickets.filter(t => t.status === 'pending').length,
    },
    {
      label: 'W trakcie',
      value: 'in_progress',
      count: allTickets.filter(t => t.status === 'in_progress').length,
    },
    {
      label: 'Rozwiązane',
      value: 'resolved',
      count: allTickets.filter(t => t.status === 'resolved').length,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Nagłówek */}
      <header className="bg-slate-900 text-white safe-top">
        <div className="px-4 pt-4 pb-5">
          <div className="flex items-center justify-between mb-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="font-black text-lg text-white">
                Satur<span className="text-emerald-400">Shine</span>
              </span>
            </div>

            {/* Akcje */}
            <div className="flex items-center gap-2">
              <button
                onClick={refetch}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Odśwież"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Zmień hasło"
              >
                <KeyRound size={18} />
              </button>
              <button
                onClick={signOut}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Wyloguj"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Powitanie */}
          <div>
            <p className="text-slate-400 text-sm">Witaj, {firstName} 👋</p>
            <h1 className="text-xl font-bold text-white mt-0.5">{clientName}</h1>
          </div>
        </div>

        {/* Filtry statusów */}
        <div className="flex gap-1 px-4 pb-4 no-scrollbar overflow-x-auto">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                ${statusFilter === tab.value
                  ? 'bg-white text-slate-900'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`
                    min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs px-1
                    ${statusFilter === tab.value ? 'bg-slate-900 text-white' : 'bg-white/20'}
                  `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Zawartość */}
      <main className="flex-1 px-4 py-4 safe-bottom">
        {/* Główny CTA */}
        <Button
          variant="cta"
          size="lg"
          fullWidth
          onClick={() => setIsModalOpen(true)}
          className="mb-5 h-14 text-base"
          id="new-ticket-btn"
        >
          <Plus size={22} />
          Nowe zgłoszenie
        </Button>

        {/* Lista zgłoszeń */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-28 bg-white rounded-2xl animate-pulse border border-slate-100"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12 text-slate-400">
            <Bell size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">{error}</p>
            <Button variant="secondary" size="sm" onClick={refetch} className="mt-3">
              Spróbuj ponownie
            </Button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-emerald-400" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">
              {statusFilter === 'all' ? 'Brak zgłoszeń' : 'Brak zgłoszeń w tej kategorii'}
            </h3>
            <p className="text-slate-400 text-sm">
              {statusFilter === 'all'
                ? 'Naciśnij przycisk powyżej, aby zgłosić usterkę.'
                : 'Zmień filtr lub zgłoś nową usterkę.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map(ticket => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </main>

      {/* Modal nowego zgłoszenia */}
      {profile?.clients && profile.clients.length > 0 && (
        <NewTicketModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          clients={profile.clients}
          onSuccess={() => {
            setIsModalOpen(false);
            refetch();
          }}
        />
      )}

      {/* Modal zmiany hasła */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}
