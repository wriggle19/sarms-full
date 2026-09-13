import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, ScanLine } from 'lucide-react';
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
  const navigate = useNavigate();
  const [scanCode, setScanCode] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);

  // Read a QR/barcode immediately: extract the token (handles a bare token or a
  // pasted full /scan/{token} URL) and open the asset's detail page.
  const readCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = scanCode.trim();
    if (!raw) return;
    setScanError(null);
    const token = raw.split('/scan/').pop() ?? raw;
    try {
      const res = await api.get(`/assets/scan/${encodeURIComponent(token)}`);
      navigate(`/assets/${res.data.id}`);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setScanError('You do not have permission to view asset details.');
      } else {
        // Not a QR token - treat it as a normal search term (also matches tags/serial).
        setParams({ q: raw });
      }
    }
  };

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

      <div className="bg-white rounded-lg border border-border shadow-card p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
          <ScanLine size={16} className="text-primary" />
          Scan a code
        </div>
        <p className="text-xs text-text-secondary mt-1">
          Read a QR or barcode with a scanner, or type/paste the code (QR token, full scan URL, asset tag, or serial) and press Enter — the asset's details open immediately.
        </p>
        <form onSubmit={readCode} className="flex gap-3 mt-3">
          <input
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            placeholder="Scan / type / paste a QR or barcode value…"
            className="h-11 rounded border border-border px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-tertiary"
          />
          <button type="submit" className="px-4 h-11 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover shrink-0">
            Read code
          </button>
        </form>
        {scanError && <div className="mt-2 rounded bg-critical-surface text-critical text-sm px-3 py-2">{scanError}</div>}
      </div>

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
