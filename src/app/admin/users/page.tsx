'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Users, Mail, Shield, User, AlertCircle, Pencil, Trash2 } from 'lucide-react';
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
  created_at: string;
  clients?: Client[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const [usersRes, clientsData] = await Promise.all([
      supabase.from('profiles').select('*, profile_clients(clients(*))').order('created_at', { ascending: false }),
      clientService.getAll(),
    ]);
    
    const formattedUsers = (usersRes.data || []).map((u: any) => ({
      ...u,
      clients: u.profile_clients?.map((pc: any) => pc.clients).filter(Boolean) || [],
    }));
    
    setUsers(formattedUsers as UserRecord[]);
    setClients(clientsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeleteUser = async (id: string, fullName: string) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć użytkownika ${fullName}? To usunie wszystkie powiązane dane (zgłoszenia itp.).`)) return;
    
    setLoading(true);
    const { success, error } = await userService.deleteUser(id);
    if (!success) {
      alert(error || 'Błąd usuwania użytkownika.');
      setLoading(false);
    } else {
      await fetchData();
    }
  };

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
                    {user.clients && user.clients.length > 0 && (
                      <p className="text-sm text-slate-400 truncate mt-0.5">
                        🏢 {user.clients.map(c => c.name).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 ml-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="p-2 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                      aria-label="Edytuj użytkownika"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id, user.full_name)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Usuń użytkownika"
                    >
                      <Trash2 size={18} />
                    </button>
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

      {/* Modal edycji konta */}
      {editingUser && (
        <EditUserModal
          isOpen={!!editingUser}
          user={editingUser}
          onClose={() => setEditingUser(null)}
          clients={clients}
          onSuccess={() => {
            setEditingUser(null);
            fetchData();
          }}
        />
      )}
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
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('client_rep');
      setClientIds([]);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (role === 'client_rep' && clientIds.length === 0) {
      setError('Wybierz przynajmniej jeden obiekt dla zarządcy nieruchomości.');
      setLoading(false);
      return;
    }

    const payload: CreateUserPayload = {
      email: email.trim(),
      password,
      full_name: fullName.trim(),
      role,
      client_ids: clientIds,
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
    (role === 'admin' || clientIds.length > 0);

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
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-white">
              {clients.map(c => (
                <label key={c.id} className="flex items-center gap-3 cursor-pointer p-1">
                  <input
                    type="checkbox"
                    checked={clientIds.includes(c.id)}
                    onChange={e => {
                      if (e.target.checked) setClientIds([...clientIds, c.id]);
                      else setClientIds(clientIds.filter(id => id !== c.id));
                    }}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">{c.name}</span>
                </label>
              ))}
            </div>
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

// ============================================================
// Modal edycji konta użytkownika
// ============================================================
function EditUserModal({
  isOpen,
  onClose,
  user,
  clients,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: UserRecord;
  clients: Client[];
  onSuccess: () => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [clientIds, setClientIds] = useState<string[]>(user.clients?.map(c => c.id) || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFullName(user.full_name);
      setRole(user.role);
      setClientIds(user.clients?.map(c => c.id) || []);
      setError(null);
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (role === 'client_rep' && clientIds.length === 0) {
      setError('Wybierz przynajmniej jeden obiekt dla zarządcy nieruchomości.');
      setLoading(false);
      return;
    }

    const payload = {
      id: user.id,
      full_name: fullName.trim(),
      role,
      client_ids: role === 'admin' ? [] : clientIds,
    };

    const result = await userService.updateUser(payload);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
    }
  };

  const isValid = fullName.trim() && (role === 'admin' || clientIds.length > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edycja użytkownika" size="md">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Input
          id="edit-user-fullname"
          label="Imię i nazwisko"
          required
          placeholder="np. Jan Kowalski"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
        />

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
                  name="edit-role"
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

        {role === 'client_rep' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-user-client" className="text-sm font-medium text-slate-700">
              Obiekt <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-3 border border-slate-200 rounded-xl bg-white">
              {clients.map(c => (
                <label key={c.id} className="flex items-center gap-3 cursor-pointer p-1">
                  <input
                    type="checkbox"
                    checked={clientIds.includes(c.id)}
                    onChange={e => {
                      if (e.target.checked) setClientIds([...clientIds, c.id]);
                      else setClientIds(clientIds.filter(id => id !== c.id));
                    }}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500"
                  />
                  <span className="text-sm text-slate-700">{c.name}</span>
                </label>
              ))}
            </div>
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
            Zapisz zmiany
          </Button>
        </div>
      </form>
    </Modal>
  );
}
