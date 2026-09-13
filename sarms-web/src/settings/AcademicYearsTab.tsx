import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

const inputClass = 'h-11 rounded border border-border px-3 text-sm w-full';

export function AcademicYearsTab() {
  const [years, setYears] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ label: '', startDate: '', endDate: '' });

  const load = () => api.get('/academic-years').then((res) => setYears(res.data));
  useEffect(() => { load(); }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/academic-years', form);
      setForm({ label: '', startDate: '', endDate: '' });
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not create academic year.');
    }
  };

  const setCurrent = async (id: number) => {
    setError(null);
    try { await api.patch(`/academic-years/${id}/set-current`); load(); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Could not set current year.'); }
  };

  const remove = async (id: number) => {
    setError(null);
    try { await api.delete(`/academic-years/${id}`); load(); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Could not delete academic year.'); }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

      <h1 className="text-xl font-semibold text-text-primary mb-1">Add academic year</h1>
      <form onSubmit={create} className="bg-white rounded-lg border border-border shadow-card p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div><label className="text-sm font-medium text-text-primary mb-1 block">Label</label><input required placeholder="2027/2028" className={inputClass} value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} /></div>
        <div><label className="text-sm font-medium text-text-primary mb-1 block">Start date</label><input required type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
        <div><label className="text-sm font-medium text-text-primary mb-1 block">End date</label><input required type="date" className={inputClass} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
        <div className="flex items-end"><button type="submit" className="h-11 rounded bg-primary text-white font-medium px-6 hover:bg-primary-hover">Add year</button></div>
      </form>

      <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
        {years.length === 0 && <div className="px-5 py-4 text-sm text-text-secondary">No academic years.</div>}
        {years.map((y) => (
          <div key={y.id} className="px-5 py-4 text-sm flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-text-primary">{y.label} {y.isCurrent ? <span className="text-xs font-semibold bg-soft-accent text-primary rounded-full px-2 py-0.5">Current</span> : null}</div>
              <div className="text-text-secondary text-xs">{(y.startDate ?? '').slice(0, 10)} → {(y.endDate ?? '').slice(0, 10)}</div>
            </div>
            <div className="flex gap-2">
              {!y.isCurrent && <button onClick={() => setCurrent(y.id)} className="text-xs text-primary hover:underline">Set current</button>}
              <button onClick={() => remove(y.id)} className="text-xs text-critical hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}