import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../lib/api';

export function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications')
      .then((r) => setNotifs(r.data))
      .finally(() => setLoading(false));
  }, []);

  const markOne = async (id: number) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAll = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const toggle = async (n: any) => {
    if (!n.isRead) await markOne(n.id);
    setExpandedId((prev) => (prev === n.id ? null : n.id));
  };

  const visible = filter === 'unread' ? notifs.filter((n) => !n.isRead) : notifs;
  const unreadCount = notifs.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
            <Bell size={22} /> Notifications
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAll}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded border border-border text-sm font-medium hover:bg-canvas"
          >
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-8 px-4 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-white border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {f === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
        {loading && (
          <div className="px-5 py-8 text-sm text-text-secondary text-center">Loading…</div>
        )}
        {!loading && visible.length === 0 && (
          <div className="px-5 py-8 text-sm text-text-secondary text-center">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
          </div>
        )}
        {visible.map((n) => {
          const expanded = expandedId === n.id;
          return (
            <div key={n.id} className={n.isRead ? '' : 'bg-canvas'}>
              <button
                onClick={() => toggle(n)}
                className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-canvas/60 transition-colors"
              >
                <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-primary'}`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${n.isRead ? 'text-text-secondary' : 'text-text-primary'}`}>
                    {n.title}
                  </div>
                  {!expanded && (
                    <div className="text-xs text-text-secondary mt-0.5 truncate">{n.body}</div>
                  )}
                  <div className="text-[11px] text-text-secondary mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                    {n.templateKey && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-soft-accent text-primary font-mono">
                        {n.templateKey}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-text-secondary shrink-0 mt-0.5">
                  {expanded ? 'collapse' : 'expand'}
                </span>
              </button>
              {expanded && (
                <div className="px-5 pb-4 pt-1 ml-5 text-sm text-text-primary whitespace-pre-wrap break-words border-t border-border/40">
                  {n.body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
