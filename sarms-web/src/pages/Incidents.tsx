import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

const TYPES = ['LOST', 'MISSING', 'STOLEN', 'DAMAGED'];

export function Incidents() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [form, setForm] = useState({ assetId: '', type: 'LOST', description: '' });
  const [resolving, setResolving] = useState<any | null>(null);
  const [resolution, setResolution] = useState('');
  const [recovered, setRecovered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get('/incidents').then((res) => setIncidents(res.data));

  useEffect(() => {
    load();
    api.get('/assets').then((res) => setAssets(res.data.items));
  }, []);

  const report = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/incidents', { assetId: Number(form.assetId), type: form.type, description: form.description || undefined });
      setForm({ assetId: '', type: 'LOST', description: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not report incident.');
    }
  };

  const resolve = async () => {
    if (!resolving) return;
    setError(null);
    try {
      await api.post(`/incidents/${resolving.id}/resolve`, { resolution, recovered });
      setResolving(null);
      setResolution('');
      setRecovered(false);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not resolve incident.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-6">Report an Incident</h1>
        {error && <div className="mb-4 rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}
        <form onSubmit={report} className="bg-white rounded-lg border border-border shadow-card p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary mb-1 block">Asset</label>
            <select required className="h-11 rounded border border-border px-3 text-sm w-full" value={form.assetId} onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))}>
              <option value="">Select…</option>
              {assets.map((a) => <option key={a.id} value={a.id}>{a.assetTag} — {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1 block">Incident Type</label>
            <select className="h-11 rounded border border-border px-3 text-sm w-full" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1 block">Description</label>
            <textarea className="h-24 rounded border border-border px-3 text-sm w-full" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <button type="submit" className="h-11 rounded bg-primary text-white font-medium hover:bg-primary-hover">Report Incident</button>
        </form>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-6">Open Incidents</h1>
        <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
          {incidents.length === 0 && <div className="px-5 py-4 text-sm text-text-secondary">No open incidents.</div>}
          {incidents.map((i) => (
            <div key={i.id} className="px-5 py-3 text-sm flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">{i.asset?.assetTag} — {i.type}</div>
                <div className="text-text-secondary text-xs">{i.description}</div>
              </div>
              <button onClick={() => setResolving(i)} className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-canvas">
                Resolve
              </button>
            </div>
          ))}
        </div>
      </div>

      {resolving && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-elevated w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Resolve Incident</h2>
            <label className="text-sm font-medium text-text-primary mb-1 block">Resolution</label>
            <textarea className="h-24 rounded border border-border px-3 text-sm w-full mb-4" value={resolution} onChange={(e) => setResolution(e.target.value)} />
            <label className="flex items-center gap-2 text-sm mb-6">
              <input type="checkbox" checked={recovered} onChange={(e) => setRecovered(e.target.checked)} />
              Asset was recovered in usable condition
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResolving(null)} className="px-4 py-2 rounded border border-border text-sm">Cancel</button>
              <button onClick={resolve} className="px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
