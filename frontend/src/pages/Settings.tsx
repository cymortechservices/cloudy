import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { getTheme, setTheme } from '../app/theme';
import { StorageBar, type Usage } from '../components/StorageBar';
import { Modal } from '../components/Modal';
import { useToast } from '../app/Toast';

export default function SettingsPage() {
  const nav = useNavigate(); const toast = useToast();
  const [me, setMe] = useState<any>(null); const [u, setU] = useState<Usage | null>(null); const [name, setName] = useState(''); const [theme, setT] = useState(getTheme());
  const [confirm, setConfirm] = useState(false); const [typed, setTyped] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api('/me').then((m) => { setMe(m); setName(m.displayName); }).catch((e) => toast(e.message, 'err')); api('/storage/usage').then(setU).catch(() => {}); }, [toast]);
  const save = async () => { try { await api('/me', { method: 'PATCH', body: JSON.stringify({ displayName: name }) }); toast('Name updated.'); } catch (e: any) { toast(e.message, 'err'); } };
  const reset = async () => { const { error } = await supabase.auth.resetPasswordForEmail(me.email, { redirectTo: `${location.origin}/reset-password` }); error ? toast(error.message, 'err') : toast('Password reset email sent.'); };
  const del = async () => { setBusy(true); try { await api('/me', { method: 'DELETE' }); await supabase.auth.signOut(); nav('/'); } catch (e: any) { toast(e.message, 'err'); setBusy(false); } };
  if (!me) return <div className="card h-40 animate-pulse" aria-busy="true" />;
  return <div className="space-y-6 max-w-2xl"><h1 className="text-2xl font-bold">Settings</h1>
    <section className="card p-5 space-y-3"><h2 className="font-semibold">Profile</h2>
      <div><label className="label" htmlFor="dn">Display name</label><input id="dn" className="input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><span className="label">Email</span><div className="text-sm text-muted">{me.email}</div></div><button className="btn-primary" onClick={save}>Save name</button></section>
    {u && <section className="card p-5"><h2 className="font-semibold mb-3">Storage</h2><StorageBar u={u} /></section>}
    <section className="card p-5 space-y-3"><h2 className="font-semibold">Appearance</h2>
      <div className="flex gap-2">{(['dark', 'light'] as const).map((t) => <button key={t} className={theme === t ? 'btn-primary' : 'btn-ghost'} onClick={() => { setTheme(t); setT(t); }}>{t === 'dark' ? 'Dark' : 'Light'}</button>)}</div></section>
    <section className="card p-5 space-y-3"><h2 className="font-semibold">Account</h2>
      <div className="flex gap-2 flex-wrap"><button className="btn-ghost" onClick={reset}>Send password reset email</button><button className="btn-ghost" onClick={async () => { await supabase.auth.signOut(); nav('/'); }}>Sign out</button></div>
      <button className="btn-danger" onClick={() => setConfirm(true)}>Delete account…</button></section>
    {confirm && <Modal title="Delete account" onClose={() => setConfirm(false)}>
      <p className="text-sm">This permanently deletes your account and every file and folder in it. Stored objects are removed immediately and any that fail are retried automatically. This cannot be undone.</p>
      <label className="label mt-3" htmlFor="cf">Type DELETE to confirm</label><input id="cf" className="input" value={typed} onChange={(e) => setTyped(e.target.value)} />
      <div className="flex gap-2 mt-4 justify-end"><button className="btn-ghost" onClick={() => setConfirm(false)}>Cancel</button><button className="btn-danger" disabled={typed !== 'DELETE' || busy} onClick={del}>{busy ? 'Deleting…' : 'Delete everything'}</button></div></Modal>}</div>;
}
