import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';

const inputClass = 'h-11 rounded border border-border px-3 text-sm w-full';

export function LocationsTab() {
  const [campuses, setCampuses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  // editing state: { type: 'campus'|'building'|'floor'|'room', id, value }
  const [editing, setEditing] = useState<{ type: string; id: number; value: string } | null>(null);
  const [campusName, setCampusName] = useState('');
  const [buildingInput, setBuildingInput] = useState<Record<number, string>>({});
  const [floorInput, setFloorInput] = useState<Record<number, string>>({});
  const [roomInput, setRoomInput] = useState<Record<number, string>>({});

  const load = () => api.get('/campuses').then((res) => setCampuses(res.data));
  useEffect(() => { load(); }, []);

  const addCampus = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try { await api.post('/campuses', { name: campusName }); setCampusName(''); load(); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Could not add campus.'); }
  };

  const addBuilding = async (campusId: number) => {
    if (!(buildingInput[campusId] ?? '').trim()) return;
    setError(null);
    try { await api.post('/buildings', { name: buildingInput[campusId], campusId }); setBuildingInput((s) => ({ ...s, [campusId]: '' })); load(); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Could not add building.'); }
  };

  const addFloor = async (buildingId: number) => {
    if (!(floorInput[buildingId] ?? '').trim()) return;
    setError(null);
    try { await api.post('/floors', { label: floorInput[buildingId], buildingId }); setFloorInput((s) => ({ ...s, [buildingId]: '' })); load(); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Could not add floor.'); }
  };

  const addRoom = async (floorId: number) => {
    if (!(roomInput[floorId] ?? '').trim()) return;
    setError(null);
    try { await api.post('/rooms', { name: roomInput[floorId], floorId }); setRoomInput((s) => ({ ...s, [floorId]: '' })); load(); }
    catch (err: any) { setError(err.response?.data?.message ?? 'Could not add room.'); }
  };

  const remove = async (type: string, id: number) => {
    setError(null);
    try { await api.delete(`/${type}s/${id}`); setEditing(null); load(); }
    catch (err: any) { setError(err.response?.data?.message ?? `Could not delete ${type}.`); }
  };

  const saveRename = async () => {
    if (!editing) return;
    setError(null);
    try {
      const payload = editing.type === 'floor' ? { label: editing.value } : { name: editing.value };
      await api.patch(`/${editing.type}s/${editing.id}`, payload);
      setEditing(null); load();
    } catch (err: any) { setError(err.response?.data?.message ?? 'Could not rename.'); }
  };

  const okBtn = 'px-3 py-1.5 rounded bg-primary text-white text-xs font-medium hover:bg-primary-hover';
  const xsBtn = 'text-xs text-primary hover:underline';

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

      <h1 className="text-xl font-semibold text-text-primary mb-1">Add campus</h1>
      <form onSubmit={addCampus} className="bg-white rounded-lg border border-border shadow-card p-5 flex gap-3">
        <input required placeholder="Campus name" className={inputClass} value={campusName} onChange={(e) => setCampusName(e.target.value)} />
        <button type="submit" className="px-4 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover shrink-0">Add</button>
      </form>

      {campuses.length === 0 && <div className="rounded bg-white border border-border shadow-card px-5 py-4 text-sm text-text-secondary">No campuses yet.</div>}
      {campuses.map((c) => (
        <div key={c.id} className="bg-white rounded-lg border border-border shadow-card">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            {editing && editing.type === 'campus' && editing.id === c.id ? (
              <input className={inputClass} value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); }} />
            ) : (
              <div className="font-semibold text-text-primary">{c.name}</div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => { setEditing({ type: 'campus', id: c.id, value: c.name }); }} className={xsBtn}>Rename</button>
              <button onClick={() => remove('campus', c.id)} className="text-xs text-critical hover:underline">Delete</button>
            </div>
          </div>

          <div className="flex gap-2 items-center px-4 py-2 bg-canvas/60">
            <input placeholder="Building name…" className={`${inputClass} !h-9`} value={buildingInput[c.id] ?? ''} onChange={(e) => setBuildingInput((s) => ({ ...s, [c.id]: e.target.value }))} />
            <button onClick={() => addBuilding(c.id)} className={okBtn}>Add building</button>
          </div>

          {c.buildings?.map((b: any) => (
            <div key={b.id} className="mx-4 my-1 rounded bg-canvas border border-border px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                {editing && editing.type === 'building' && editing.id === b.id ? (
                  <input className={inputClass} value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); }} />
                ) : (
                  <div className="font-medium text-sm text-text-primary">{b.name}</div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => { setEditing({ type: 'building', id: b.id, value: b.name }); }} className={xsBtn}>Rename</button>
                  <button onClick={() => remove('building', b.id)} className="text-xs text-critical hover:underline">Delete</button>
                </div>
              </div>
          <div className="flex gap-2 items-center px-3 py-1.5">
                <input placeholder="Floor label…" className={`${inputClass} !h-8 text-xs`} value={floorInput[b.id] ?? ''} onChange={(e) => setFloorInput((s) => ({ ...s, [b.id]: e.target.value }))} />
                <button onClick={() => addFloor(b.id)} className={okBtn}>Add floor</button>
              </div>
              {b.floors?.map((f: any) => (
                <div key={f.id} className="mx-3 my-1 rounded bg-white border border-border px-3 py-1.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    {editing && editing.type === 'floor' && editing.id === f.id ? (
                      <input className={inputClass} value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); }} />
                    ) : (
                      <span className="font-medium">{f.label}</span>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing({ type: 'floor', id: f.id, value: f.label }); }} className={xsBtn}>Rename</button>
                      <button onClick={() => remove('floor', f.id)} className="text-xs text-critical hover:underline">Delete</button>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center mt-1">
                    <input placeholder="Room name…" className={`${inputClass} !h-8 text-xs`} value={roomInput[f.id] ?? ''} onChange={(e) => setRoomInput((s) => ({ ...s, [f.id]: e.target.value }))} />
                    <button onClick={() => addRoom(f.id)} className={okBtn}>Add room</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {f.rooms?.map((r: any) => (
                      <span key={r.id} className="inline-flex items-center gap-1.5 text-xs bg-soft-accent text-primary rounded-full px-2 py-0.5">
                        {editing && editing.type === 'room' && editing.id === r.id ? (
                          <input className="w-28 h-7 rounded border border-border px-2 text-xs" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); }} />
                        ) : r.name}
                        {!(editing && editing.type === 'room' && editing.id === r.id) && (
                          <button onClick={() => { setEditing({ type: 'room', id: r.id, value: r.name }); }} className="hover:underline">edit</button>
                        )}
                        <button onClick={() => remove('room', r.id)} className="hover:underline text-critical">✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
        </div>
      ))}
    </div>
      ))}
    </div>
  );
}