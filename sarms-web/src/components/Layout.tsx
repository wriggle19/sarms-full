import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FormEvent, useState } from 'react';
import {
  LayoutDashboard, Boxes, ClipboardList, CheckSquare, PackageCheck,
  Wrench, AlertTriangle, Trash2, Truck, ScanLine, BarChart3, UserMinus,
  Search, Bell, Settings as SettingsIcon,
} from 'lucide-react';
import { useAuth } from '../lib/auth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/assets', label: 'Assets', icon: Boxes },
  { to: '/requests', label: 'Requests', icon: ClipboardList },
  { to: '/approvals', label: 'Approvals', icon: CheckSquare },
  { to: '/issuance', label: 'Issuance', icon: PackageCheck },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/disposal', label: 'Disposal', icon: Trash2 },
  { to: '/procurement', label: 'Procurement', icon: Truck },
  { to: '/stocktake', label: 'Stocktake', icon: ScanLine },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/clearance', label: 'Clearance', icon: UserMinus },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, admin: true },
];

export function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const visibleNav = NAV_ITEMS.filter((i) => !i.admin || hasPermission('users.view'));

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
        <div className="h-16 flex items-center px-6 font-semibold text-lg tracking-tight border-b border-white/10">
          <span className="w-7 h-7 rounded bg-white/15 flex items-center justify-center text-sm mr-2">S</span>
          SARMS
        </div>
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
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-full bg-tertiary flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="font-medium truncate">{user?.fullName}</div>
              <div className="text-white/60 truncate text-xs">{user?.email}</div>
            </div>
          </div>
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
          <button className="text-text-secondary hover:text-text-primary">
            <Bell size={18} />
          </button>
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
