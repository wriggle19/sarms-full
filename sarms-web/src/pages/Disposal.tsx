import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

const METHODS = ['SOLD', 'DONATED', 'SCRAPPED', 'RECYCLED', 'OTHER'];

export function Disposal() {
  const [disposals, setDisposals] = useState<any[]>([]);
  const [retiredAssets, setRetiredAssets] = useState<any[]>([]);
  const [form, setForm] = useState({ assetId: '', reason: '', disposalMethod: 'SCRAPPED' });
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get('/disposals').then((res) => setDisposals(res.data));

  useEffect(() => {
    load();
    api.get('/assets', { params: { statusCode: 'RETIRED' } }).then((res) => setRetiredAssets(res.data.items));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/disposals', { assetId: Number(form.assetId), reason: form.reason, disposalMethod: form.disposalMethod });
      setForm({ assetId: '', reason: '', disposalMethod: 'SCRAPPED' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not record disposal.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-6">Dispose of an Asset</h1>
        <p className="text-sm text-text-secondary mb-4">Only assets already in Retired status can be disposed of.</p>
        {error && <div className="mb-4 rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}
        <form onSubmit={submit} className="bg-white rounded-lg border border-border shadow-card p-6 flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary mb-1 block">Retired Asset</label>
            <select required className="h-11 rounded border border-border px-3 text-sm w-full" value={form.assetId} onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))}>
              <option value="">Select…</option>
              {retiredAssets.map((a) => <option key={a.id} value={a.id}>{a.assetTag} — {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1 block">Disposal Method</label>
            <select className="h-11 rounded border border-border px-3 text-sm w-full" value={form.disposalMethod} onChange={(e) => setForm((f) => ({ ...f, disposalMethod: e.target.value }))}>
              {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1 block">Reason</label>
            <textarea required className="h-24 rounded border border-border px-3 text-sm w-full" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
          </div>
          <button type="submit" className="h-11 rounded bg-primary text-white font-medium hover:bg-primary-hover">Record Disposal</button>
        </form>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-6">Disposal History</h1>
        <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
          {disposals.length === 0 && <div className="px-5 py-4 text-sm text-text-secondary">No disposals recorded yet.</div>}
          {disposals.map((d) => (
            <div key={d.id} className="px-5 py-3 text-sm">
              <div className="font-medium text-text-primary">{d.asset?.assetTag} — {d.disposalMethod}</div>
              <div className="text-text-secondary text-xs">{d.reason}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
