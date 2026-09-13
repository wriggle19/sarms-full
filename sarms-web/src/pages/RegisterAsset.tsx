import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop } from 'lucide-react';
import { api } from '../lib/api';

export function RegisterAsset() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '', categoryId: '', manufacturer: '', model: '', serialNumber: '',
    vendorId: '', invoiceNumber: '', originalCost: '',
    owningDepartmentId: '', responsibleDepartmentId: '', currentRoomId: '',
  });

  useEffect(() => {
    api.get('/asset-categories').then((res) => setCategories(res.data));
    api.get('/departments').then((res) => setDepartments(res.data));
    api.get('/rooms').then((res) => setRooms(res.data));
  }, []);

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post('/assets', {
        name: form.name,
        categoryId: Number(form.categoryId),
        manufacturer: form.manufacturer || undefined,
        model: form.model || undefined,
        serialNumber: form.serialNumber || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        originalCost: form.originalCost ? Number(form.originalCost) : undefined,
        owningDepartmentId: Number(form.owningDepartmentId),
        responsibleDepartmentId: Number(form.responsibleDepartmentId || form.owningDepartmentId),
        currentRoomId: form.currentRoomId ? Number(form.currentRoomId) : undefined,
      });
      navigate(`/assets/${res.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not register asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'h-11 rounded border border-border px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-tertiary';
  const labelClass = 'text-sm font-medium text-text-primary mb-1 block';
  const sectionClass = 'bg-white rounded-lg border border-border shadow-card p-6 flex flex-col gap-4';
  const categoryName = categories.find((c) => String(c.id) === form.categoryId)?.name;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={handleSubmit} className="lg:col-span-2 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Register New Asset</h1>
          <p className="text-text-secondary text-sm mt-1">Enter hardware specifications, procurement records, and allocation.</p>
        </div>

        {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

        <div className={sectionClass}>
          <div className="font-medium text-text-primary">1. Basic Hardware Information</div>
          <div>
            <label className={labelClass}>Asset Display Name</label>
            <input required className={inputClass} value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <select required className={inputClass} value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Serial Number</label>
              <input className={inputClass} value={form.serialNumber} onChange={(e) => update('serialNumber', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Manufacturer</label>
              <input className={inputClass} value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <input className={inputClass} value={form.model} onChange={(e) => update('model', e.target.value)} />
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className="font-medium text-text-primary">2. Acquisition & Financials</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Purchase Order / Invoice #</label>
              <input className={inputClass} value={form.invoiceNumber} onChange={(e) => update('invoiceNumber', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Unit Purchase Cost</label>
              <input type="number" step="0.01" className={inputClass} value={form.originalCost} onChange={(e) => update('originalCost', e.target.value)} />
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <div className="font-medium text-text-primary">3. Physical Allocation & Custody</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Owning Department</label>
              <select required className={inputClass} value={form.owningDepartmentId} onChange={(e) => update('owningDepartmentId', e.target.value)}>
                <option value="">Select…</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Current Room (optional)</label>
              <select className={inputClass} value={form.currentRoomId} onChange={(e) => update('currentRoomId', e.target.value)}>
                <option value="">Unassigned</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="h-12 rounded bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-60">
          {submitting ? 'Registering…' : 'Save & Register Asset'}
        </button>
      </form>

      <div className="bg-white rounded-lg border border-border shadow-card p-6 h-fit sticky top-8">
        <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Live Preview</div>
        <div className="w-full aspect-video rounded bg-canvas border border-border flex items-center justify-center mb-4">
          <Laptop size={32} className="text-text-secondary" />
        </div>
        <div className="text-xs text-text-secondary">{categoryName ?? 'No category selected'}</div>
        <div className="font-medium text-text-primary mt-0.5">{form.name || 'Untitled Asset'}</div>
        <div className="text-xs font-mono text-text-secondary mt-2">
          A tag will be auto-generated on save (e.g. {(categoryName ?? 'AST').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'AST'}-000001)
        </div>
      </div>
    </div>
  );
}
