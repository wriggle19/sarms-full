import { useEffect, useState } from 'react';
import { UserMinus } from 'lucide-react';
import { api } from '../lib/api';

const CONDITIONS = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];

export function Clearance() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [outstanding, setOutstanding] = useState<any[]>([]);
  // Items returned during THIS clearance session - feeds the certificate's
  // "verified as cleared" table (the outstanding list is empty by the time
  // the certificate can be generated, so the returns must be remembered).
  const [resolvedAssets, setResolvedAssets] = useState<
    { assetTag: string; assetName: string; returnedAt: string }[]
  >([]);
  const [returning, setReturning] = useState<any | null>(null);
  const [condition, setCondition] = useState('GOOD');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/users').then((res) => setUsers(res.data));
  }, []);

  const load = (userId: string) => {
    if (!userId) return;
    api.get(`/users/${userId}/outstanding-assets`).then((res) => setOutstanding(res.data));
  };

  const selectEmployee = (userId: string) => {
    setSelectedId(userId);
    setResolvedAssets([]); // switching employee starts a fresh clearance session
  };

  useEffect(() => {
    load(selectedId);
  }, [selectedId]);

  const selectedUser = users.find((u) => String(u.id) === selectedId);

  // Priority 4.3: produce a printable clearance certificate. Opens a styled
  // print view (browser print -> Save as PDF) with the employee details, the
  // cleared asset list resolved during the offboarding workflow, and signature
  // lines. No new dependencies; uses the same data already on screen.
  const generateCertificate = () => {
    if (!selectedUser) return;
    const win = window.open('', '_blank', 'width=800,height=1000');
    if (!win) {
      setError('Pop-up blocked - allow pop-ups to generate the certificate.');
      return;
    }
    const rows = (resolvedAssets ?? [])
      .map(
        (a: any) => `<tr>
          <td>${escapeHtml(a.assetTag ?? '-')}</td>
          <td>${escapeHtml(a.assetName ?? '-')}</td>
          <td>${new Date(a.returnedAt).toLocaleDateString()}</td>
        </tr>`,
      )
      .join('');
    win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Asset Clearance Certificate - ${escapeHtml(selectedUser.fullName)}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #111; margin: 48px; }
    h1 { font-size: 22px; border-bottom: 2px solid #111; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th, td { border: 1px solid #999; padding: 8px; text-align: left; font-size: 13px; }
    th { background: #f3f4f6; }
    .meta { font-size: 14px; line-height: 1.7; }
    .sign { margin-top: 64px; display: flex; gap: 48px; }
    .sign div { flex: 1; border-top: 1px solid #111; padding-top: 6px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Asset Clearance Certificate</h1>
  <div class="meta">
    <p><strong>Employee:</strong> ${escapeHtml(selectedUser.fullName)}<br/>
    <strong>Department:</strong> ${escapeHtml(selectedUser.department?.name ?? '-')}<br/>
    <strong>Date of clearance:</strong> ${new Date().toLocaleDateString()}</p>
    <p>This is to certify that the employee named above has returned all
    school-owned equipment recorded against them in SARMS at the time of
    departure. Items verified as cleared are listed below.</p>
  </div>
  ${rows ? `<table><thead><tr><th>Asset Tag</th><th>Asset</th><th>Issue Date</th></tr></thead><tbody>${rows}</tbody></table>` : '<p>No equipment was on record.</p>'}
  <div class="sign">
    <div>Asset Manager</div>
    <div>Employee</div>
    <div>Date</div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`);
    win.document.close();
  };

  const escapeHtml = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

  const submitReturn = async () => {
    if (!returning) return;
    setError(null);
    try {
      await api.patch(`/assignments/${returning.id}/return`, { conditionAtReturnCode: condition });
      setResolvedAssets((prev) => [
        ...prev,
        {
          assetTag: returning.asset?.assetTag ?? '-',
          assetName: returning.asset?.name ?? '-',
          returnedAt: new Date().toISOString(),
        },
      ]);
      setReturning(null);
      load(selectedId);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not process return.');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
          <UserMinus size={22} /> Staff Asset Clearance
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Mandatory equipment recovery before an employee's departure is finalized.
        </p>
      </div>

      <select
        className="h-11 rounded border border-border px-3 text-sm w-full max-w-sm bg-white"
        value={selectedId}
        onChange={(e) => selectEmployee(e.target.value)}
      >
        <option value="">Select an employee…</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.fullName} — {u.department?.name}</option>)}
      </select>

      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

      {selectedUser && (
        <>
          <div className="bg-white rounded-lg border border-border shadow-card p-5 flex items-center justify-between">
            <div>
              <div className="font-medium text-text-primary">{selectedUser.fullName}</div>
              <div className="text-sm text-text-secondary">{selectedUser.position?.title ?? 'Staff'} • {selectedUser.department?.name}</div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-semibold ${outstanding.length === 0 ? 'text-success' : 'text-critical'}`}>
                {outstanding.length}
              </div>
              <div className="text-xs text-text-secondary">outstanding item{outstanding.length === 1 ? '' : 's'}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
            {outstanding.length === 0 && (
              <div className="px-5 py-6 text-sm text-success text-center">
                No outstanding equipment — clearance can be finalized.
              </div>
            )}
            {outstanding.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-text-primary">{a.asset?.assetTag} — {a.asset?.name}</div>
                  <div className="text-text-secondary text-xs">Issued {new Date(a.issuedAt).toLocaleDateString()}</div>
                </div>
                <button
                  onClick={() => setReturning(a)}
                  className="px-3 py-1.5 rounded border border-border text-xs font-medium hover:bg-canvas"
                >
                  Process Return
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={generateCertificate}
            disabled={outstanding.length > 0}
            className="h-11 rounded bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
            title={outstanding.length > 0 ? 'Resolve all outstanding items first' : ''}
          >
            Generate Clearance Certificate
          </button>
        </>
      )}

      {returning && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-elevated w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Return {returning.asset?.assetTag}
            </h2>
            <label className="text-sm font-medium text-text-primary mb-2 block">Condition on Return</label>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCondition(c)}
                  className={`text-xs font-medium py-2 rounded border ${
                    condition === c ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-canvas'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setReturning(null)} className="px-4 py-2 rounded border border-border text-sm">Cancel</button>
              <button onClick={submitReturn} className="px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
