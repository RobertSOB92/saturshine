'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Sparkles, LogOut, Bell, Filter, Users, Building2,
  Clock, MapPin, User, ChevronRight, ImageOff, RefreshCw, Settings, KeyRound
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { useTickets } from '@/lib/hooks/useTickets';
import { TicketDetail } from '@/components/tickets/TicketDetail';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Ticket, TicketStatus } from '@/types';
import { timeAgo, formatDate, truncate } from '@/lib/utils/formatters';
import { ticketService } from '@/lib/services/ticketService';
import { clientService } from '@/lib/services/clientService';
import { Client } from '@/types';

export default function AdminDashboardPage() {
  const { profile, signOut } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [clients, setClients] = useState<Client[]>([]);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const { tickets: allTickets, loading, pendingCount, refetch } = useTickets({
    enableRealtime: true,
  });

  useEffect(() => {
    clientService.getAll().then(setClients);
  }, []);

  // Filtrowanie po kliencie
  const filteredTicketsByClient = clientFilter === 'all'
    ? allTickets
    : allTickets.filter(t => t.client_id === clientFilter);

  // Filtrowanie po statusie
  const filteredTickets = statusFilter === 'all'
    ? filteredTicketsByClient
    : filteredTicketsByClient.filter(t => t.status === statusFilter);

  const statusTabs: Array<{ label: string; value: TicketStatus | 'all' }> = [
    { label: 'Wszystkie', value: 'all' },
    { label: 'Oczekujące', value: 'pending' },
    { label: 'W trakcie', value: 'in_progress' },
    { label: 'Rozwiązane', value: 'resolved' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nagłówek */}
      <header className="bg-slate-900 text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo + tytuł */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <h1 className="font-black text-lg text-white leading-none">
                  Satur<span className="text-emerald-400">Shine</span>
                </h1>
                <p className="text-slate-400 text-xs">Panel ITSM</p>
              </div>
            </div>

            {/* Badge + akcje */}
            <div className="flex items-center gap-2">
              {/* Licznik nowych zgłoszeń */}
              {pendingCount > 0 && (
                <div className="relative">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full">
                    <Bell size={14} className="text-amber-400 animate-pulse-badge" />
                    <span className="text-amber-300 text-xs font-bold">
                      {pendingCount} nowe
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={refetch}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Odśwież"
              >
                <RefreshCw size={18} />
              </button>

              {/* Nawigacja */}
              <Link
                href="/admin/clients"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Klienci"
              >
                <Building2 size={18} />
              </Link>

              <Link
                href="/admin/users"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Użytkownicy"
              >
                <Users size={18} />
              </Link>

              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-sm font-medium"
                aria-label="Zmień hasło"
              >
                <KeyRound size={16} />
                <span className="hidden sm:inline">Zmień hasło</span>
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
        </div>

        {/* Filtry */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
            {/* Filtr statusu */}
            <div className="flex gap-1 flex-shrink-0">
              {statusTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`
                    flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                    ${statusFilter === tab.value
                      ? 'bg-white text-slate-900'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }
                  `}
                >
                  {tab.label}
                  {tab.value === 'pending' && pendingCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Filtr klienta */}
            {clients.length > 0 && (
              <div className="relative flex-shrink-0">
                <select
                  value={clientFilter}
                  onChange={e => setClientFilter(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-1.5 rounded-full bg-white/10 text-slate-300 text-xs font-medium border border-white/20 focus:outline-none focus:bg-white/20"
                  style={{ minWidth: 120 }}
                >
                  <option value="all" style={{ background: '#1e293b' }}>Wszystkie obiekty</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#1e293b' }}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Główna zawartość */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Statystyki summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Oczekujące', value: filteredTicketsByClient.filter(t => t.status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
            { label: 'W trakcie', value: filteredTicketsByClient.filter(t => t.status === 'in_progress').length, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100' },
            { label: 'Rozwiązane', value: filteredTicketsByClient.filter(t => t.status === 'resolved').length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          ].map(stat => (
            <div key={stat.label} className={`rounded-2xl p-3 border ${stat.bg}`}>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tablica zgłoszeń */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles size={40} className="mx-auto text-slate-200 mb-4" />
            <h3 className="font-semibold text-slate-500 mb-1">Brak zgłoszeń</h3>
            <p className="text-slate-400 text-sm">Zmień filtry lub poczekaj na nowe zgłoszenia.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTickets.map(ticket => (
              <AdminTicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal szczegółów */}
      {selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          isOpen={!!selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onUpdated={() => {
            refetch();
            setSelectedTicket(null);
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

// ============================================================
// Karta zgłoszenia w panelu admina (Jira-style)
// ============================================================
function AdminTicketCard({
  ticket,
  onClick,
}: {
  ticket: Ticket;
  onClick: () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (ticket.photo_url) {
      ticketService.getSignedUrl(ticket.photo_url).then(setPhotoUrl);
    }
  }, [ticket.photo_url]);

  return (
    <Card
      padding="none"
      hover
      className="overflow-hidden cursor-pointer animate-fade-in"
      onClick={onClick}
    >
      {/* Zdjęcie problemu */}
      <div className="relative h-36 bg-slate-100">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={ticket.area}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff size={28} className="text-slate-300" />
          </div>
        )}
        {/* Status overlay */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={ticket.status} size="sm" />
        </div>
        {/* Pending highlight */}
        {ticket.status === 'pending' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-400" />
        )}
      </div>

      {/* Treść */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <MapPin size={12} className="text-emerald-500 flex-shrink-0" />
            <span className="font-bold text-slate-900 text-sm truncate">{ticket.area}</span>
          </div>
        </div>

        {ticket.client && (
          <p className="text-xs text-slate-400 mb-1.5 truncate">
            🏢 {ticket.client.name}
          </p>
        )}

        <p className="text-xs text-slate-600 line-clamp-2 mb-3">
          {ticket.description}
        </p>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1">
            <User size={11} />
            <span className="truncate max-w-[100px]">
              {ticket.profile?.full_name ?? '—'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock size={11} />
            <span>{timeAgo(ticket.created_at)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
