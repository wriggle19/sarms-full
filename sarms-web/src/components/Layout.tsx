import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';
import {
  LayoutDashboard, Boxes, ClipboardList, CheckSquare, PackageCheck,
  Wrench, AlertTriangle, Trash2, Truck, ScanLine, BarChart3, UserMinus,
  Search, Bell, CalendarClock, ScrollText, Settings as SettingsIcon,
  Layers, FileUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

const NAV_ITEMS: { to: string; label: string; icon: any; end?: boolean; perm?: string }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/assets', label: 'Assets', icon: Boxes, perm: 'assets.view' },
  { to: '/requests', label: 'Requests', icon: ClipboardList, perm: 'requests.view' },
  { to: '/approvals', label: 'Approvals', icon: CheckSquare, perm: 'requests.approve' },
  { to: '/issuance', label: 'Issuance', icon: PackageCheck, perm: 'assets.issue' },
  { to: '/reservations', label: 'Reservations', icon: CalendarClock, perm: 'assets.view' },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench, perm: 'maintenance.manage' },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle, perm: 'assets.view' },
  { to: '/disposal', label: 'Disposal', icon: Trash2, perm: 'disposal.approve' },
  { to: '/procurement', label: 'Procurement', icon: Truck, perm: 'procurement.manage' },
  { to: '/stocktake', label: 'Stocktake', icon: ScanLine, perm: 'assets.view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, perm: 'assets.view' },
  { to: '/calendar', label: 'Calendar', icon: CalendarClock, perm: 'assets.view' },
  { to: '/clearance', label: 'Clearance', icon: UserMinus, perm: 'users.view' },
  // Admin tooling - each gated on the SPECIFIC permission its page requires
  // server-side, not a loose proxy like users.view (a Department Head with
  // users.view must not see IT admin tooling).
  { to: '/bulk', label: 'Bulk Ops', icon: Layers, perm: 'assets.transfer' },
  { to: '/imports', label: 'Import Assets', icon: FileUp, perm: 'assets.create' },
  { to: '/audit-logs', label: 'Audit Log', icon: ScrollText, perm: 'audit.view' },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, perm: 'roles.manage' },
];

export function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [notifs, setNotifs] = useState<any[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const visibleNav = NAV_ITEMS.filter(
    (i) => !i.perm || hasPermission(i.perm),
  );

  useEffect(() => {
    api.get('/notifications').then((r) => setNotifs(r.data)).catch(() => {});
  }, []);

  const unread = notifs.filter((n) => !n.isRead).length;
  const markAll = async () => {
    await api.patch('/notifications/read-all').catch(() => {});
    setNotifs(notifs.map((n) => ({ ...n, isRead: true })));
  };

  const markOne = async (id: number) => {
    await api.patch(`/notifications/${id}/read`).catch(() => {});
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  const initials = (user?.fullName ?? '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 shrink-0 bg-primary text-white flex flex-col">
        <Link to="/" title="Go to dashboard" className="h-16 flex items-center px-6 font-semibold text-lg tracking-tight border-b border-white/10 hover:bg-white/5 transition-colors">
          <span className="w-7 h-7 rounded bg-white/15 flex items-center justify-center text-sm mr-2">S</span>
          SARMS
        </Link>
        <nav className="flex-1 py-3 overflow-y-auto">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white border-r-2 border-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 text-sm">
          <Link to="/profile" title="Open my profile" className="flex items-center gap-2 mb-3 rounded p-1 -m-1 hover:bg-white/5 transition-colors">
            <span className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="font-medium truncate">{user?.fullName}</div>
              <div className="text-white/60 truncate text-xs">{user?.email}</div>
            </div>
          </Link>
          <button onClick={logout} className="text-white/70 hover:text-white text-xs underline">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-border flex items-center gap-4 px-6 shrink-0">
          <form onSubmit={submitSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search assets, custodians, requests…"
                className="h-9 w-full rounded border border-border pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
              />
            </div>
          </form>
          <div className="relative">
            <button
              onClick={() => setBellOpen((o) => !o)}
              className="relative text-text-secondary hover:text-text-primary p-2"
              title="Notifications"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-critical text-white text-[10px] flex items-center justify-center leading-none">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {bellOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} />
                <div className="absolute right-0 top-11 z-40 w-80 bg-white rounded-lg border border-border shadow-elevated overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <span className="font-medium text-text-primary text-sm">Notifications</span>
                    {unread > 0 && (
                      <button onClick={markAll} className="text-xs text-primary hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-border">
                    {notifs.length === 0 && (
                      <div className="px-4 py-6 text-sm text-text-secondary text-center">No notifications yet</div>
                    )}
                    {notifs.map((n) => {
                      const expanded = expandedId === n.id;
                      const toggle = async () => {
                        if (!n.isRead) await markOne(n.id);
                        setExpandedId(expanded ? null : n.id);
                      };
                      return (
                        <div key={n.id} className={`${n.isRead ? '' : 'bg-canvas'}`}>
                          <button
                            onClick={toggle}
                            className="w-full text-left px-4 py-3 flex items-start gap-2 hover:bg-canvas/60 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium leading-snug ${
                                n.isRead ? 'text-text-secondary' : 'text-text-primary'
                              }`}>
                                {n.title}
                              </div>
                              {!expanded && (
                                <div className="text-xs text-text-secondary mt-0.5 truncate">{n.body}</div>
                              )}
                              <div className="text-[10px] text-text-secondary mt-1">
                                {new Date(n.createdAt).toLocaleString()}
                              </div>
                            </div>
                            {expanded
                              ? <ChevronUp size={14} className="shrink-0 mt-0.5 text-text-secondary" />
                              : <ChevronDown size={14} className="shrink-0 mt-0.5 text-text-secondary" />}
                          </button>
                          {expanded && (
                            <div className="px-4 pb-3 text-sm text-text-primary whitespace-pre-wrap break-words border-t border-border/50 pt-2 bg-soft-accent/30">
                              {n.body}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-border px-4 py-2.5">
                    <Link
                      to="/notifications"
                      onClick={() => setBellOpen(false)}
                      className="text-xs text-primary hover:underline"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 bg-canvas overflow-y-auto">
          <div className="max-w-6xl mx-auto p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
