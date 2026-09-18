'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Building2, MapPin, User, Pencil, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { clientService } from '@/lib/services/clientService';
import { Client, CreateClientPayload } from '@/types';
import { formatDate } from '@/lib/utils/formatters';

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    const data = await clientService.getAll();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const openCreateModal = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
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
                <Building2 size={18} className="text-emerald-400" />
                <h1 className="font-bold text-white">Zarządzanie obiektami</h1>
              </div>
            </div>
            <Button
              variant="cta"
              size="sm"
              onClick={openCreateModal}
              id="add-client-btn"
            >
              <Plus size={16} />
              Nowy obiekt
            </Button>
          </div>
        </div>
      </header>

      {/* Lista klientów */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-slate-100" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={40} className="mx-auto text-slate-200 mb-4" />
            <h3 className="font-semibold text-slate-500 mb-1">Brak obiektów</h3>
            <p className="text-slate-400 text-sm mb-4">Dodaj pierwszy obiekt klienta.</p>
            <Button variant="cta" size="md" onClick={openCreateModal}>
              <Plus size={16} /> Dodaj obiekt
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {clients.map(client => (
              <Card key={client.id} padding="md" hover className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Building2 size={20} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{client.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                    <MapPin size={12} />
                    <span className="text-sm truncate">{client.address}</span>
                  </div>
                  {client.assigned_staff_name && (
                    <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                      <User size={12} />
                      <span className="text-sm">{client.assigned_staff_name}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openEditModal(client)}
                  className="p-2 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Edytuj"
                >
                  <Pencil size={16} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Modal tworzenia/edycji */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingClient={editingClient}
        onSuccess={fetchClients}
      />
    </div>
  );
}

// ============================================================
// Modal formularza klienta
// ============================================================
function ClientFormModal({
  isOpen,
  onClose,
  editingClient,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingClient: Client | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [staffName, setStaffName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingClient) {
      setName(editingClient.name);
      setAddress(editingClient.address);
      setStaffName(editingClient.assigned_staff_name ?? '');
    } else {
      setName('');
      setAddress('');
      setStaffName('');
    }
    setError(null);
  }, [editingClient, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: CreateClientPayload = {
      name: name.trim(),
      address: address.trim(),
      assigned_staff_name: staffName.trim() || undefined,
    };

    const result = editingClient
      ? await clientService.update(editingClient.id, payload)
      : await clientService.create(payload);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingClient ? 'Edytuj obiekt' : 'Nowy obiekt'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <Input
          id="client-name"
          label="Nazwa obiektu"
          required
          placeholder="np. Biurowiec Mokotów Plaza"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Input
          id="client-address"
          label="Adres"
          required
          placeholder="np. ul. Domaniewska 37, Warszawa"
          value={address}
          onChange={e => setAddress(e.target.value)}
        />
        <Input
          id="client-staff"
          label="Opiekun (opcjonalnie)"
          placeholder="np. Jan Kowalski"
          value={staffName}
          onChange={e => setStaffName(e.target.value)}
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            ⚠ {error}
          </p>
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
            disabled={!name.trim() || !address.trim()}
            fullWidth
          >
            {editingClient ? 'Zapisz' : 'Utwórz obiekt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
