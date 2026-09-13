import { FormEvent, useEffect, useState } from 'react';
import { ScanLine, CheckCircle2, MapPinOff, HelpCircle } from 'lucide-react';
import { api } from '../lib/api';

const RESULT_META: Record<string, { color: string; icon: any; label: string }> = {
  VERIFIED: { color: 'text-success bg-success-surface', icon: CheckCircle2, label: 'Verified' },
  MISSING: { color: 'text-critical bg-critical-surface', icon: HelpCircle, label: 'Missing' },
  WRONG_LOCATION: { color: 'text-warning bg-warning-surface', icon: MapPinOff, label: 'Wrong Location' },
  UNREGISTERED: { color: 'text-critical bg-critical-surface', icon: HelpCircle, label: 'Unregistered' },
  PENDING: { color: 'text-text-secondary bg-canvas', icon: HelpCircle, label: 'Pending' },
};

export function Stocktake() {
  const [stocktakes, setStocktakes] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get('/stocktakes').then((res) => setStocktakes(res.data));

  useEffect(() => {
    load();
  }, []);

  const openActive = (id: number) => api.get(`/stocktakes/${id}`).then((res) => setActive(res.data));

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/stocktakes', { name, scopeType: 'ALL' });
      setName('');
      load();
      setActive(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not start stocktake.');
    }
  };

  const scan = async (e: FormEvent) => {
    e.preventDefault();
    if (!active || !qrToken) return;
    setError(null);
    try {
      await api.post(`/stocktakes/${active.id}/scan`, { qrToken });
      setQrToken('');
      openActive(active.id);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'No asset found for that code.');
    }
  };

  const close = async () => {
    if (!active) return;
    await api.patch(`/stocktakes/${active.id}/close`);
    openActive(active.id);
    load();
  };

  if (active) {
    const counts = active.items.reduce((acc: Record<string, number>, i: any) => {
      acc[i.result] = (acc[i.result] ?? 0) + 1;
      return acc;
    }, {});
    const scanned = active.items.length - (counts.PENDING ?? 0);
    const pct = active.items.length ? Math.round((scanned / active.items.length) * 100) : 0;

    return (
      <div className="flex flex-col gap-5 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">{active.name}</h1>
            <div className="text-xs text-text-secondary">{active.status.replace(/_/g, ' ')}</div>
          </div>
          <button onClick={() => setActive(null)} className="text-sm text-secondary hover:underline">
            ← All stocktakes
          </button>
        </div>

        <div className="bg-white rounded-lg border border-border shadow-card p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-text-primary">{scanned} / {active.items.length} scanned</span>
            <span className="text-text-secondary">{pct}% Done</span>
          </div>
          <div className="h-2 bg-canvas rounded-full overflow-hidden mb-4">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="text-success font-semibold text-base">{counts.VERIFIED ?? 0}</div>
              Verified
            </div>
            <div>
              <div className="text-warning font-semibold text-base">{counts.WRONG_LOCATION ?? 0}</div>
              Wrong Loc.
            </div>
            <div>
              <div className="text-critical font-semibold text-base">{(counts.MISSING ?? 0) + (counts.UNREGISTERED ?? 0)}</div>
              Issues
            </div>
          </div>
        </div>

        {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

        {active.status === 'IN_PROGRESS' && (
          <form onSubmit={scan} className="bg-primary rounded-lg p-4 flex gap-3 items-center">
            <ScanLine size={20} className="text-white shrink-0" />
            <input
              autoFocus
              placeholder="Scan or type QR token…"
              className="h-11 rounded border-0 px-3 text-sm w-full"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
            />
            <button type="submit" className="px-4 h-11 rounded bg-white text-primary text-sm font-semibold shrink-0">
              Scan
            </button>
          </form>
        )}

        <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border max-h-[45vh] overflow-y-auto">
          {active.items.map((item: any) => {
            const meta = RESULT_META[item.result] ?? RESULT_META.PENDING;
            const Icon = meta.icon;
            return (
              <div key={item.id} className="px-4 py-2.5 text-sm flex items-center justify-between">
                <span>{item.asset?.assetTag} — {item.asset?.name}</span>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                  <Icon size={12} /> {meta.label}
                </span>
              </div>
            );
          })}
        </div>

        {active.status === 'IN_PROGRESS' && (
          <button onClick={close} className="h-11 rounded border border-critical text-critical text-sm font-medium hover:bg-critical-surface">
            Close Stocktake (unscanned items become Missing)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <h1 className="text-2xl font-semibold text-text-primary">Stocktake</h1>
      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}
      <form onSubmit={create} className="bg-white rounded-lg border border-border shadow-card p-6 flex gap-3">
        <input required placeholder="e.g. 2026 Annual Asset Verification" className="h-11 rounded border border-border px-3 text-sm w-full" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="px-4 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover shrink-0">Start</button>
      </form>

      <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
        {stocktakes.length === 0 && <div className="px-5 py-4 text-sm text-text-secondary">No stocktakes yet.</div>}
        {stocktakes.map((s) => (
          <button key={s.id} onClick={() => openActive(s.id)} className="w-full text-left px-5 py-3 text-sm hover:bg-canvas flex items-center justify-between">
            <span className="font-medium text-text-primary">{s.name}</span>
            <span className="text-xs text-text-secondary">{s.status}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
