import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

const inputClass = 'h-11 rounded border border-border px-3 text-sm w-full';

export function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const blank = () => ({
    fullName: '', email: '', password: '', phone: '', employeeId: '', departmentId: '', roleIds: [] as string[],
  });
  const [form, setForm] = useState(blank());
  const [edit, setEdit] = useState({ phone: '', departmentId: '' });

  const load = () => {
    api.get('/users').then((res) => setUsers(res.data));
    api.get('/departments').then((res) => setDepartments(res.data));
    api.get('/roles').then((res) => setRoles(res.data));
  };

  useEffect(load, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/users', {
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        employeeId: form.employeeId || undefined,
        phone: form.phone || undefined,
        departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        roleIds: form.roleIds.map(Number),
      });
      setForm(blank());
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not create user.');
    }
  };

  const toggleRole = (id: string) => {
    setForm((f) => ({
      ...f,
      roleIds: f.roleIds.includes(id) ? f.roleIds.filter((x) => x !== id) : [...f.roleIds, id],
    }));
  };

  const toggleActive = async (u: any) => {
    setError(null);
    try {
      await api.patch(`/users/${u.id}/${u.status === 'ACTIVE' ? 'deactivate' : 'activate'}`);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not toggle user status.');
    }
  };

  const saveEdit = async (id: number) => {
    setError(null);
    try {
      await api.patch(`/users/${id}`, {
        phone: edit.phone || undefined,
        departmentId: edit.departmentId ? Number(edit.departmentId) : null,
      });
      setEditingId(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not update user.');
    }
  };

  const beginEdit = (u: any) => {
    setEditingId(u.id);
    setEdit({ phone: u.phone ?? '', departmentId: u.departmentId ? String(u.departmentId) : '' });
  };

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

      <h1 className="text-xl font-semibold text-text-primary mb-1">Create user</h1>
      <form onSubmit={create} className="bg-white rounded-lg border border-border shadow-card p-5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Full name</label>
          <input required className={inputClass} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Email</label>
          <input required type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Password (min 8)</label>
          <input required type="text" className={inputClass} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Employee ID</label>
          <input className={inputClass} value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Department</label>
          <select className={inputClass} value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
            <option value="">None</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="h-11 rounded bg-primary text-white font-medium px-6 hover:bg-primary-hover">Create user</button>
        </div>
        <div className="md:col-span-3">
          <label className="text-sm font-medium text-text-primary mb-1 block">Roles</label>
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <label key={r.id} className="inline-flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={form.roleIds.includes(String(r.id))} onChange={() => toggleRole(String(r.id))} />
                {r.name}
              </label>
            ))}
          </div>
        </div>
      </form>
    <h1 className="text-xl font-semibold text-text-primary mb-1">Users ({users.length})</h1>
      <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border overflow-x-auto">
        {users.length === 0 && <div className="px-5 py-4 text-sm text-text-secondary">No users.</div>}
        {users.map((u) => (
          <div key={u.id} className="px-5 py-4 text-sm flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-medium text-text-primary truncate">{u.fullName} <span className="text-text-secondary">· {u.email}</span></div>
              <div className="text-text-secondary text-xs">
                {u.department?.name ?? 'No department'} · {u.roles?.map((r: any) => r.role?.name).filter(Boolean).join(', ') || 'No roles'}
              </div>
              {editingId === u.id ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input className={`${inputClass} w-44`} placeholder="Phone" value={edit.phone} onChange={(e) => setEdit((s) => ({ ...s, phone: e.target.value }))} />
                  <select className={`${inputClass} w-44`} value={edit.departmentId} onChange={(e) => setEdit((s) => ({ ...s, departmentId: e.target.value }))}>
                    <option value="">No department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <button onClick={() => saveEdit(u.id)} className="px-3 py-1.5 rounded bg-primary text-white text-xs font-medium hover:bg-primary-hover">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded border border-border text-xs text-text-secondary">Cancel</button>
                </div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.status === 'ACTIVE' ? 'bg-soft-accent text-primary' : 'bg-critical-surface text-critical'}`}>{u.status}</span>
              <button onClick={() => beginEdit(u)} className="text-xs text-primary hover:underline">Edit</button>
              <button onClick={() => toggleActive(u)} className="text-xs text-text-secondary hover:underline">{u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}