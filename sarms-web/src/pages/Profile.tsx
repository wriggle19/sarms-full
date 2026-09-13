import { FormEvent, useEffect, useState } from 'react';
import { Camera, Lock, User as UserIcon } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const inputClass = 'h-11 rounded border border-border px-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-tertiary';

export function Profile() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [changing, setChanging] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => {
    setLoading(true);
    api
      .get('/auth/me')
      .then((res) => {
        setProfile(res.data);
        setFullName(res.data.fullName ?? '');
        setPhone(res.data.phone ?? '');
        setPhotoUrl(res.data.profilePhotoUrl ?? '');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);
    try {
      const res = await api.patch('/auth/me', {
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        profilePhotoUrl: photoUrl.trim() || undefined,
      });
      setProfile((p: any) => ({ ...p, ...res.data }));
      await refreshUser();
      setProfileMsg({ ok: true, text: 'Profile updated.' });
    } catch (err: any) {
      setProfileMsg({ ok: false, text: err.response?.data?.message ?? 'Could not update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) {
      setPwMsg({ ok: false, text: 'New passwords do not match.' });
      return;
    }
    if (pw.next.length < 8) {
      setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' });
      return;
    }
    setChanging(true);
    try {
      const res = await api.post('/auth/me/change-password', {
        currentPassword: pw.current,
        newPassword: pw.next,
      });
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg({ ok: true, text: res.data?.message ?? 'Password changed successfully.' });
    } catch (err: any) {
      setPwMsg({ ok: false, text: err.response?.data?.message ?? 'Could not change password.' });
    } finally {
      setChanging(false);
    }
  };

  if (loading) return <div className="text-text-secondary">Loading profile…</div>;

  const roles = profile?.roles?.map((r: any) => r.role?.name).filter(Boolean) ?? [];
  const initials = (profile?.fullName ?? '?')
    .split(' ')
    .map((p: string) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarSrc = photoUrl.trim() || profile?.profilePhotoUrl;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">My Profile</h1>
        <p className="text-text-secondary text-sm mt-1">View and manage your account details.</p>
      </div>

      <div className="bg-white rounded-lg border border-border shadow-card p-6 flex items-center gap-5">
        {avatarSrc ? (
          <img src={avatarSrc} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-border" />
        ) : (
          <span className="w-16 h-16 rounded-full bg-tertiary flex items-center justify-center text-lg font-semibold text-white shrink-0">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-lg font-semibold text-text-primary truncate">{profile?.fullName}</div>
          <div className="text-sm text-text-secondary truncate">{profile?.email}</div>
          <div className="text-xs text-text-secondary mt-1">
            {roles.length > 0 ? roles.join(', ') : 'No roles'}
            {profile?.department ? ` · ${profile.department.name}` : ''}
            {profile?.employeeId ? ` · ${profile.employeeId}` : ''}
          </div>
        </div>
      </div>

      <form onSubmit={saveProfile} className="bg-white rounded-lg border border-border shadow-card p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 font-medium text-text-primary">
          <UserIcon size={17} className="text-primary" /> Edit profile
        </div>
        {profileMsg && (
          <div className={`rounded text-sm px-3 py-2 ${profileMsg.ok ? 'bg-soft-accent text-primary' : 'bg-critical-surface text-critical'}`}>
            {profileMsg.text}
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Full name</label>
          <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Phone</label>
          <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. +233 20 000 0000" />
        </div>
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 flex items-center gap-1.5">
            <Camera size={15} className="text-text-secondary" /> Profile photo URL
          </label>
          <input className={inputClass} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
          <p className="text-xs text-text-secondary mt-1">Paste a link to your photo — it appears here and in the sidebar.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-text-secondary mb-0.5">Email (managed by admin)</div>
            <div className="font-medium text-text-primary">{profile?.email}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-0.5">Department (managed by admin)</div>
            <div className="font-medium text-text-primary">{profile?.department?.name ?? '—'}</div>
          </div>
        </div>
        <div>
          <button type="submit" disabled={saving} className="px-6 h-11 rounded bg-primary text-white text-sm font-medium hover:bg-primary-hover disabled:opacity-60">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="bg-white rounded-lg border border-border shadow-card p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 font-medium text-text-primary">
          <Lock size={17} className="text-primary" /> Change password
        </div>
        {pwMsg && (
          <div className={`rounded text-sm px-3 py-2 ${pwMsg.ok ? 'bg-soft-accent text-primary' : 'bg-critical-surface text-critical'}`}>
            {pwMsg.text}
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-text-primary mb-1 block">Current password</label>
          <input type="password" className={inputClass} value={pw.current} onChange={(e) => setPw((s) => ({ ...s, current: e.target.value }))} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-text-primary mb-1 block">New password</label>
            <input type="password" className={inputClass} value={pw.next} onChange={(e) => setPw((s) => ({ ...s, next: e.target.value }))} required minLength={8} />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary mb-1 block">Confirm new password</label>
            <input type="password" className={inputClass} value={pw.confirm} onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))} required minLength={8} />
          </div>
        </div>
        <div>
          <button type="submit" disabled={changing} className="px-6 h-11 rounded border border-border text-sm font-medium hover:bg-canvas disabled:opacity-60">
            {changing ? 'Changing…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
}

