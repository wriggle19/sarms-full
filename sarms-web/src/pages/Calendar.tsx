import { FormEvent, useEffect, useState } from 'react';
import { CalendarClock, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

const EVENT_TYPES = [
  'ACADEMIC_YEAR_START', 'ACADEMIC_YEAR_END', 'TEACHER_RETURN', 'STUDENT_RETURN',
  'STAFF_CLEARANCE', 'EQUIPMENT_RETURN_DEADLINE', 'INVENTORY_DATE', 'HOLIDAY', 'OTHER',
];

export function Calendar() {
  const [events, setEvents] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('EQUIPMENT_RETURN_DEADLINE');
  const [eventDate, setEventDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => api.get('/calendar').then((r) => setEvents(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setError(null); setMsg(null);
    try {
      await api.post('/calendar', { title, eventType, eventDate, description: description || undefined });
      setTitle(''); setDescription(''); setEventDate('');
      setMsg('Event added.');
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not add event.');
    }
  };

  const remove = async (id: number) => {
    await api.delete(`/calendar/${id}`);
    load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
          <CalendarClock size={22} /> School Calendar
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Academic-year and operational dates. Deadlines here drive due/return and stocktake reminders.
        </p>
      </div>

      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}
      {msg && <div className="rounded bg-soft-accent text-primary text-sm px-3 py-2">{msg}</div>}

      <form onSubmit={add} className="bg-white rounded-lg border border-border shadow-card p-5 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-secondary uppercase">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required
            className="h-10 w-64 rounded border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary" placeholder="End of term equipment return" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-secondary uppercase">Type</label>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}
            className="h-10 rounded border border-border px-3 text-sm bg-white">
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-secondary uppercase">Date</label>
          <input type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)}
            className="h-10 rounded border border-border px-3 text-sm" />
        </div>
        <input value={description} onChange={(e) => setDescription(e.target.value)}
          className="h-10 w-56 rounded border border-border px-3 text-sm" placeholder="Note (optional)" />
        <button type="submit" className="h-10 px-4 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover">Add</button>
      </form>

      <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
        {events.length === 0 && <div className="px-5 py-6 text-sm text-text-secondary">No calendar events yet.</div>}
        {events.map((ev: any) => (
          <div key={ev.id} className="px-5 py-3 flex items-center justify-between text-sm">
            <div>
              <div className="font-medium text-text-primary">{ev.title}
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-soft-accent text-primary">{ev.eventType.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-text-secondary text-xs mt-0.5">{new Date(ev.eventDate).toLocaleString()}{ev.endDate ? ` → ${new Date(ev.endDate).toLocaleString()}` : ''}{ev.description ? ` · ${ev.description}` : ''}</div>
            </div>
            <button onClick={() => remove(ev.id)} className="text-text-secondary hover:text-critical"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}