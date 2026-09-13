import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

export function GlobalSearch() {
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = (q: string) => {
    if (!q.trim()) {
      setAssets([]);
      setUsers([]);
      setRooms([]);
      return;
    }
    setLoading(true);
    const lower = q.toLowerCase();
    Promise.all([
      api.get('/assets', { params: { search: q } }),
      api.get('/users'),
      api.get('/rooms'),
    ])
      .then(([a, u, r]) => {
        setAssets(a.data.items);
        setUsers(u.data.filter((x: any) => x.fullName.toLowerCase().includes(lower) || x.email.toLowerCase().includes(lower)));
        setRooms(r.data.filter((x: any) => x.name.toLowerCase().includes(lower)));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ q: query });
  };

  const totalResults = assets.length + users.length + rooms.length;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-text-primary">Search</h1>

      <form onSubmit={submit} className="relative">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets, custodians, or rooms…"
          className="h-12 w-full rounded border border-border pl-11 pr-4 text-sm shadow-card focus:outline-none focus:ring-2 focus:ring-tertiary"
        />
      </form>

      {loading && <div className="text-sm text-text-secondary">Searching…</div>}

      {!loading && initialQuery && (
        <div className="text-sm text-text-secondary">
          Found {totalResults} match{totalResults === 1 ? '' : 'es'} across 3 categories for "{initialQuery}"
        </div>
      )}

      {assets.length > 0 && (
        <section>
          <div className="font-medium text-text-primary mb-2">Assets & Hardware ({assets.length})</div>
          <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
            {assets.map((a) => (
              <Link key={a.id} to={`/assets/${a.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-canvas">
                <div>
                  <span className="font-medium text-text-primary">{a.assetTag}</span>{' '}
                  <span className="text-text-secondary">— {a.name}</span>
                </div>
                <StatusBadge code={a.status?.code} colorHex={a.status?.colorHex} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {users.length > 0 && (
        <section>
          <div className="font-medium text-text-primary mb-2">People ({users.length})</div>
          <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
            {users.map((u) => (
              <div key={u.id} className="px-4 py-3 text-sm">
                <div className="font-medium text-text-primary">{u.fullName}</div>
                <div className="text-text-secondary text-xs">{u.email} • {u.department?.name}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {rooms.length > 0 && (
        <section>
          <div className="font-medium text-text-primary mb-2">Locations ({rooms.length})</div>
          <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
            {rooms.map((r) => (
              <div key={r.id} className="px-4 py-3 text-sm font-medium text-text-primary">{r.name}</div>
            ))}
          </div>
        </section>
      )}

      {!loading && initialQuery && totalResults === 0 && (
        <div className="bg-white rounded-lg border border-border shadow-card p-6 text-sm text-text-secondary text-center">
          No matches for "{initialQuery}".
        </div>
      )}
    </div>
  );
}
