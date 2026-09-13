import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRightLeft, Undo2, Laptop } from 'lucide-react';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Barcode } from '../components/Barcode';

interface HistoryRow {
  id: number;
  eventType: string;
  eventDate: string;
  description: string;
}

const CONDITIONS = ['NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED', 'BEYOND_REPAIR'];

const EVENT_COLORS: Record<string, string> = {
  REGISTERED: 'bg-secondary',
  ISSUED: 'bg-primary',
  TRANSFERRED: 'bg-tertiary',
  RETURNED: 'bg-success',
  STATUS_CHANGE: 'bg-warning',
  MAINTENANCE_REPORTED: 'bg-warning',
};

export function AssetDetail() {
  const { id } = useParams();
  const [asset, setAsset] = useState<any>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'history'>('overview');
  const [modal, setModal] = useState<'transfer' | 'return' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [transferForm, setTransferForm] = useState({ toRoomId: '', reason: '' });
  const [returnCondition, setReturnCondition] = useState('GOOD');

  const load = () => {
    if (!id) return;
    api.get(`/assets/${id}`).then((res) => setAsset(res.data));
    api.get(`/history/assets/${id}`).then((res) => setHistory(res.data));
  };

  useEffect(() => {
    load();
    api.get('/rooms').then((res) => setRooms(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!asset) return <div className="text-text-secondary">Loading…</div>;

  const activeAssignment = asset.assignments?.[0];

  const submitTransfer = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post('/transfers', {
        assetId: asset.id,
        toRoomId: transferForm.toRoomId ? Number(transferForm.toRoomId) : undefined,
        reason: transferForm.reason,
      });
      setModal(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not transfer asset.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReturn = async () => {
    if (!activeAssignment) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/assignments/${activeAssignment.id}/return`, { conditionAtReturnCode: returnCondition });
      setModal(null);
      load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Could not return asset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-xs text-text-secondary">
        Assets <span className="mx-1">/</span> {asset.category?.name} <span className="mx-1">/</span>{' '}
        <span className="text-text-primary font-medium">{asset.assetTag}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg border border-border shadow-card p-6">
          <div className="flex gap-5">
            <div className="w-24 h-24 rounded-lg bg-canvas border border-border flex items-center justify-center shrink-0">
              <Laptop size={36} className="text-text-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge code={asset.status?.code} colorHex={asset.status?.colorHex} />
                <span className="text-xs bg-canvas text-text-secondary px-2 py-0.5 rounded-full">{asset.category?.name}</span>
              </div>
              <h1 className="text-xl font-semibold text-text-primary mt-2">{asset.name}</h1>
              <div className="text-sm text-text-secondary mt-1 font-mono">#{asset.assetTag}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border text-sm">
            <div>
              <div className="text-text-secondary text-xs uppercase">Condition</div>
              <div className="mt-1 font-medium">{asset.condition?.label}</div>
            </div>
            <div>
              <div className="text-text-secondary text-xs uppercase">Owning Dept.</div>
              <div className="mt-1 font-medium">{asset.owningDepartment?.name}</div>
            </div>
            <div>
              <div className="text-text-secondary text-xs uppercase">Location</div>
              <div className="mt-1 font-medium">{asset.currentRoom?.name ?? '—'}</div>
            </div>
            <div>
              <div className="text-text-secondary text-xs uppercase">Current Custodian</div>
              <div className="mt-1 font-medium">{activeAssignment?.custodian?.fullName ?? 'Unassigned'}</div>
            </div>
          </div>

          <div className="flex gap-2 mt-6 pt-6 border-t border-border">
            <button onClick={() => setModal('transfer')} className="flex items-center gap-1.5 px-4 py-2 rounded border border-border text-sm font-medium hover:bg-canvas">
              <ArrowRightLeft size={15} /> Transfer
            </button>
            {activeAssignment && (
              <button onClick={() => setModal('return')} className="flex items-center gap-1.5 px-4 py-2 rounded border border-border text-sm font-medium hover:bg-canvas">
                <Undo2 size={15} /> Process Return
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-border shadow-card p-6 flex flex-col items-center text-center">
          <div className="text-sm font-medium text-text-primary mb-3">QR Code &amp; Barcode</div>
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide">QR Code</div>
          <div className="p-2 bg-white border border-border rounded">
            <QRCodeSVG value={`${window.location.origin}/scan/${asset.qrToken}`} size={132} />
          </div>
          <div className="text-xs font-mono text-text-secondary mt-1 break-all">{asset.qrToken}</div>
          <div className="text-xs text-text-secondary mt-1">Scan to view this asset (requires login)</div>

          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wide mt-4">Barcode (Code128)</div>
          <div className="bg-white border border-border rounded p-2">
            <Barcode text={asset.assetTag} />
          </div>
          <div className="text-xs text-text-secondary mt-1">The barcode encodes the human-readable tag: <span className="font-mono">{asset.assetTag}</span></div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-card">
        <div className="flex border-b border-border px-2">
          {(['overview', 'history'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 -mb-px ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {t === 'history' ? `Lifecycle History (${history.length})` : 'Overview'}
            </button>
          ))}
        </div>

        {tab === 'overview' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 text-sm">
            <div>
              <div className="font-medium text-text-primary mb-3">Technical Specifications</div>
              <dl className="flex flex-col gap-2">
                <Row k="Manufacturer" v={asset.manufacturer} />
                <Row k="Model" v={asset.model} />
                <Row k="Serial Number" v={asset.serialNumber} />
                <Row k="Service Tag" v={asset.serviceTag} />
              </dl>
            </div>
            <div>
              <div className="font-medium text-text-primary mb-3">Procurement & Financials</div>
              <dl className="flex flex-col gap-2">
                <Row k="Vendor" v={asset.vendor?.name} />
                <Row k="Purchase Order" v={asset.invoiceNumber} />
                <Row k="Original Cost" v={asset.originalCost ? `${asset.currency ?? ''} ${asset.originalCost}` : undefined} />
                <Row k="Funding Source" v={asset.fundingSource} />
              </dl>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
              {history.length === 0 && <div className="text-sm text-text-secondary">No history recorded yet.</div>}
              {history.map((h) => (
                <div key={h.id} className="relative mb-5 last:mb-0">
                  <span className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${EVENT_COLORS[h.eventType] ?? 'bg-text-secondary'}`} />
                  <div className="text-sm font-medium text-text-primary">{h.eventType.replace(/_/g, ' ')}</div>
                  <div className="text-sm text-text-secondary">{h.description}</div>
                  <div className="text-xs text-text-secondary mt-0.5">{new Date(h.eventDate).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-elevated w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {modal === 'transfer' ? 'Transfer Asset' : 'Process Return'}
            </h2>
            {error && <div className="mb-4 rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}
            {modal === 'transfer' ? (
              <>
                <label className="text-sm font-medium text-text-primary mb-1 block">Move to Room</label>
                <select className="h-11 rounded border border-border px-3 text-sm w-full mb-4" value={transferForm.toRoomId} onChange={(e) => setTransferForm((f) => ({ ...f, toRoomId: e.target.value }))}>
                  <option value="">No change</option>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <label className="text-sm font-medium text-text-primary mb-1 block">Reason</label>
                <input className="h-11 rounded border border-border px-3 text-sm w-full mb-6" value={transferForm.reason} onChange={(e) => setTransferForm((f) => ({ ...f, reason: e.target.value }))} />
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-text-primary mb-2 block">Condition on Return</label>
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setReturnCondition(c)}
                      className={`text-xs font-medium py-2 rounded border ${
                        returnCondition === c ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary hover:bg-canvas'
                      }`}
                    >
                      {c.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded border border-border text-sm">Cancel</button>
              <button disabled={submitting} onClick={modal === 'transfer' ? submitTransfer : submitReturn} className="px-4 py-2 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-60">
                {submitting ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string | number | null }) {
  return (
    <div className="flex justify-between border-b border-border/60 pb-2">
      <span className="text-text-secondary">{k}</span>
      <span className="font-medium text-text-primary">{v ?? '—'}</span>
    </div>
  );
}
