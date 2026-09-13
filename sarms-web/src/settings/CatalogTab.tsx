import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const inputClass = 'h-10 rounded border border-border px-3 text-sm w-full';

function CrudList(opts: {
  title: string; items: any[]; render: (i: any) => string; onAdd: (d: any) => void;
  onRename: (id: number, value: string) => void; onDelete: (id: number) => void;
}) {
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  return (
    <section className="bg-white rounded-lg border border-border shadow-card">
      <div className="px-4 py-3 font-semibold text-text-primary">{opts.title} <span className="text-text-secondary text-xs">({opts.items.length})</span></div>
      <div className="px-4 py-2 flex gap-2">
        <input placeholder="New…" className={inputClass} value={newValue} onChange={(e) => setNewValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { opts.onAdd({ name: newValue }); setNewValue(''); } }} />
        <button onClick={() => { opts.onAdd({ name: newValue }); setNewValue(''); }} className="px-3 rounded bg-primary text-white text-xs font-medium hover:bg-primary-hover">Add</button>
      </div>
      <div className="px-4 py-2 divide-y divide-border">
        {opts.items.length === 0 && <div className="text-sm text-text-secondary px-2 py-1">None.</div>}
        {opts.items.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
            {editingId === i.id ? (
              <input className={`${inputClass} w-40`} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { opts.onRename(i.id, editValue); setEditingId(null); } }} />
            ) : <span>{opts.render(i)}</span>}
            <span className="flex gap-2 text-xs">
              <button className="text-primary hover:underline" onClick={() => { setEditingId(i.id); setEditValue(opts.render(i)); }}>Edit</button>
              <button className="text-critical hover:underline" onClick={() => opts.onDelete(i.id)}>Delete</button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CatalogTab() {
  const [categories, setCategories] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.get('/asset-categories').then((r) => setCategories(r.data));
    api.get('/asset-statuses').then((r) => setStatuses(r.data));
    api.get('/asset-conditions').then((r) => setConditions(r.data));
  };
  useEffect(load, []);

  const catAdd = async (d: any) => { try { await api.post('/asset-categories', d); load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Error'); } };
  const catRename = async (id: number, name: string) => { try { await api.patch(`/asset-categories/${id}`, { name }); load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Error'); } };
  const catDelete = async (id: number) => { try { await api.delete(`/asset-categories/${id}`); load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Error'); } };

  const statusAdd = async (d: any) => { try { await api.post('/asset-statuses', { code: d.name.toUpperCase().replace(/\\s+/g, '_'), label: d.name }); load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Error'); } };
  const statusRename = async (id: number, label: string) => { try { await api.patch(`/asset-statuses/${id}`, { label }); load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Error'); } };
  const statusDelete = async (id: number) => { try { await api.delete(`/asset-statuses/${id}`); load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Error'); } };

  const condAdd = async (d: any) => { try { await api.post('/asset-conditions', { code: d.name.toUpperCase().replace(/\\s+/g, '_'), label: d.name, rank: conditions.length + 10 }); load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Error'); } };
  const condRename = async (id: number, label: string) => { try { await api.patch(`/asset-conditions/${id}`, { label }); load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Error'); } };
  const condDelete = async (id: number) => { try { await api.delete(`/asset-conditions/${id}`); load(); } catch (e: any) { setError(e.response?.data?.message ?? 'Error'); } };

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}
      <p className="text-sm text-text-secondary">Manage the vocabulary used across the asset register. Deleting a value that is already used by assets will be rejected.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CrudList title="Categories" items={categories} render={(c) => c.name} onAdd={catAdd} onRename={catRename} onDelete={catDelete} />
        <CrudList title="Statuses" items={statuses} render={(s) => `${s.label} (${s.code})`} onAdd={statusAdd} onRename={statusRename} onDelete={statusDelete} />
        <CrudList title="Conditions" items={conditions} render={(c) => `${c.label} (rank ${c.rank})`} onAdd={condAdd} onRename={condRename} onDelete={condDelete} />
      </div>
    </div>
  );
}