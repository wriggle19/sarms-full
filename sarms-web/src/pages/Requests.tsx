import { FormEvent, useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { api } from '../lib/api';

const REQUEST_TYPES = [
  { value: 'TEMPORARY_LOAN', label: 'Temporary Loan', desc: 'Short-term, up to 14 days' },
  { value: 'ACADEMIC_YEAR_ASSIGNMENT', label: 'Academic Year', desc: 'Reserved for the full school year' },
  { value: 'REPAIR', label: 'Repair / Swap', desc: 'Faulty or damaged equipment' },
  { value: 'NEW_EQUIPMENT', label: 'New Equipment', desc: 'First-time request' },
  { value: 'CLASSROOM_EQUIPMENT', label: 'Classroom Equipment', desc: 'Assigned to a room, not a person' },
  { value: 'OTHER', label: 'Other', desc: 'Anything else' },
];

const PRIORITIES = [
  { value: 'MEDIUM', label: 'Standard', desc: 'Regular curriculum plan' },
  { value: 'HIGH', label: 'High Priority', desc: 'Grant or exam module' },
  { value: 'URGENT', label: 'Urgent', desc: 'Imminent classroom blocker' },
];

export function Requests() {
  const [mine, setMine] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    departmentId: '', requestType: 'TEMPORARY_LOAN', priority: 'MEDIUM',
    quantity: 1, purpose: '', justification: '',
  });

  const load = () => api.get('/requests/mine').then((res) => setMine(res.data));

  useEffect(() => {
    load();
    api.get('/departments').then((res) => setDepartments(res.data));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/requests', {
        departmentId: Number(form.departmentId),
        requestType: form.requestType,
        priority: form.priority,
        quantity: form.quantity,
        purpose: form.purpose || undefined,
        justification: form.justification || undefined,
      });
      setForm({ departmentId: '', requestType: 'TEMPORARY_LOAN', priority: 'MEDIUM', quantity: 1, purpose: '', justification: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'h-11 rounded border border-border px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-tertiary';
  const labelClass = 'text-sm font-medium text-text-primary mb-1 block';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-1">New Equipment Request</h1>
        <p className="text-text-secondary text-sm mb-6">Request classroom devices, lab hardware, or swaps.</p>
        {error && <div className="mb-4 rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-border shadow-card p-6 flex flex-col gap-5">
          <div>
            <label className={labelClass}>1. Select Request Type</label>
            <div className="grid grid-cols-2 gap-2">
              {REQUEST_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setForm((f) => ({ ...f, requestType: t.value }))}
                  className={`text-left p-3 rounded border text-xs ${
                    form.requestType === t.value ? 'border-primary bg-soft-accent' : 'border-border hover:bg-canvas'
                  }`}
                >
                  <div className="font-medium text-text-primary">{t.label}</div>
                  <div className="text-text-secondary mt-0.5">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Department</label>
            <select required className={inputClass} value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
              <option value="">Select…</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <label className={labelClass}>Quantity Needed</label>
              <div className="flex items-center gap-2 h-11 rounded border border-border px-2">
                <button type="button" onClick={() => setForm((f) => ({ ...f, quantity: Math.max(1, f.quantity - 1) }))} className="text-text-secondary hover:text-text-primary">
                  <Minus size={16} />
                </button>
                <span className="flex-1 text-center text-sm font-medium">{form.quantity}</span>
                <button type="button" onClick={() => setForm((f) => ({ ...f, quantity: f.quantity + 1 }))} className="text-text-secondary hover:text-text-primary">
                  <Plus size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className={labelClass}>Purpose</label>
              <input className={inputClass} value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Instructional Urgency</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                  className={`text-left p-2.5 rounded border text-xs ${
                    form.priority === p.value ? 'border-primary bg-soft-accent' : 'border-border hover:bg-canvas'
                  }`}
                >
                  <div className="font-medium text-text-primary">{p.label}</div>
                  <div className="text-text-secondary mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Instructional Justification & Notes</label>
            <textarea className={inputClass + ' h-24'} value={form.justification} onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))} />
          </div>

          <button type="submit" disabled={submitting} className="h-11 rounded bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-60">
            {submitting ? 'Submitting…' : 'Submit Equipment Request'}
          </button>
        </form>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-1">My Requests</h1>
        <p className="text-text-secondary text-sm mb-6">{mine.length} submitted</p>
        <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
          {mine.length === 0 && <div className="px-5 py-4 text-sm text-text-secondary">No requests yet.</div>}
          {mine.map((r) => (
            <div key={r.id} className="px-5 py-3 text-sm flex items-center justify-between">
              <div>
                <div className="font-medium text-text-primary">{r.requestNumber}</div>
                <div className="text-text-secondary text-xs">{r.requestType.replace(/_/g, ' ')}</div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-soft-accent text-primary">
                {r.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
