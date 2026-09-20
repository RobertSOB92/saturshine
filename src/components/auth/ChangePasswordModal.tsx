import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AlertCircle, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function ChangePasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const supabase = createClient();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError('Hasło musi mieć co najmniej 8 znaków.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Podane hasła nie są identyczne.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      setError(`Błąd zmiany hasła: ${updateError.message}`);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Zmień hasło" size="sm">
      <div className="p-5">
        {success ? (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-slate-800 font-medium">Hasło zostało pomyślnie zmienione.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="new-password"
              label="Nowe hasło"
              type="password"
              required
              placeholder="Min. 8 znaków"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
            />
            
            <Input
              id="confirm-password"
              label="Powtórz nowe hasło"
              type="password"
              required
              placeholder="Min. 8 znaków"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="secondary" size="md" onClick={onClose} type="button" fullWidth>
                Anuluj
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                loading={loading}
                disabled={!newPassword || !confirmPassword}
                fullWidth
              >
                Zmień hasło
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
