import { useState } from 'react';
import { FileUp } from 'lucide-react';
import { api } from '../lib/api';

export function Imports() {
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Expected columns (CSV header row): name,categoryId,serialNumber,model,manufacturer,owningDepartmentId,responsibleDepartmentId,originalCost,currency,statusCode,conditionCode
  const TEMPLATE = `name,categoryId,serialNumber,model,manufacturer,owningDepartmentId,responsibleDepartmentId,originalCost,currency,statusCode,conditionCode
Dell Latitude 5440,1,SN-10001,Latitude 5440,Dell,1,1,850,USD,AVAILABLE,GOOD`;

  const run = async (commit: boolean) => {
    setError(null); setResult(null);
    setLoading(true);
    try {
      const res = await api.post(`/imports/assets`, { csv }, { params: commit ? { commit: 'true' } : {} });
      if (commit) { setResult(res.data); setPreview(null); }
      else setPreview(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
          <FileUp size={22} /> Asset Import
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Paste CSV data to migrate existing spreadsheets. Preview first — nothing is written until you confirm.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-card p-5">
        <div className="text-xs text-text-secondary mb-2">Expected columns (header row required):</div>
        <pre className="text-[11px] bg-canvas rounded p-3 overflow-x-auto whitespace-pre-wrap">{TEMPLATE}</pre>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={10}
          className="mt-3 w-full rounded border border-border p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-tertiary"
          placeholder="Paste CSV here…"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={() => run(false)} disabled={loading || !csv.trim()} className="h-10 px-4 rounded border border-border text-sm font-medium hover:bg-canvas disabled:opacity-50">
            {loading ? 'Loading…' : 'Preview'}
          </button>
          <button onClick={() => run(true)} disabled={loading || !csv.trim()} className="h-10 px-4 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-50">
            Commit import
          </button>
        </div>
      </div>

      {error && <div className="rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>}

      {result && (
        <div className="bg-white rounded-lg border border-border shadow-card p-5 text-sm">
          <div className="font-medium text-text-primary mb-2">Import result</div>
          <pre className="text-xs bg-canvas rounded p-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {preview && (
        <div className="bg-white rounded-lg border border-border shadow-card p-5 text-sm">
          <div className="font-medium text-text-primary mb-2">Preview</div>
          <pre className="text-xs bg-canvas rounded p-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(preview, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}