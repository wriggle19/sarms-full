import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (newPassword !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      await api.post('/auth/password-reset/confirm', { token, newPassword });
      setMessage('Password updated. You can now sign in with your new password.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas items-center justify-center px-4">
      <div className="w-full max-w-[420px] bg-white rounded-lg shadow-elevated border border-border p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-lg bg-soft-accent flex items-center justify-center text-primary">
            <Lock size={24} />
          </div>
          <h1 className="text-xl font-semibold text-text-primary mt-4">Set a new password</h1>
          <p className="text-sm text-text-secondary mt-1">Choose a new password for your SARMS account.</p>
        </div>

        {message && <div className="mb-4 rounded bg-soft-accent text-primary text-sm px-3 py-2">{message}</div>}
        {error && <div className="mb-4 rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}
        {!token && (
          <div className="mb-4 rounded bg-critical-surface text-critical text-sm px-3 py-2 flex gap-2">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            This reset link is missing its token. Use the link from your in-app notification.
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-4">
          <input
            type="password"
            required
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="h-12 w-full rounded border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
          />
          <input
            type="password"
            required
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-12 w-full rounded border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
          />
          <button
            type="submit"
            disabled={loading || !token}
            className="h-12 mt-2 rounded bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}