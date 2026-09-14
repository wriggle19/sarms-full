import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { api } from '../lib/api';

const TYPES = ['NEW_EQUIPMENT','TEMPORARY_LOAN','LONG_TERM_ASSIGNMENT','ACADEMIC_YEAR_ASSIGNMENT','CLASSROOM_EQUIPMENT','DEPARTMENT_EQUIPMENT','REPLACEMENT','REPAIR','TRANSFER','RETURN','ACCESSORY','OTHER'];
const APPROVERS = ['LINE_MANAGER','DEPARTMENT_HEAD','ROLE','SPECIFIC_USER'];

export function WorkflowsTab() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [appliesToRequestType, setAppliesToRequestType] = useState('');
  const [steps, setSteps] = useState<{ stepOrder: number; approverType: string }[]>([{ stepOrder: 1, approverType: 'LINE_MANAGER' }]);
  const [msg, setMsg] = useState<string | null>(null);

  const [sequences, setSequences] = useState<any[]>([]);
  const [seqMsg, setSeqMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  useEffect(() => { loadWorkflows(); loadSequences(); }, []);

  const loadWorkflows = () => api.get('/approval-workflows').then((r) => setWorkflows(r.data)).catch(() => {});
  const loadSequences = () => api.get('/sequences').then((r) => setSequences(r.data)).catch(() => {});

  const addStep = () => setSteps((s) => [...s, { stepOrder: s.length + 1, approverType: 'LINE_MANAGER' }]);
  const setStep = (i: number, patch: Partial<{ approverType: string }>) =>
    setSteps((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const create = async () => {
    setMsg(null);
    try {
      await api.post('/approval-workflows', {
        name,
        appliesToRequestType: appliesToRequestType || undefined,
        steps: steps.map((s) => ({ stepOrder: s.stepOrder, approverType: s.approverType })),
      });
      setName(''); setSteps([{ stepOrder: 1, approverType: 'LINE_MANAGER' }]); setAppliesToRequestType('');
      setMsg('Workflow created.');
      loadWorkflows();
    } catch (err: any) { setMsg(err.response?.data?.message ?? 'Create failed.'); }
  };

  const resetSequence = async (prefix: string) => {
    if (!confirm(`Reset the "${prefix}" counter? The next generated number will restart from 1. This cannot be undone.`)) return;
    setResetting(prefix);
    setSeqMsg(null);
    try {
      await api.patch(`/sequences/${prefix}`, { lastNumber: 0 });
      setSeqMsg(`"${prefix}" counter reset to 0. Next number will be 1.`);
      loadSequences();
    } catch (err: any) {
      setSeqMsg(err.response?.data?.message ?? 'Reset failed.');
    } finally {
      setResetting(null);
    }
  };

  // Group sequences by prefix for a cleaner display
  const byPrefix = sequences.reduce<Record<string, any[]>>((acc, s) => {
    (acc[s.prefix] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {/* ── Approval workflows ── */}
      <div>
        <div className="font-semibold text-text-primary mb-3">Approval workflows</div>
        {msg && <div className="rounded bg-soft-accent text-primary text-sm px-3 py-2 mb-3">{msg}</div>}

        <div className="bg-white rounded-lg border border-border shadow-card p-5 flex flex-col gap-3 mb-4">
          <div className="font-medium text-text-primary text-sm">New workflow</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workflow name (e.g. Laptop request)"
              className="h-10 rounded border border-border px-3 text-sm" />
            <select value={appliesToRequestType} onChange={(e) => setAppliesToRequestType(e.target.value)}
              className="h-10 rounded border border-border px-3 text-sm bg-white">
              <option value="">All request types (default)</option>
              {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-6 h-6 rounded-full bg-soft-accent text-primary flex items-center justify-center text-xs font-semibold">{s.stepOrder}</span>
                <select value={s.approverType} onChange={(e) => setStep(i, { approverType: e.target.value })} className="h-10 rounded border border-border px-3 text-sm bg-white">
                  {APPROVERS.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
                </select>
                <button onClick={() => setSteps((st) => st.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, stepOrder: idx + 1 })))} className="text-text-secondary hover:text-critical text-xs">remove</button>
              </div>
            ))}
            <button onClick={addStep} className="self-start text-sm text-primary hover:underline">+ Add step</button>
          </div>
          <button onClick={create} disabled={!name.trim()} className="self-start h-9 px-4 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50">Create workflow</button>
        </div>

        <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
          {workflows.length === 0 && <div className="px-5 py-6 text-sm text-text-secondary">No workflows configured.</div>}
          {workflows.map((w) => (
            <div key={w.id} className="px-5 py-3 text-sm">
              <div className="font-medium text-text-primary">{w.name}
                {w.appliesToRequestType && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-soft-accent text-primary">{w.appliesToRequestType.replace(/_/g, ' ')}</span>}
              </div>
              <div className="text-text-secondary text-xs mt-1">
                {w.steps?.map((st: any) => st.approverType.replace(/_/g, ' ')).join(' → ') || 'No steps'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Numbering schemes ── */}
      <div>
        <div className="font-semibold text-text-primary mb-1">Numbering schemes</div>
        <p className="text-xs text-text-secondary mb-3">
          Each prefix tracks the last issued number. Resetting a counter restarts it from 1 on the next issuance.
          Asset tags (e.g. LAP-000042) are not year-scoped; requests and POs are (e.g. REQ-2026-000001).
        </p>
        {seqMsg && <div className="rounded bg-soft-accent text-primary text-sm px-3 py-2 mb-3">{seqMsg}</div>}

        <div className="bg-white rounded-lg border border-border shadow-card divide-y divide-border">
          {Object.keys(byPrefix).length === 0 && (
            <div className="px-5 py-6 text-sm text-text-secondary">No sequences yet — they are created automatically on first use.</div>
          )}
          {Object.entries(byPrefix).map(([prefix, rows]) => (
            <div key={prefix} className="px-5 py-3 flex items-center justify-between gap-4">
              <div>
                <div className="font-medium text-text-primary text-sm">{prefix}</div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {rows.map((r) => (
                    <span key={r.id} className="mr-3">
                      {r.year ? `${r.year}: ` : 'All years: '}
                      <span className="font-mono">{String(r.lastNumber).padStart(6, '0')}</span>
                      {' '}(next: <span className="font-mono">{String(r.lastNumber + 1).padStart(6, '0')}</span>)
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => resetSequence(prefix)}
                disabled={resetting === prefix}
                title={`Reset ${prefix} counter`}
                className="flex items-center gap-1.5 h-8 px-3 rounded border border-border text-xs text-text-secondary hover:text-critical hover:border-critical disabled:opacity-50 shrink-0"
              >
                <RotateCcw size={13} />
                Reset
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
