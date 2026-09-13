import { useEffect, useState, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import { api } from '../lib/api';

/**
 * Resolves a scanned QR code to the asset it encodes. A QR printed on an asset
 * encodes `{origin}/scan/{qrToken}`; opening that URL lands here, the token is
 * looked up via the backend scan endpoint, and the user is taken to the asset's
 * detail page (permission-scoped - if they can't view assets they'll get a 403).
 */
export function ScanAsset() {
  const { qrToken } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'found' | 'missing' | 'denied'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(qrToken ?? '');

  useEffect(() => {
    if (!qrToken) {
      setStatus('missing');
      return;
    }
    setStatus('loading');
    api
      .get(`/assets/scan/${encodeURIComponent(qrToken)}`)
      .then((res) => {
        setStatus('found');
        navigate(`/assets/${res.data.id}`);
      })
      .catch((err: any) => {
        if (err.response?.status === 403) setStatus('denied');
        else setStatus('missing');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrToken]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const raw = retryToken.trim();
    if (!raw) return;
    // Accept either a bare token or a pasted full scan URL.
    const token = raw.split('/scan/').pop() ?? raw;
    navigate(`/scan/${encodeURIComponent(token)}`);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-lg border border-border shadow-card p-8 text-center">
        <ScanLine size={40} className="text-primary mx-auto" />
        <h1 className="text-xl font-semibold text-text-primary mt-4">Scan result</h1>

        {status === 'loading' && <p className="text-text-secondary text-sm mt-3">Looking up asset for this code…</p>}

        {status === 'found' && <p className="text-success text-sm mt-3">Code matched — opening asset…</p>}

        {status === 'denied' && (
          <div className="mt-3 text-sm">
            <div className="text-critical">You don't have permission to view asset details.</div>
            <div className="text-text-secondary mt-2">Contact an administrator if you should have access.</div>
          </div>
        )}

        {status === 'missing' && (
          <div className="mt-3 text-sm">
            <div className="text-critical">No asset matched this code.</div>
            <div className="text-text-secondary mt-2">Check that the code is correct and try again, or use the box below.</div>
          </div>
        )}

        <form onSubmit={submit} className="flex gap-3 mt-6">
          <input
            value={retryToken}
            onChange={(e) => setRetryToken(e.target.value)}
            placeholder="Scan / paste QR token or full URL…"
            className="h-11 rounded border border-border px-3 text-sm w-full"
          />
          <button type="submit" className="px-4 h-11 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover shrink-0">Open</button>
        </form>

        <Link to="/assets" className="text-xs text-primary hover:underline mt-8 block">Browse the asset register instead</Link>
      </div>
    </div>
  );
}