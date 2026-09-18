'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Users, Mail, Shield, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { userService } from '@/lib/services/userService';
import { clientService } from '@/lib/services/clientService';
import { Client, CreateUserPayload, UserRole } from '@/types';
import { createClient } from '@/lib/supabase/client';

interface UserRecord {
  id: string;
  full_name: string;
  role: UserRole;
  client_id: string | null;
  created_at: string;
  client?: Client | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const [usersRes, clientsData] = await Promise.all([
      supabase.from('profiles').select('*, client:clients(*)').order('created_at', { ascending: false }),
      clientService.getAll(),
    ]);
    setUsers((usersRes.data as UserRecord[]) ?? []);
    setClients(clientsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const roleLabel: Record<UserRole, string> = {
    admin: 'Administrator',
    client_rep: 'Zarządca',
  };

  const roleColor: Record<UserRole, string> = {
    admin: 'bg-slate-900 text-white',
    client_rep: 'bg-emerald-100 text-emerald-800',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nagłówek */}
      <header className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowLeft size={18} />
              </Link>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-400" />
                <h1 className="font-bold text-white">Zarządzanie użytkownikami</h1>
              </div>
            </div>
            <Button
              variant="cta"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              id="add-user-btn"
            >
              <Plus size={16} />
              Nowe konto
            </Button>
          </div>
        </div>
      </header>

      {/* Lista użytkowników */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-white rounded-2xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20">
            <Users size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 text-sm">Brak użytkowników.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {users.map(user => (
              <Card key={user.id} padding="md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 truncate">{user.full_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[user.role]}`}>
                        {roleLabel[user.role]}
                      </span>
                    </div>
                    {user.client && (
                      <p className="text-sm text-slate-400 truncate mt-0.5">
                        🏢 {user.client.name}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Modal tworzenia konta */}
      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clients={clients}
        onSuccess={fetchData}
      />
    </div>
  );
}

// ============================================================
// Modal tworzenia konta użytkownika
// ============================================================
function CreateUserModal({
  isOpen,
  onClose,
  clients,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('client_rep');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('client_rep');
      setClientId('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (role === 'client_rep' && !clientId) {
      setError('Wybierz obiekt dla zarządcy nieruchomości.');
      setLoading(false);
      return;
    }

    const payload: CreateUserPayload = {
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      role,
      client_id: clientId || 'no-client', // admin może nie mieć client_id
    };

    const result = await userService.createUser(payload);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  const isValid = email.trim() && password.length >= 8 && fullName.trim() &&
    (role === 'admin' || clientId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nowe konto użytkownika" size="md">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Ostrzeżenie bezpieczeństwa */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
          <Shield size={12} className="inline mr-1.5 text-emerald-500" />
          Konto tworzone przez bezpieczny serwer. Hasło przesyłane tylko raz.
        </div>

        <Input
          id="user-fullname"
          label="Imię i nazwisko"
          required
          placeholder="np. Jan Kowalski"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
        />

        <Input
          id="user-email"
          label="Adres e-mail"
          type="email"
          required
          placeholder="jan.kowalski@firma.pl"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <Input
          id="user-password"
          label="Hasło tymczasowe"
          type="password"
          required
          placeholder="Min. 8 znaków"
          value={password}
          onChange={e => setPassword(e.target.value)}
          hint="Użytkownik powinien zmienić hasło po pierwszym logowaniu."
        />

        {/* Rola */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Rola *</label>
          <div className="flex gap-3">
            {([
              { value: 'client_rep' as UserRole, label: 'Zarządca', desc: 'Może zgłaszać usterki' },
              { value: 'admin' as UserRole, label: 'Administrator', desc: 'Pełny dostęp' },
            ] as const).map(opt => (
              <label
                key={opt.value}
                className={`
                  flex-1 flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all
                  ${role === opt.value
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={role === opt.value}
                  onChange={() => setRole(opt.value)}
                  className="mt-0.5 text-emerald-500"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-400">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Przypisanie do klienta (tylko dla client_rep) */}
        {role === 'client_rep' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="user-client" className="text-sm font-medium text-slate-700">
              Obiekt <span className="text-red-500">*</span>
            </label>
            <select
              id="user-client"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm input-ring focus:outline-none"
              required
            >
              <option value="">Wybierz obiekt...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {clients.length === 0 && (
              <p className="text-xs text-amber-600">
                ⚠ Najpierw dodaj obiekt w zakładce "Obiekty".
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3 pb-2">
          <Button variant="secondary" size="md" onClick={onClose} type="button" fullWidth>
            Anuluj
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            loading={loading}
            disabled={!isValid}
            fullWidth
          >
            Utwórz konto
          </Button>
        </div>
      </form>
    </Modal>
  );
}
