import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function RolesTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [allPerms, setAllPerms] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);

  const load = () => {
    api.get('/roles').then((r) => setRoles(r.data));
    api.get('/permissions').then((r) => setAllPerms(r.data));
  };
  useEffect(load, []);

  const open = (role: any) => {
    setOpenId(role.id);
    setSelected(role.permissions?.map((p: any) => p.permissionId ?? p.permission?.id).filter(Boolean) ?? []);
  };

  const toggle = (pid: number) => {
    setSelected((s) => (s.includes(pid) ? s.filter((x) => x !== pid) : [...s, pid]));
  };

  const save = async (roleId: number) => {
    setError(null);
    try {
      await api.put(`/roles/${roleId}/permissions`, { permissionIds: selected });
      load();
      setOpenId(null);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not save role permissions.');
    }
  };

  const permissionsOf = (r: any) =>
    r.permissions?.map((p: any) => ({ key: p.permissionId ?? p.permission?.id, code: p.permission?.code ?? '' })) ?? [];

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}
      <p className="text-sm text-text-secondary">Roles bundle permissions granted to users. Opening a role lets you edit which permissions it carries.</p>
      <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
        {roles.length === 0 && <div className="px-5 py-4 text-sm text-text-secondary">No roles.</div>}
        {roles.map((r) => (
          <div key={r.id} className="text-sm px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-medium text-text-primary">{r.name}</span>
                <span className="text-text-secondary text-xs"> — {permissionsOf(r).length} permissions</span>
              </div>
              <button className="text-xs text-primary hover:underline" onClick={() => open(r)}>{openId === r.id ? 'Close' : 'Edit permissions'}</button>
            </div>
            {openId === r.id && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
                {allPerms.map((p) => (
                  <label key={p.id} className="inline-flex items-center gap-1.5 text-xs border border-border rounded-full px-2 py-0.5 bg-canvas">
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                    {p.code}
                  </label>
                ))}
              </div>
            )}
            {openId === r.id && (
              <div className="mt-2 flex gap-2">
                <button className="px-3 py-1.5 rounded bg-primary text-white text-xs font-medium hover:bg-primary-hover" onClick={() => save(r.id)}>Save permissions</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}