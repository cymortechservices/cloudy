import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { useToast } from '../app/Toast';

const pw = z.string().min(10, 'At least 10 characters').regex(/[a-z]/, 'Add a lowercase letter').regex(/[A-Z]/, 'Add an uppercase letter').regex(/[0-9]/, 'Add a number');
const strength = (p: string) => [p.length >= 10, /[a-z]/.test(p), /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;

function Shell({ title, children }: { title: string; children: ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center p-4"><div className="w-full max-w-md">
    <Link to="/" className="flex justify-center mb-6" aria-label="Cloudy home"><Logo size={40} /></Link>
    <div className="card p-6"><h1 className="text-xl font-bold mb-4">{title}</h1>{children}</div>
    <p className="text-center text-xs text-muted mt-6">Powered by CymorTechServices</p></div></div>;
}
function PwField({ label, reg, error, auto }: { label: string; reg: any; error?: string; auto: string }) {
  const [show, setShow] = useState(false);
  return <div><label className="label">{label}
    <div className="relative mt-1"><input className="input pr-11" type={show ? 'text' : 'password'} autoComplete={auto} {...reg} />
      <button type="button" className="absolute right-1 top-1 w-10 h-10 grid place-items-center text-muted" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></label>
    {error && <p className="err" role="alert">{error}</p>}</div>;
}
const Err = ({ m }: { m?: string }) => (m ? <p className="err" role="alert">{m}</p> : null);

export function Login() {
  const nav = useNavigate(); const [err, setErr] = useState('');
  const f = useForm({ resolver: zodResolver(z.object({ email: z.string().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') })) });
  const submit = f.handleSubmit(async (v) => {
    setErr(''); const { error } = await supabase.auth.signInWithPassword(v);
    if (error) setErr(/confirm/i.test(error.message) ? 'Please verify your email first. Check your inbox.' : 'Incorrect email or password.'); else nav('/dashboard');
  });
  return <Shell title="Welcome back"><form onSubmit={submit} className="space-y-4" noValidate>
    <div><label className="label" htmlFor="e">Email</label><input id="e" className="input" type="email" autoComplete="email" {...f.register('email')} /><Err m={f.formState.errors.email?.message as string} /></div>
    <PwField label="Password" auto="current-password" reg={f.register('password')} error={f.formState.errors.password?.message as string} />
    <Err m={err} />
    <button className="btn-primary w-full" disabled={f.formState.isSubmitting}>{f.formState.isSubmitting ? 'Signing in…' : 'Sign in'}</button>
    <div className="flex justify-between text-sm"><Link to="/forgot-password" className="text-brand">Forgot password?</Link><Link to="/signup" className="text-brand">Create account</Link></div></form></Shell>;
}

export function Signup() {
  const nav = useNavigate(); const [err, setErr] = useState('');
  const f = useForm({ resolver: zodResolver(z.object({ name: z.string().trim().min(1, 'Enter your name').max(80), email: z.string().email('Enter a valid email'), password: pw, confirm: z.string() })
    .refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })) });
  const p = f.watch('password') ?? ''; const s = strength(p);
  const submit = f.handleSubmit(async (v) => {
    setErr('');
    const { error } = await supabase.auth.signUp({ email: v.email, password: v.password, options: { data: { display_name: v.name }, emailRedirectTo: `${location.origin}/login` } });
    if (error && !/already/i.test(error.message)) { setErr(error.message); return; }
    nav('/verify-email', { state: { email: v.email } }); // identical outcome for new and existing emails: no account enumeration
  });
  return <Shell title="Create your Cloudy account"><form onSubmit={submit} className="space-y-4" noValidate>
    <div><label className="label" htmlFor="n">Name</label><input id="n" className="input" autoComplete="name" {...f.register('name')} /><Err m={f.formState.errors.name?.message as string} /></div>
    <div><label className="label" htmlFor="e">Email</label><input id="e" className="input" type="email" autoComplete="email" {...f.register('email')} /><Err m={f.formState.errors.email?.message as string} /></div>
    <PwField label="Password" auto="new-password" reg={f.register('password')} error={f.formState.errors.password?.message as string} />
    <div aria-live="polite"><div className="h-1.5 rounded bg-line"><div className={`h-1.5 rounded ${s < 3 ? 'bg-red-500' : s < 5 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${(s / 5) * 100}%` }} /></div>
      <p className="text-xs text-muted mt-1">Use 10+ characters with upper and lower case letters and a number. A symbol makes it stronger.</p></div>
    <PwField label="Confirm password" auto="new-password" reg={f.register('confirm')} error={f.formState.errors.confirm?.message as string} />
    <Err m={err} />
    <button className="btn-primary w-full" disabled={f.formState.isSubmitting}>{f.formState.isSubmitting ? 'Creating…' : 'Create account'}</button>
    <p className="text-sm text-center">Already have an account? <Link to="/login" className="text-brand">Sign in</Link></p></form></Shell>;
}

export function VerifyEmail() {
  const email = (history.state?.usr?.email as string | undefined) ?? ''; const toast = useToast(); const [busy, setBusy] = useState(false);
  const resend = async () => { if (!email) return; setBusy(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${location.origin}/login` } });
    setBusy(false); error ? toast(error.message, 'err') : toast('Verification email sent.'); };
  return <Shell title="Check your email"><p className="text-sm text-muted">If this address can be registered, we've sent a verification link{email ? ` to ${email}` : ''}. Open it, then sign in.</p>
    <div className="mt-4 flex gap-2"><Link to="/login" className="btn-primary flex-1">Go to sign in</Link>{email && <button className="btn-ghost" onClick={resend} disabled={busy}>Resend</button>}</div></Shell>;
}

export function Forgot() {
  const [sent, setSent] = useState(false); const [err, setErr] = useState('');
  const f = useForm({ resolver: zodResolver(z.object({ email: z.string().email('Enter a valid email') })) });
  const submit = f.handleSubmit(async (v) => { setErr('');
    const { error } = await supabase.auth.resetPasswordForEmail(v.email, { redirectTo: `${location.origin}/reset-password` });
    error ? setErr(error.message) : setSent(true); });
  return <Shell title="Reset your password">{sent ? <p className="text-sm text-muted" role="status">If an account exists for that email, a reset link is on its way.</p> :
    <form onSubmit={submit} className="space-y-4" noValidate><div><label className="label" htmlFor="e">Email</label><input id="e" className="input" type="email" {...f.register('email')} /><Err m={f.formState.errors.email?.message as string} /></div>
      <Err m={err} /><button className="btn-primary w-full" disabled={f.formState.isSubmitting}>Send reset link</button></form>}
    <p className="text-sm text-center mt-4"><Link to="/login" className="text-brand">Back to sign in</Link></p></Shell>;
}

export function Reset() {
  const nav = useNavigate(); const toast = useToast(); const [err, setErr] = useState('');
  const f = useForm({ resolver: zodResolver(z.object({ password: pw, confirm: z.string() }).refine((d) => d.password === d.confirm, { path: ['confirm'], message: 'Passwords do not match' })) });
  const submit = f.handleSubmit(async (v) => { setErr('');
    const { error } = await supabase.auth.updateUser({ password: v.password });
    if (error) { setErr(error.message); return; } toast('Password updated.'); nav('/dashboard'); });
  return <Shell title="Choose a new password"><form onSubmit={submit} className="space-y-4" noValidate>
    <PwField label="New password" auto="new-password" reg={f.register('password')} error={f.formState.errors.password?.message as string} />
    <PwField label="Confirm password" auto="new-password" reg={f.register('confirm')} error={f.formState.errors.confirm?.message as string} />
    <Err m={err} /><button className="btn-primary w-full" disabled={f.formState.isSubmitting}>Update password</button>
    <p className="text-xs text-muted">Open this page from the link in your reset email.</p></form></Shell>;
}
