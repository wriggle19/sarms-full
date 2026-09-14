import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function NotificationTemplatesTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [channel, setChannel] = useState('IN_APP');
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { api.get('/notification-templates').then((r) => setTemplates(r.data)).catch(() => {}); }, []);

  const edit = (t: any) => {
    setEditing(t.eventKey); setSubject(t.subject); setBody(t.bodyTemplate); setChannel(t.channel ?? 'IN_APP');
  };

  const save = async () => {
    if (!editing) return;
    try {
      await api.put(`/notification-templates/${editing}`, { subject, bodyTemplate: body, channel });
      setEditing(null); setMsg(`Template "${editing}" saved.`);
      const r = await api.get('/notification-templates'); setTemplates(r.data);
    } catch (err: any) { setMsg(err.response?.data?.message ?? 'Save failed.'); }
  };

  return (
    <div className="flex flex-col gap-4">
      {msg && <div className="rounded bg-soft-accent text-primary text-sm px-3 py-2">{msg}</div>}

      {editing && (
        <div className="bg-white rounded-lg border border-border shadow-card p-5 flex flex-col gap-3">
          <div className="font-medium text-text-primary">Edit template · <span className="font-mono">{editing}</span></div>
          <label className="text-xs text-text-secondary uppercase">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="h-10 rounded border border-border px-3 text-sm" />
          <label className="text-xs text-text-secondary uppercase">Body (supports {'{{placeholders}}'})</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="rounded border border-border p-3 text-sm" />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="ch" checked={channel === 'IN_APP'} onChange={() => setChannel('IN_APP')} className="accent-primary" /> In-app
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="ch" checked={channel === 'EMAIL'} onChange={() => setChannel('EMAIL')} className="accent-primary" /> Email
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="h-9 px-4 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover">Save</button>
            <button onClick={() => setEditing(null)} className="h-9 px-4 rounded border border-border text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
        {templates.length === 0 && <div className="px-5 py-6 text-sm text-text-secondary">No templates configured yet.</div>}
        {templates.map((t) => (
          <div key={t.eventKey} className="px-5 py-3 flex items-center justify-between text-sm">
            <div className="min-w-0">
              <div className="font-medium text-text-primary font-mono">{t.eventKey}</div>
              <div className="text-text-secondary text-xs truncate">{t.subject} · <span className="rounded bg-canvas px-1.5 py-0.5">{t.channel}</span></div>
            </div>
            <button onClick={() => edit(t)} className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-canvas">Edit</button>
          </div>
        ))}
      </div>
    </div>
  );
}