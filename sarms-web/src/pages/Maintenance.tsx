import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

export function Maintenance() {
  const [records, setRecords] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [form, setForm] = useState({ assetId: '', issueDescription: '' });
  const [completing, setCompleting] = useState<any | null>(null);
  const [conditionAfterCode, setConditionAfterCode] = useState('GOOD');
  const [repaired, setRepaired] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => api.get('/maintenance').then((res) => setRecords(res.data));

  useEffect(() => {
    load();
    api.get('/assets').then((res) => setAssets(res.data.items));
  }, []);

  const report = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/maintenance', { assetId: Number(form.assetId), issueDescription: form.issueDescription });
      setForm({ assetId: '', issueDescription: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not report issue.');
    }
  };

  const complete = async () => {
    if (!completing) return;
    setError(null);
    try {
      await api.post(`/maintenance/${completing.id}/complete`, { conditionAfterCode, repaired });
      setCompleting(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not complete record.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-6">Report an Issue</h1>
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
            <label className="text-sm font-medium text-text-primary mb-1 block">Issue Description</label>
            <textarea required className="h-24 rounded border border-border px-3 text-sm w-full" value={form.issueDescription} onChange={(e) => setForm((f) => ({ ...f, issueDescription: e.target.value }))} />
          </div>
          <button type="submit" className="h-11 rounded bg-primary text-white font-medium hover:bg-primary-hover">Report Issue</button>
        </form>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-6">Open Maintenance</h1>
        <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
          {records.length === 0 && <div className="px-5 py-4 text-sm text-text-secondary">Nothing under maintenance.</div>}
          {records.map((r) => (
            <div key={r.id} className="px-5 py-3 text-sm flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">{r.asset?.assetTag} — {r.asset?.name}</div>
                <div className="text-text-secondary text-xs">{r.issueDescription}</div>
              </div>
              <button onClick={() => setCompleting(r)} className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-canvas">
                Mark Complete
              </button>
            </div>
          ))}
        </div>
      </div>

      {completing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-elevated w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Complete Maintenance</h2>
            <label className="text-sm font-medium text-text-primary mb-1 block">Condition After Repair</label>
            <select className="h-11 rounded border border-border px-3 text-sm w-full mb-4" value={conditionAfterCode} onChange={(e) => setConditionAfterCode(e.target.value)}>
              {['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'BEYOND_REPAIR'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm mb-6">
              <input type="checkbox" checked={repaired} onChange={(e) => setRepaired(e.target.checked)} />
              Successfully repaired (unchecked sends it to Retired)
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCompleting(null)} className="px-4 py-2 rounded border border-border text-sm">Cancel</button>
              <button onClick={complete} className="px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
