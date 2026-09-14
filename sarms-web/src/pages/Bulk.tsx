import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { api } from '../lib/api';

const STATUS_CODES = ['AVAILABLE', 'RESERVED', 'ASSIGNED', 'MAINTENANCE', 'RETIRED'];

export function Bulk() {
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [statusCode, setStatusCode] = useState('MAINTENANCE');
  const [reason, setReason] = useState('');
  const [toCustodianId, setToCustodianId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get('/assets', { params: { pageSize: 100 } }).then((r) => setAssets(r.data.items ?? [])).catch(() => {});
    api.get('/users').then((r) => setUsers(r.data)).catch(() => {});
  }, []);

  const ids = Array.from(selected);
  const toggle = (id: number) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const doStatus = async () => {
    setError(null); setMsg(null); setResult(null);
    try {
      const r = await api.post('/bulk/statuses', { assetIds: ids, statusCode, reason: reason || undefined });
      setResult(r.data); setMsg('Status updated.');
    } catch (err: any) { setError(err.response?.data?.message ?? 'Bulk status failed.'); }
  };

  const doTransfer = async () => {
    setError(null); setMsg(null); setResult(null);
    if (!toCustodianId) return setError('Select a custodian to transfer to.');
    try {
      const r = await api.post('/bulk/transfers', { assetIds: ids, toCustodianId: Number(toCustodianId), reason: reason || 'Bulk reassignment' });
      setResult(r.data); setMsg('Assignment updated.');
    } catch (err: any) { setError(err.response?.data?.message ?? 'Bulk transfer failed.'); }
  };

  const doLabels = async () => {
    setError(null); setMsg(null);
    try {
      const r = await api.post('/bulk/labels', { assetIds: ids });
      setResult(r.data); setMsg(`Labels: ${r.data?.count ?? r.data?.length ?? 'generated'} for ${ids.length} asset(s).`);
    } catch (err: any) { setError(err.response?.data?.message ?? 'Label generation failed.'); }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2"><Layers size={22} /> Bulk Operations</h1>
        <p className="text-text-secondary text-sm mt-1">Select assets, then apply a status change, custodian reassignment, or label generation in one action.</p>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-card p-5 flex flex-col gap-3 max-w-3xl max-h-80 overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">{selected.size} selected</span>
          <button onClick={() => setSelected(new Set())} className="text-xs text-primary hover:underline">Clear</button>
        </div>
        {assets.map((a) => (
          <label key={a.id} className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} className="accent-primary" />
            <span className="font-mono text-xs text-text-secondary">{a.assetTag}</span>
            <span className="text-text-primary">{a.name}</span>
            <span className="ml-auto text-xs text-text-secondary">{a.status?.code}</span>
          </label>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-border shadow-card p-5 max-w-3xl flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-secondary uppercase">New status</label>
            <select value={statusCode} onChange={(e) => setStatusCode(e.target.value)} className="h-10 rounded border border-border px-3 text-sm bg-white">
              {STATUS_CODES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-secondary uppercase">Reassign custodian</label>
            <select value={toCustodianId} onChange={(e) => setToCustodianId(e.target.value)} className="h-10 rounded border border-border px-3 text-sm bg-white">
              <option value="">— unchanged —</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-secondary uppercase">Reason</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 rounded border border-border px-3 text-sm" placeholder="optional" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={doStatus} disabled={ids.length === 0} className="h-10 px-4 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50">Apply status</button>
          <button onClick={doTransfer} disabled={ids.length === 0} className="h-10 px-4 rounded border border-border text-sm font-medium hover:bg-canvas disabled:opacity-50">Transfer</button>
          <button onClick={doLabels} disabled={ids.length === 0} className="h-10 px-4 rounded border border-border text-sm font-medium hover:bg-canvas disabled:opacity-50">Generate QR labels</button>
        </div>
      </div>

      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2 max-w-3xl">{error}</div>}
      {msg && <div className="rounded bg-soft-accent text-primary text-sm px-3 py-2 max-w-3xl">{msg}</div>}
      {result && <pre className="text-xs bg-white border border-border rounded p-3 max-w-3xl overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}