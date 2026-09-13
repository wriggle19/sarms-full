import { useEffect, useState } from 'react';
import { api } from '../lib/api';

function initials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function Approvals() {
  const [pending, setPending] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [comments, setComments] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get('/approvals/pending').then((res) => setPending(res.data));

  useEffect(() => {
    load();
  }, []);

  const decide = async (requestId: number, decision: 'APPROVED' | 'REJECTED') => {
    setBusyId(requestId);
    setError(null);
    try {
      await api.post(`/requests/${requestId}/decide`, { decision, comment: comments[requestId] || undefined });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not record decision.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Equipment Requests & Approvals</h1>
        <p className="text-text-secondary text-sm mt-1">{pending.length} awaiting your authorization</p>
      </div>

      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

      <div className="flex flex-col gap-4">
        {pending.length === 0 && (
          <div className="bg-white rounded-lg border border-border shadow-card p-6 text-sm text-text-secondary">
            Nothing waiting on your approval right now.
          </div>
        )}
        {pending.map((r) => (
          <div key={r.id} className="bg-white rounded-lg border border-border shadow-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3 min-w-0">
                <span className="w-9 h-9 rounded-full bg-soft-accent text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {initials(r.requester?.fullName)}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">
                    {r.requestNumber} — {r.requestType?.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm text-text-secondary mt-0.5">
                    {r.requester?.fullName} • {r.department?.name}
                  </div>
                  <div className="text-sm text-text-primary mt-2">{r.purpose || r.justification || 'No purpose given'}</div>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-soft-accent text-primary shrink-0">
                {r.priority}
              </span>
            </div>

            <input
              placeholder="Add approval stipulations or feedback…"
              className="h-10 w-full rounded border border-border px-3 text-sm mt-4 mb-3"
              value={comments[r.id] ?? ''}
              onChange={(e) => setComments((c) => ({ ...c, [r.id]: e.target.value }))}
            />

            <div className="flex justify-end gap-2">
              <button
                disabled={busyId === r.id}
                onClick={() => decide(r.id, 'REJECTED')}
                className="px-4 py-2 rounded border border-critical text-critical text-sm font-medium hover:bg-critical-surface disabled:opacity-60"
              >
                Reject
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => decide(r.id, 'APPROVED')}
                className="px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-60"
              >
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
