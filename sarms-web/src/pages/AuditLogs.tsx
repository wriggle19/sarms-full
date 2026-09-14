import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [moduleFilter, setModuleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    const params: any = {};
    if (moduleFilter) params.module = moduleFilter;
    api
      .get('/audit-logs', { params })
      .then((res) => setLogs(res.data.items ?? res.data))
      .finally(() => setLoading(false));
  }, [moduleFilter]);

  const modules = ['assets', 'requests', 'approvals', 'custody', 'maintenance', 'incidents', 'disposal', 'procurement', 'stocktake', 'users', 'auth'];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Audit Log</h1>
        <p className="text-text-secondary text-sm mt-1">
          Complete system activity trail — who did what, when, and from where.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-text-secondary">Module:</label>
        <select
          className="h-9 rounded border border-border px-3 text-sm"
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
        >
          <option value="">All modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
        {loading && <div className="px-5 py-4 text-sm text-text-secondary">Loading…</div>}
        {!loading && logs.length === 0 && (
          <div className="px-5 py-4 text-sm text-text-secondary">No audit entries found.</div>
        )}
        {!loading &&
          logs.map((log) => (
            <div key={log.id} className="px-5 py-3 text-sm">
              <button
                className="w-full text-left flex items-center justify-between gap-4"
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="px-2 py-0.5 rounded bg-canvas text-xs font-medium text-text-primary shrink-0">
                    {log.action}
                  </span>
                  <span className="text-text-secondary text-xs shrink-0">{log.module}</span>
                  <span className="font-medium text-text-primary truncate">
                    {log.user?.fullName ?? 'System'} · {log.recordType}
                    {log.recordId != null ? ` #${log.recordId}` : ''}
                  </span>
                </div>
                <span className="text-text-secondary text-xs shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </button>
              {expanded === log.id && (
                <div className="mt-2 pl-2 text-xs text-text-secondary space-y-1">
                  {log.ipAddress && <div>IP: {log.ipAddress}</div>}
                  {log.userAgent && <div className="truncate">Device: {log.userAgent}</div>}
                  {log.newValue && (
                    <pre className="mt-2 bg-canvas rounded p-3 overflow-x-auto max-h-64 text-[11px] leading-relaxed">
                      {log.newValue.length > 2000 ? log.newValue.slice(0, 2000) + ' …' : log.newValue}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
