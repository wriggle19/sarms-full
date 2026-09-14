import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Briefcase, Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetLoading(true);
    try {
      await api.post('/auth/password-reset/request', { email });
      setResetSent(true);
    } catch {
      setError('Could not send reset request.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <div className="h-14 flex items-center px-6 border-b border-border bg-white">
        <span className="w-6 h-6 rounded bg-primary text-white flex items-center justify-center text-xs font-bold mr-2">S</span>
        <span className="font-semibold text-text-primary">SARMS</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] bg-white rounded-lg shadow-elevated border border-border p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-lg bg-soft-accent flex items-center justify-center text-2xl font-bold text-primary mb-4">
              S
            </div>
            <span className="text-[11px] font-semibold tracking-wide text-primary bg-soft-accent px-2.5 py-1 rounded-full mb-3">
              UNIFIED STAFF GATEWAY
            </span>
            <h1 className="text-2xl font-semibold text-text-primary">Sign in to SARMS</h1>
            <p className="text-sm text-text-secondary mt-1">
              School Asset & Resource Management System
            </p>
          </div>

          <div className="flex gap-2 bg-soft-accent rounded p-3 mb-6 text-xs text-primary">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Authorized Personnel Only</div>
              <div className="text-primary/80">Active semester inventory & asset audit in progress</div>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded bg-critical-surface text-critical text-sm px-3 py-2">{error}</div>
          )}

          {resetSent && (
            <div className="mb-4 rounded bg-soft-accent text-primary text-sm px-3 py-2">
              If that account exists, a password-reset link has been posted to your in-app notifications
              (open the bell). The link is valid for 60 minutes.
            </div>
          )}

          {resetMode ? (
            <form onSubmit={requestReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-primary" htmlFor="reset-email">Staff Email</label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded border border-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
                  placeholder="you@school.org"
                />
              </div>
              <button
                type="submit"
                disabled={resetLoading}
                className="h-12 mt-2 rounded bg-primary text-white font-medium hover:bg-primary-hover disabled:opacity-60"
              >
                {resetLoading ? 'Sending…' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="text-sm text-text-secondary hover:text-text-primary underline"
              >
                Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-primary" htmlFor="email">Staff Email or ID</label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 w-full rounded border border-border pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
                    placeholder="you@school.org"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-primary" htmlFor="password">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded border border-border pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-tertiary"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="h-12 mt-2 rounded bg-primary text-white font-medium hover:bg-primary-hover active:bg-primary-active transition-colors disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign into SARMS'}
              </button>
              <button
                type="button"
                onClick={() => setResetMode(true)}
                className="text-sm text-text-secondary hover:text-text-primary underline"
              >
                Forgot password?
              </button>
            </form>
          )}

          <p className="text-center text-xs text-text-secondary mt-6">
            Teachers &nbsp;•&nbsp; Department Chairs &nbsp;•&nbsp; Facilities & Custodial
          </p>
        </div>
      </div>
      <div className="text-center text-xs text-text-secondary py-4 bg-white border-t border-border">
        SARMS Identity Access Management • Secured
      </div>
    </div>
  );
}
