import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

const inputClass = 'h-11 rounded border border-border px-3 text-sm w-full';

export function DepartmentsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', code: '' });
  const [editName, setEditName] = useState('');

  const load = () => api.get('/departments').then((res) => setItems(res.data));
  useEffect(() => { load(); }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/departments', form);
      setForm({ name: '', code: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not create department.');
    }
  };

  const save = async (id: number) => {
    setError(null);
    try {
      await api.patch(`/departments/${id}`, { name: editName });
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not update department.');
    }
  };

  const toggleActive = async (d: any) => {
    setError(null);
    try {
      await api.patch(`/departments/${d.id}`, { isActive: !d.isActive });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not toggle department.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

      <h1 className="text-xl font-semibold text-text-primary mb-1">Add department</h1>
      <form onSubmit={create} className="bg-white rounded-lg border border-border shadow-card p-5 flex gap-3">
        <input required placeholder="Name" className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <input required placeholder="Code" className={inputClass} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
        <button type="submit" className="px-4 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover shrink-0">Add</button>
      </form>

      <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
        {items.length === 0 && <div className="px-5 py-4 text-sm text-text-secondary">No departments.</div>}
        {items.map((d) => (
          <div key={d.id} className="px-5 py-4 text-sm flex items-center justify-between gap-3">
            {editingId === d.id ? (
              <div className="flex items-center gap-2">
                <input className={`${inputClass} w-64`} value={editName} onChange={(e) => setEditName(e.target.value)} />
                <button onClick={() => save(d.id)} className="px-3 py-1.5 rounded bg-primary text-white text-xs font-medium hover:bg-primary-hover">Save</button>
                <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded border border-border text-xs text-text-secondary">Cancel</button>
              </div>
            ) : (
              <div>
                <div className="font-medium text-text-primary">{d.name} <span className="text-text-secondary text-xs">({d.code})</span></div>
                <div className="text-text-secondary text-xs">{d.isActive ? 'Active' : 'Inactive'}</div>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setEditingId(d.id); setEditName(d.name); }} className="text-xs text-primary hover:underline">Edit</button>
              <button onClick={() => toggleActive(d)} className="text-xs text-text-secondary hover:underline">{d.isActive ? 'Deactivate' : 'Activate'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}