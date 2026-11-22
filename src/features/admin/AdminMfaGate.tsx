import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../../services/http/apiConfig';

type MfaStatus = { enabled: boolean; stepUpValid: boolean };
type MfaRequestError = Error & { status?: number; code?: string; correlationId?: string };
type Enrollment = { secret: string; otpauthUri: string };

type Props = { children: React.ReactNode };

export const AdminMfaGate: React.FC<Props> = ({ children }) => {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const request = useCallback(async (path: string, method = 'GET', payload?: unknown) => {
    const correlationId = 'admin-mfa-' + (window.crypto?.randomUUID?.() || (Date.now() + '-' + Math.random().toString(36).slice(2, 10)));
    const response = await fetch(API_BASE_URL + path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Correlation-ID': correlationId,
        ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const failure = new Error(data.message || ('Administrator verification failed (HTTP ' + response.status + ').')) as MfaRequestError;
      failure.status = response.status;
      failure.code = data.code || data.errorCode;
      failure.correlationId = response.headers.get('X-Correlation-ID') || correlationId;
      throw failure;
    }
    return data;
  }, []);

  const refreshStatus = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const next = await request('/admin/mfa/status');
      setStatus({ enabled: Boolean(next.enabled), stepUpValid: Boolean(next.stepUpValid) });
      setError('');
    } catch (cause: any) {
      const statusText = Number.isInteger(cause?.status) ? ' (HTTP ' + cause.status + (cause.code ? ' · ' + cause.code : '') + ')' : '';
      const reference = cause?.correlationId ? ' Reference: ' + cause.correlationId : '';
      setError((cause?.message || 'Unable to verify administrator security status.') + statusText + reference);
      setStatus(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void refreshStatus(true);
    const interval = window.setInterval(() => void refreshStatus(false), 30000);
    const requireMfa = () => setStatus(previous => previous ? { ...previous, stepUpValid: false } : previous);
    window.addEventListener('ku-admin-mfa-required', requireMfa);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('ku-admin-mfa-required', requireMfa);
    };
  }, [refreshStatus]);

  const beginEnrollment = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await request('/admin/mfa/enroll', 'POST');
      setEnrollment({ secret: result.secret, otpauthUri: result.otpauthUri });
    } catch (cause: any) {
      setError(cause?.message || 'Unable to start authenticator enrollment.');
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try {
      if (status?.enabled) {
        await request('/admin/mfa/verify', 'POST', { code: code.trim() });
      } else {
        const result = await request('/admin/mfa/confirm', 'POST', { code: code.trim() });
        setRecoveryCodes(Array.isArray(result.recoveryCodes) ? result.recoveryCodes : []);
        setEnrollment(null);
      }
      setCode('');
      await refreshStatus(false);
    } catch (cause: any) {
      setError(cause?.message || 'The authenticator code could not be verified.');
    } finally {
      setBusy(false);
    }
  };

  const copyRecoveryCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    } catch {
      setError('Clipboard access is unavailable. Copy the recovery codes manually before continuing.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 text-sm text-white" role="status">Checking administrator security…</div>;
  }

  if (status?.enabled && status.stepUpValid && recoveryCodes.length === 0) return <>{children}</>;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-5">
      <section className="w-full max-w-xl rounded-3xl border border-slate-700 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-800" aria-hidden="true">🔐</div>
          <div>
            <h1 className="text-lg font-black text-slate-950">Administrator verification</h1>
            <p className="text-xs text-slate-500">A fresh authenticator check protects privileged operations.</p>
          </div>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

        {recoveryCodes.length > 0 ? (
          <div className="mt-6 space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900">Save your one-time recovery codes</h2>
            <p className="text-xs leading-5 text-slate-600">Each code can be used once if you lose access to your authenticator. They will not be shown again.</p>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-4 font-mono text-sm">
              {recoveryCodes.map(value => <span key={value}>{value}</span>)}
            </div>
            <button type="button" onClick={() => void copyRecoveryCodes()} className="min-h-11 w-full rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-800">Copy recovery codes</button>
            <button type="button" onClick={() => { setRecoveryCodes([]); void refreshStatus(false); }} className="min-h-11 w-full rounded-xl bg-violet-700 px-4 text-sm font-bold text-white">I have saved these codes</button>
          </div>
        ) : !status ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-700">Your administrator session could not be verified. Sign in again or reload this portal.</p>
            <button type="button" onClick={() => void refreshStatus(true)} className="min-h-11 w-full rounded-xl bg-violet-700 px-4 text-sm font-bold text-white">Retry verification</button>
          </div>
        ) : !status.enabled && !enrollment ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-slate-700">Set up a TOTP authenticator before opening the admin workspace. Use an authenticator app that supports 6-digit codes with a 30-second period.</p>
            <button type="button" disabled={busy} onClick={() => void beginEnrollment()} className="min-h-12 w-full rounded-xl bg-violet-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Preparing setup…' : 'Set up authenticator'}</button>
          </div>
        ) : (
          <form onSubmit={submitCode} className="mt-6 space-y-4">
            {enrollment && (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="text-sm font-extrabold text-slate-900">Add KuraliUpdates to your authenticator</h2>
                <p className="text-xs leading-5 text-slate-600">Choose “Enter setup key manually” in your authenticator app, then enter this secret. Account type: time-based (TOTP), SHA-1, 6 digits, 30 seconds.</p>
                <div className="break-all rounded-xl bg-white p-3 font-mono text-sm font-bold tracking-wider text-slate-900">{enrollment.secret}</div>
                <p className="break-all text-[11px] text-slate-500">{enrollment.otpauthUri}</p>
              </div>
            )}
            <label className="block text-sm font-bold text-slate-800">
              {status.enabled ? 'Authenticator or recovery code' : '6-digit authenticator code'}
              <input
                value={code}
                onChange={event => setCode(event.target.value)}
                autoComplete="one-time-code"
                inputMode="text"
                maxLength={40}
                placeholder={status.enabled ? '123456 or recovery code' : '123456'}
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 font-mono text-lg tracking-widest outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <button type="submit" disabled={busy || !code.trim()} className="min-h-12 w-full rounded-xl bg-violet-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Verifying…' : enrollment ? 'Confirm and enable MFA' : 'Verify and open admin workspace'}</button>
          </form>
        )}
      </section>
    </main>
  );
};
