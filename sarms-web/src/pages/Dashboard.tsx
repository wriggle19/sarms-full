import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, CheckCircle2, PackageCheck, Wrench, AlertTriangle, ClipboardList, Clock, BarChart3 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Summary {
  totalAssets: number;
  countsByStatus: Record<string, number>;
  pendingApprovals: number;
  overdueAssignments: number;
}

interface ActivityRow {
  id: number;
  eventType: string;
  eventDate: string;
  description: string;
  asset: { assetTag: string; name: string };
}

function Card({ label, value, sub, icon: Icon, tone }: { label: string; value: number; sub?: string; icon: any; tone?: string }) {
  return (
    <div className="bg-white rounded-lg border border-border shadow-card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</div>
        <Icon size={16} className={tone ?? 'text-text-secondary'} />
      </div>
      <div className={`text-3xl font-semibold mt-2 ${tone ?? 'text-text-primary'}`}>{value}</div>
      {sub && <div className="text-xs text-text-secondary mt-1">{sub}</div>}
    </div>
  );
}

export function Dashboard() {
  const { hasPermission } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [finance, setFinance] = useState<{ byCurrency: { currency: string; totalAcquisitionCost: number; assetCount: number }[]; baseCurrencyTotal: number } | null>(null);
  const [myRequests, setMyRequests] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Role-scoped dashboard (Priority 4.1):
    //  - assets.view holders get the fleet overview (+ finance row when they
    //    hold finance.view - the endpoint is server-guarded regardless).
    //  - everyone else (e.g. a plain requester) gets a personal view of their
    //    own requests instead of fleet data they are not authorized to see.
    //
    // Each call is settled INDEPENDENTLY: a failure in an optional panel (e.g.
    // finance-summary against an older API build) must never blank the whole
    // dashboard. Only the core summary is required to render the page.
    if (hasPermission('assets.view')) {
      api
        .get('/dashboard/summary')
        .then((r) => setSummary(r.data))
        .catch(() => setError('Could not load dashboard data.'));

      api
        .get('/dashboard/recent-activity')
        .then((r) => setActivity(r.data))
        .catch(() => setActivity([]));

      if (hasPermission('finance.view')) {
        api
          .get('/dashboard/finance-summary')
          .then((r) => setFinance(r.data))
          .catch(() => setFinance(null)); // optional panel - degrade silently
      }
    } else {
      api
        .get('/requests/mine')
        .then((r) => setMyRequests(r.data))
        .catch(() => setMyRequests([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <div className="text-critical">{error}</div>;

  // Personal dashboard for users without fleet visibility (Priority 4.1).
  if (!hasPermission('assets.view')) {
    if (!myRequests) return <div className="text-text-secondary">Loading…</div>;
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">My Equipment Requests</h1>
          <p className="text-text-secondary text-sm mt-1">Your requests and their current stage.</p>
        </div>
        <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
          {myRequests.length === 0 && (
            <div className="px-5 py-6 text-sm text-text-secondary text-center">
              No requests yet.
            </div>
          )}
          {myRequests.map((r: any) => (
            <div key={r.id} className="px-5 py-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-text-primary">{r.requestNumber}</div>
                <div className="text-text-secondary text-xs">{r.requestType.replace(/_/g, ' ')}</div>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded bg-canvas border border-border text-text-secondary">
                {r.status.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) return <div className="text-text-secondary">Loading…</div>;

  const c = summary.countsByStatus;
  const availablePct = summary.totalAssets ? Math.round(((c.AVAILABLE ?? 0) / summary.totalAssets) * 100) : 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Asset Management Overview</h1>
        <p className="text-text-secondary text-sm mt-1">Live from your SARMS backend — no mock data.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total Assets" value={summary.totalAssets} icon={Boxes} sub={`${availablePct}% available`} />
        <Card label="Available" value={c.AVAILABLE ?? 0} icon={CheckCircle2} tone="text-success" />
        <Card label="Assigned / On Loan" value={(c.ASSIGNED ?? 0) + (c.ON_LOAN ?? 0)} icon={PackageCheck} />
        <Card label="Under Maintenance" value={c.MAINTENANCE ?? 0} icon={Wrench} tone="text-warning" />
        <Card label="Lost / Damaged" value={(c.LOST ?? 0) + (c.DAMAGED ?? 0) + (c.STOLEN ?? 0)} icon={AlertTriangle} tone="text-critical" />
        <Card label="Pending Approvals" value={summary.pendingApprovals} icon={ClipboardList} />
        <Card label="Overdue" value={summary.overdueAssignments} icon={Clock} tone="text-critical" />
      </div>

      {/* Finance row - only rendered for finance.view holders; the data
          itself is also server-guarded, this is purely UX scoping. */}
      {finance && finance.byCurrency.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {finance.byCurrency.map((f) => (
            <Card
              key={f.currency}
              label={`Acquisition Value (${f.currency})`}
              value={f.assetCount}
              sub={`${f.currency} ${f.totalAcquisitionCost.toLocaleString(undefined, { maximumFractionDigits: 0 })} total`}
              icon={BarChart3}
            />
          ))}
        </div>
      )}
      {finance && finance.baseCurrencyTotal > 0 && (
        <div className="text-sm text-text-secondary">
          Total acquisition value (base currency, at recorded acquisition rates):{' '}
          <span className="font-semibold text-text-primary">
            {finance.baseCurrencyTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-border shadow-card">
          <div className="px-5 py-4 border-b border-border font-medium text-text-primary flex items-center justify-between">
            Recent Activity
            <Link to="/reports" className="text-xs text-secondary hover:underline">View reports →</Link>
          </div>
          <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {activity.length === 0 && (
              <div className="px-5 py-4 text-sm text-text-secondary">No activity yet.</div>
            )}
            {activity.map((row) => (
              <div key={row.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-text-primary">{row.asset?.assetTag}</span>{' '}
                  <span className="text-text-secondary">— {row.description}</span>
                </div>
                <span className="text-xs text-text-secondary shrink-0 ml-3">
                  {new Date(row.eventDate).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border shadow-card p-5">
          <div className="font-medium text-text-primary mb-4">Fleet Status</div>
          {Object.entries(c).map(([status, count]) => (
            <div key={status} className="mb-3">
              <div className="flex justify-between text-xs text-text-secondary mb-1">
                <span>{status.replace(/_/g, ' ')}</span>
                <span>{count}</span>
              </div>
              <div className="h-1.5 bg-canvas rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${summary.totalAssets ? (count / summary.totalAssets) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
          <Link to="/approvals" className="block text-center mt-4 text-sm text-primary font-medium hover:underline">
            Review {summary.pendingApprovals} pending approval{summary.pendingApprovals === 1 ? '' : 's'} →
          </Link>
        </div>
      </div>
    </div>
  );
}
