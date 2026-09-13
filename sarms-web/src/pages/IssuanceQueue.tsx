import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function IssuanceQueue() {
  const [queue, setQueue] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [form, setForm] = useState({ assetId: '', conditionAtIssueCode: 'GOOD' });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get('/issuance/queue').then((res) => setQueue(res.data));

  useEffect(() => {
    load();
  }, []);

  const openFinalize = (request: any) => {
    setActiveRequest(request);
    setForm({ assetId: '', conditionAtIssueCode: 'GOOD' });
    setError(null);
    // Only assets in this request's category that are currently AVAILABLE make sense to offer.
    api
      .get('/assets', { params: { categoryId: request.categoryId, statusCode: 'AVAILABLE' } })
      .then((res) => setAssets(res.data.items));
  };

  const finalize = async () => {
    if (!activeRequest) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/issuance/requests/${activeRequest.id}/finalize`, {
        assetId: Number(form.assetId),
        conditionAtIssueCode: form.conditionAtIssueCode,
      });
      setActiveRequest(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not finalize issuance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text-primary">Issuance Queue</h1>

      <div className="flex flex-col gap-4">
        {queue.length === 0 && (
          <div className="bg-white rounded-lg border border-border shadow-card p-6 text-sm text-text-secondary">
            No approved requests waiting to be issued.
          </div>
        )}
        {queue.map((r) => (
          <div key={r.id} className="bg-white rounded-lg border border-border shadow-card p-5 flex items-center justify-between">
            <div>
              <div className="font-medium text-text-primary">{r.requestNumber} — {r.requestType?.replace(/_/g, ' ')}</div>
              <div className="text-sm text-text-secondary mt-1">
                {r.requester?.fullName} • {r.department?.name} • {r.category?.name ?? 'No category'}
              </div>
            </div>
            <button
              onClick={() => openFinalize(r)}
              className="px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover"
            >
              Issue
            </button>
          </div>
        ))}
      </div>

      {activeRequest && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-elevated w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              Issue for {activeRequest.requestNumber}
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              To {activeRequest.requester?.fullName}
            </p>

            {error && <div className="mb-4 rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

            <label className="text-sm font-medium text-text-primary mb-1 block">Select Asset</label>
            <select
              className="h-11 rounded border border-border px-3 text-sm w-full mb-4"
              value={form.assetId}
              onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))}
            >
              <option value="">Select an available asset…</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.assetTag} — {a.name}</option>
              ))}
            </select>

            <label className="text-sm font-medium text-text-primary mb-2 block">Condition at Issue</label>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, conditionAtIssueCode: c }))}
                  className={`text-xs font-medium py-2 rounded border ${
                    form.conditionAtIssueCode === c ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-canvas'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setActiveRequest(null)} className="px-4 py-2 rounded border border-border text-sm">
                Cancel
              </button>
              <button
                disabled={!form.assetId || submitting}
                onClick={finalize}
                className="px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-60"
              >
                {submitting ? 'Issuing…' : 'Confirm Issuance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
