import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { api } from '../lib/api';

const COLORS = ['#1E3A8A', '#1D4ED8', '#3B82F6', '#93C5FD', '#059669', '#D97706', '#DC2626'];

export function Reports() {
  const [summary, setSummary] = useState<any>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ name: string; count: number }[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setSummary(res.data));
    api.get('/assets', { params: { pageSize: 100 } }).then((res) => {
      const items = res.data.items;
      const byCategory = new Map<string, number>();
      let value = 0;
      for (const a of items) {
        const name = a.category?.name ?? 'Uncategorized';
        byCategory.set(name, (byCategory.get(name) ?? 0) + 1);
        value += Number(a.originalCost ?? 0);
      }
      setCategoryBreakdown(Array.from(byCategory.entries()).map(([name, count]) => ({ name, count })));
      setTotalValue(value);
    });
  }, []);

  if (!summary) return <div className="text-text-secondary">Loading…</div>;

  const c = summary.countsByStatus;
  const maxCategory = Math.max(1, ...categoryBreakdown.map((c2) => c2.count));

  const downloadCsv = async (url: string, filename: string) => {
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const href = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = href; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(href);
    } catch { alert('Could not download report.'); }
  };

  const EXPORTS = [
    { label: 'Asset Register', url: '/reports/asset-register.csv', file: 'asset-register.csv' },
    { label: 'Overdue Returns', url: '/reports/overdue.csv', file: 'overdue.csv' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Asset Intelligence & Reporting</h1>
        <p className="text-text-secondary text-sm mt-1">
          District capital valuation, lifecycle utilization, and departmental allocation.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-card p-5 flex items-center justify-between gap-4">
        <div>
          <div className="font-medium text-text-primary">Export CSV reports</div>
          <div className="text-sm text-text-secondary mt-0.5">Downloaded reports respect your permissions.</div>
        </div>
        <div className="flex gap-2">
          {EXPORTS.map((ex) => (
            <button
              key={ex.url}
              onClick={() => downloadCsv(ex.url, ex.file)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-border text-sm font-medium hover:bg-canvas"
            >
              <Download size={15} /> {ex.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border shadow-card p-5">
          <div className="text-xs text-text-secondary uppercase">Total Insured Value</div>
          <div className="text-2xl font-semibold mt-1">
            {totalValue.toLocaleString(undefined, { style: 'currency', currency: 'GHS' })}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border shadow-card p-5">
          <div className="text-xs text-text-secondary uppercase">Fleet Utilization</div>
          <div className="text-2xl font-semibold mt-1 text-success">
            {summary.totalAssets ? Math.round((((c.ASSIGNED ?? 0) + (c.ON_LOAN ?? 0)) / summary.totalAssets) * 100) : 0}%
          </div>
        </div>
        <div className="bg-white rounded-lg border border-border shadow-card p-5">
          <div className="text-xs text-text-secondary uppercase">Overdue Returns</div>
          <div className="text-2xl font-semibold mt-1 text-critical">{summary.overdueAssignments}</div>
        </div>
        <div className="bg-white rounded-lg border border-border shadow-card p-5">
          <div className="text-xs text-text-secondary uppercase">Pending Approvals</div>
          <div className="text-2xl font-semibold mt-1">{summary.pendingApprovals}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-border shadow-card p-6">
          <div className="font-medium text-text-primary mb-4">Hardware Inventory by Category</div>
          <div className="flex flex-col gap-3">
            {categoryBreakdown.map((cat, i) => (
              <div key={cat.name}>
                <div className="flex justify-between text-xs text-text-secondary mb-1">
                  <span>{cat.name}</span>
                  <span>{cat.count} units</span>
                </div>
                <div className="h-2 bg-canvas rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(cat.count / maxCategory) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                  />
                </div>
              </div>
            ))}
            {categoryBreakdown.length === 0 && <div className="text-sm text-text-secondary">No assets registered yet.</div>}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border shadow-card p-6">
          <div className="font-medium text-text-primary mb-4">Fleet Status Distribution</div>
          <div className="flex flex-col gap-3">
            {Object.entries(c).map(([status, count], i) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {status.replace(/_/g, ' ')}
                </div>
                <span className="font-medium text-text-primary">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
