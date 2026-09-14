import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Reservation {
  id: number;
  asset: { id: number; assetTag: string; name: string };
  requester: { id: number; fullName: string };
  startTime: string;
  endTime: string;
  purpose: string;
  status: string;
}

export function Reservations() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState<Reservation[]>([]);
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [assetId, setAssetId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');

  const load = () => {
    api
      .get(`/reservations${tab === 'mine' ? '/mine' : ''}`)
      .then((r) => setItems(r.data.items ?? r.data))
      .catch(() => setError('Failed to load reservations'));
  };
  useEffect(load, [tab]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      const { data } = await api.post('/reservations', {
        assetId: Number(assetId),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        purpose,
      });
      if (data.conflict) {
        setError(`That asset is already reserved ${data.conflict.startTime} → ${data.conflict.endTime}`);
      } else {
        setMsg('Reservation requested — pending approval.');
        setAssetId('');
        setStartTime('');
        setEndTime('');
        setPurpose('');
        load();
      }
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create reservation');
    }
  };
  const act = async (id: number, action: 'approve' | 'reject' | 'cancel' | 'complete') => {
    setMsg('');
    setError('');
    try {
      await api.post(`/reservations/${id}/${action}`);
      setMsg(`Reservation ${action}d.`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? `Failed to ${action} reservation`);
    }
  };

  const badge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-600',
      COMPLETED: 'bg-blue-100 text-blue-800',
    };
    return colors[status] ?? 'bg-canvas text-text-primary';
  };

  const canManage = hasPermission('assets.issue');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Reservations</h1>
          <p className="text-text-secondary text-sm mt-1">
            Reserve shared equipment (projectors, cameras, event kits) for a time slot.
          </p>
        </div>
        <div className="flex rounded border border-border overflow-hidden text-sm">
          {(['mine', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 ${tab === t ? 'bg-primary text-white' : 'bg-white text-text-secondary hover:bg-canvas'}`}
            >
              {t === 'mine' ? 'My reservations' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {msg && <div className="rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800">{msg}</div>}
      {error && <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}

      <form onSubmit={submit} className="bg-white rounded-lg border border-border shadow-card p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <label className="text-sm">
          <span className="text-text-secondary">Asset ID</span>
          <input
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            placeholder="e.g. 12"
            required
            className="mt-1 h-9 w-full rounded border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
          />
        </label>
        <label className="text-sm">
          <span className="text-text-secondary">Start</span>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="mt-1 h-9 w-full rounded border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
          />
        </label>
        <label className="text-sm">
          <span className="text-text-secondary">End</span>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="mt-1 h-9 w-full rounded border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
          />
        </label>
        <div className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="text-text-secondary">Purpose</span>
            <input
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
              className="mt-1 h-9 w-full rounded border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
            />
          </label>
          <button type="submit" className="h-9 rounded bg-primary text-white text-sm font-medium hover:opacity-90">
            Reserve
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
        {items.length === 0 && (
          <div className="px-5 py-4 text-sm text-text-secondary">No reservations yet.</div>
        )}
        {items.map((r) => (
          <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
            <div className="min-w-0">
              <div className="font-medium text-text-primary truncate">
                {r.asset.assetTag} — {r.asset.name}
              </div>
              <div className="text-text-secondary text-xs">
                {new Date(r.startTime).toLocaleString()} → {new Date(r.endTime).toLocaleString()} ·{' '}
                {r.requester.fullName}
                {r.purpose ? ` · ${r.purpose}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge(r.status)}`}>{r.status}</span>
              {canManage && r.status === 'PENDING' && (
                <>
                  <button onClick={() => act(r.id, 'approve')} className="text-green-700 hover:underline text-xs">
                    Approve
                  </button>
                  <button onClick={() => act(r.id, 'reject')} className="text-red-600 hover:underline text-xs">
                    Reject
                  </button>
                </>
              )}
              {r.status === 'APPROVED' && (
                <button onClick={() => act(r.id, 'complete')} className="text-blue-700 hover:underline text-xs">
                  Complete
                </button>
              )}
              {r.status === 'PENDING' && (
                <button onClick={() => act(r.id, 'cancel')} className="text-text-secondary hover:underline text-xs">
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

