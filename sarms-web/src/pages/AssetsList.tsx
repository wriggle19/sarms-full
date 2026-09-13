import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';

interface AssetRow {
  id: number;
  assetTag: string;
  name: string;
  category: { name: string };
  status: { code: string; colorHex?: string };
  currentRoom?: { name: string } | null;
}

export function AssetsList() {
  const [items, setItems] = useState<AssetRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [statusCode, setStatusCode] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/asset-categories').then((res) => setCategories(res.data));
    api.get('/asset-statuses').then((res) => setStatuses(res.data));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      api
        .get('/assets', {
          params: {
            search: search || undefined,
            categoryId: categoryId || undefined,
            statusCode: statusCode || undefined,
          },
        })
        .then((res) => {
          setItems(res.data.items);
          setTotal(res.data.total);
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, categoryId, statusCode]);

  const selectClass = 'h-10 rounded border border-border px-3 text-sm bg-white';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Asset Register</h1>
          <p className="text-text-secondary text-sm mt-1">{total} assets tracked across your organization.</p>
        </div>
        <Link
          to="/assets/new"
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded hover:bg-primary-hover"
        >
          <Plus size={16} /> Register New Asset
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by tag, name, or serial number…"
          className="h-10 rounded border border-border px-4 text-sm flex-1 min-w-[240px] focus:outline-none focus:ring-2 focus:ring-tertiary"
        />
        <select className={selectClass} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={selectClass} value={statusCode} onChange={(e) => setStatusCode(e.target.value)}>
          <option value="">All Statuses</option>
          {statuses.map((s) => <option key={s.id} value={s.code}>{s.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-canvas text-text-secondary text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Asset Tag</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-text-secondary">Loading…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-text-secondary">No assets found.</td></tr>
            )}
            {items.map((asset) => (
              <tr key={asset.id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <Link to={`/assets/${asset.id}`} className="text-secondary font-medium hover:underline">
                    {asset.assetTag}
                  </Link>
                </td>
                <td className="px-4 py-3">{asset.name}</td>
                <td className="px-4 py-3 text-text-secondary">{asset.category?.name}</td>
                <td className="px-4 py-3">
                  <StatusBadge code={asset.status?.code} colorHex={asset.status?.colorHex} />
                </td>
                <td className="px-4 py-3 text-text-secondary">{asset.currentRoom?.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
