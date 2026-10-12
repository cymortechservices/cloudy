import { supabase } from './supabase';
const BASE = import.meta.env.VITE_API_BASE_URL as string;
export class ApiFail extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1${path}`, { ...init, headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  } catch { throw new ApiFail(0, 'NETWORK', 'Cannot reach Cloudy. Check your connection (the server may be waking up — try again in a moment).'); }
  if (res.status === 401) { await supabase.auth.signOut(); throw new ApiFail(401, 'UNAUTHENTICATED', 'Your session expired. Please sign in again.'); }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiFail(res.status, body?.error?.code ?? 'ERROR', body?.error?.message ?? 'Something went wrong.');
  return body as T;
}

export function putWithProgress(url: string, file: File, headers: Record<string, string>, onProgress: (p: number) => void, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', url);
    Object.entries(headers).forEach(([k, v]) => x.setRequestHeader(k, v));
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`Storage rejected the upload (${x.status}).`)));
    x.onerror = () => reject(new Error('Network error during upload.'));
    signal.addEventListener('abort', () => { x.abort(); reject(new Error('Upload cancelled.')); });
    x.send(file);
  });
}
export const fmtBytes = (n: number) => { if (n < 1024) return `${n} B`; const u = ['KB', 'MB', 'GB', 'TB']; let i = -1; do { n /= 1024; i++; } while (n >= 1024 && i < 3); return `${n.toFixed(n < 10 ? 1 : 0)} ${u[i]}`; };
export const fmtDate = (s: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(s));
