import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownAZ, ChevronRight, Download, Eye, FolderIcon, FolderPlus, MoreVertical, Pencil, FolderInput, RotateCw, Search, Trash2, Upload, X } from 'lucide-react';
import { api, fmtBytes, fmtDate, putWithProgress, ApiFail } from '../lib/api';
import { FileIcon } from '../components/FileIcon';
import { Modal } from '../components/Modal';
import { StorageBar, type Usage } from '../components/StorageBar';
import { useToast } from '../app/Toast';

type F = { id: string; folder_id: string | null; original_name: string; file_extension: string; size_bytes: number; created_at: string; mime_type: string };
type Fo = { id: string; name: string; parent_id: string | null };
type Q = { id: string; file: File; name: string; progress: number; status: 'queued' | 'uploading' | 'done' | 'error'; error?: string; ctrl?: AbortController };
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.webp';
const TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'jpg', 'png', 'webp'];
const MIME: Record<string, string> = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', txt: 'text/plain', csv: 'text/csv', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const mimeOf = (f: File) => { const e = f.name.split('.').pop()?.toLowerCase() ?? ''; return MIME[e] ?? f.type; };

export default function Files() {
  const toast = useToast(); const [sp, setSp] = useSearchParams(); const folderId = sp.get('folder');
  const [files, setFiles] = useState<F[]>([]); const [total, setTotal] = useState(0); const [folders, setFolders] = useState<Fo[]>([]); const [usage, setUsage] = useState<Usage | null>(null);
  const [q, setQ] = useState(''); const [dq, setDq] = useState(''); const [sort, setSort] = useState('created_at'); const [dir, setDir] = useState('desc'); const [type, setType] = useState('');
  const [loading, setLoading] = useState(true); const [err, setErr] = useState(''); const [sel, setSel] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<Q[]>([]); const [drag, setDrag] = useState(false);
  const [modal, setModal] = useState<null | { k: 'newfolder' } | { k: 'rename'; file?: F; folder?: Fo } | { k: 'move'; file: F } | { k: 'delete'; ids: string[]; folder?: Fo } | { k: 'preview'; file: F }>(null);
  const [menu, setMenu] = useState<string | null>(null); const input = useRef<HTMLInputElement>(null); const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const load = useCallback(async (offset = 0) => {
    setLoading(offset === 0); setErr('');
    try {
      const p = new URLSearchParams({ sort, dir, limit: '50', offset: String(offset) });
      if (dq) p.set('q', dq); else p.set('folderId', folderId ?? 'root'); if (type) p.set('type', type);
      const [r, fo, u] = await Promise.all([api(`/files?${p}`), api('/folders'), api('/storage/usage')]);
      setFiles((prev) => (offset ? [...prev, ...r.items] : r.items)); setTotal(r.total); setFolders(fo.items); setUsage(u);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }, [dq, folderId, sort, dir, type]);
  useEffect(() => { load(); setSel(new Set()); }, [load]);
  useEffect(() => { if (sp.get('upload')) input.current?.click(); if (sp.get('newfolder')) setModal({ k: 'newfolder' }); const o = sp.get('open'); if (o) api(`/files/${o}`).then((f) => setModal({ k: 'preview', file: f })).catch(() => {}); }, []); // eslint-disable-line

  const crumbs: Fo[] = []; for (let c = folders.find((f) => f.id === folderId); c; c = folders.find((f) => f.id === c!.parent_id)) crumbs.unshift(c);
  const subs = dq ? [] : folders.filter((f) => f.parent_id === (folderId ?? null));
  const go = (id: string | null) => { setQ(''); setSp(id ? { folder: id } : {}); };

  const patch = (id: string, p: Partial<Q>) => setQueue((qs) => qs.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const uniqueName = (n: string) => { const names = new Set(files.map((f) => f.original_name.toLowerCase())); if (!names.has(n.toLowerCase())) return n; const i = n.lastIndexOf('.'); const [b, e] = i > 0 ? [n.slice(0, i), n.slice(i)] : [n, '']; let k = 1; while (names.has(`${b} (${k})${e}`.toLowerCase())) k++; return `${b} (${k})${e}`; };
  const run = async (item: Q) => {
    if (!navigator.onLine) { patch(item.id, { status: 'error', error: 'You are offline.' }); return; }
    const ctrl = new AbortController(); patch(item.id, { status: 'uploading', progress: 0, error: undefined, ctrl }); let fileId = '';
    try {
      const it = await api('/files/upload-intent', { method: 'POST', body: JSON.stringify({ name: item.name, mimeType: mimeOf(item.file), size: item.file.size, folderId }) });
      fileId = it.fileId;
      await putWithProgress(it.uploadUrl, new File([item.file], item.name, { type: mimeOf(item.file) }), it.headers, it.mode, (p) => patch(item.id, { progress: p }), ctrl.signal);
      await api(`/files/${fileId}/complete-upload`, { method: 'POST' });
      patch(item.id, { status: 'done', progress: 1 }); load();
    } catch (e: any) {
      if (fileId) api(`/files/${fileId}/cancel-upload`, { method: 'POST' }).catch(() => {});
      patch(item.id, { status: 'error', error: e instanceof ApiFail ? e.message : e.message || 'Upload failed.' });
    }
  };
  const add = (list: FileList | File[]) => {
    const items: Q[] = Array.from(list).map((file) => ({ id: crypto.randomUUID(), file, name: uniqueName(file.name), progress: 0, status: 'queued' as const }));
    setQueue((x) => [...items, ...x]); items.forEach(run);
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); toast(ok); setModal(null); load(); } catch (e: any) { toast(e.message, 'err'); } };
  const open = async (f: F, download: boolean) => { try { const r = await api(`/files/${f.id}/${download ? 'download' : 'preview'}`); if (download) location.assign(r.url); else setModal({ k: 'preview', file: { ...f, ...{ _url: r.url } } as any }); } catch (e: any) { toast(e.message, 'err'); } };
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return <div className={`space-y-4 ${drag ? 'ring-2 ring-brand rounded-2xl' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h1 className="text-2xl font-bold">Files</h1>
      <div className="flex gap-2"><button className="btn-ghost" onClick={() => setModal({ k: 'newfolder' })}><FolderPlus className="w-4 h-4" />New folder</button>
        <button className="btn-primary" onClick={() => input.current?.click()}><Upload className="w-4 h-4" />Upload</button>
        <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" aria-label="Choose files to upload" onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ''; }} /></div></div>
    {usage && usage.percentUsed >= 80 && <StorageBar u={usage} />}
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-sm"><button className="text-brand" onClick={() => go(null)}>All files</button>
      {crumbs.map((c) => <span key={c.id} className="flex items-center gap-1"><ChevronRight className="w-4 h-4 text-muted" /><button className="text-brand" onClick={() => go(c.id)}>{c.name}</button></span>)}</nav>
    <div className="flex flex-wrap gap-2">
      <div className="relative flex-1 min-w-[180px]"><Search className="w-4 h-4 absolute left-3 top-3.5 text-muted" aria-hidden /><input className="input pl-9" placeholder="Search all files by name" aria-label="Search files" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <select className="input !w-auto" aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select>
      <select className="input !w-auto" aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)}><option value="created_at">Date</option><option value="name">Name</option><option value="size">Size</option><option value="file_extension">Type</option></select>
      <button className="btn-ghost" onClick={() => setDir(dir === 'asc' ? 'desc' : 'asc')} aria-label={`Sort ${dir === 'asc' ? 'descending' : 'ascending'}`}><ArrowDownAZ className="w-4 h-4" />{dir === 'asc' ? 'Asc' : 'Desc'}</button></div>

    {queue.length > 0 && <div className="card p-3 space-y-2" aria-live="polite">{queue.slice(0, 8).map((x) => <div key={x.id} className="text-sm"><div className="flex items-center gap-2"><span className="truncate flex-1">{x.name}</span>
      <span className={x.status === 'error' ? 'text-red-500' : 'text-muted'}>{x.status === 'done' ? 'Uploaded' : x.status === 'error' ? 'Failed' : x.status === 'queued' ? 'Waiting' : `${Math.round(x.progress * 100)}%`}</span>
      {x.status === 'uploading' && <button className="p-2" aria-label={`Cancel ${x.name}`} onClick={() => x.ctrl?.abort()}><X className="w-4 h-4" /></button>}
      {x.status === 'error' && <button className="p-2" aria-label={`Retry ${x.name}`} onClick={() => run(x)}><RotateCw className="w-4 h-4" /></button>}</div>
      {x.status === 'uploading' && <div className="h-1.5 rounded bg-line"><div className="h-1.5 rounded bg-brand" style={{ width: `${x.progress * 100}%` }} /></div>}{x.error && <p className="err">{x.error}</p>}</div>)}
      <button className="text-xs text-muted" onClick={() => setQueue((x) => x.filter((i) => i.status === 'uploading' || i.status === 'queued'))}>Clear finished</button></div>}

    {sel.size > 0 && <div className="card p-3 flex items-center gap-3"><span className="text-sm">{sel.size} selected</span><button className="btn-danger !min-h-[36px]" onClick={() => setModal({ k: 'delete', ids: [...sel] })}><Trash2 className="w-4 h-4" />Delete</button><button className="btn-ghost !min-h-[36px]" onClick={() => setSel(new Set())}>Clear</button></div>}

    {err && <div className="card p-4" role="alert">{err} <button className="text-brand" onClick={() => load()}>Retry</button></div>}
    {subs.length > 0 && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{subs.map((f) => <div key={f.id} className="card p-3 flex items-center gap-2">
      <button className="flex items-center gap-2 flex-1 min-w-0 min-h-[44px] text-left" onClick={() => go(f.id)}><FolderIcon className="w-5 h-5 text-brand shrink-0" /><span className="truncate text-sm font-medium">{f.name}</span></button>
      <button className="p-2" aria-label={`Rename folder ${f.name}`} onClick={() => setModal({ k: 'rename', folder: f })}><Pencil className="w-4 h-4" /></button>
      <button className="p-2" aria-label={`Delete folder ${f.name}`} onClick={() => setModal({ k: 'delete', ids: [], folder: f })}><Trash2 className="w-4 h-4" /></button></div>)}</div>}

    <div className="card">{loading ? <div className="p-4 space-y-3" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-line animate-pulse" />)}</div> :
      files.length === 0 ? <div className="p-10 text-center text-muted"><Upload className="w-8 h-8 mx-auto mb-2" aria-hidden /><p>{dq || type ? 'No files match your search.' : 'No files here yet. Drag files onto this page or tap Upload.'}</p></div> :
        <ul className="divide-y divide-line">{files.map((f) => <li key={f.id} className="flex items-center gap-3 px-3 py-2 min-h-[60px]">
          <input type="checkbox" className="w-5 h-5" checked={sel.has(f.id)} onChange={() => toggle(f.id)} aria-label={`Select ${f.original_name}`} />
          <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => open(f, false)}><FileIcon ext={f.file_extension} />
            <span className="min-w-0"><span className="block truncate text-sm font-medium">{f.original_name}</span><span className="block text-xs text-muted">{f.file_extension.toUpperCase()} · {fmtBytes(f.size_bytes)} · {fmtDate(f.created_at)}</span></span></button>
          <div className="relative"><button className="p-2" aria-label={`Actions for ${f.original_name}`} aria-haspopup="menu" aria-expanded={menu === f.id} onClick={() => setMenu(menu === f.id ? null : f.id)}><MoreVertical className="w-5 h-5" /></button>
            {menu === f.id && <div role="menu" className="absolute right-0 z-20 card p-1 w-44" onClick={() => setMenu(null)}>
              {[[Eye, 'Preview', () => open(f, false)], [Download, 'Download', () => open(f, true)], [Pencil, 'Rename', () => setModal({ k: 'rename', file: f })], [FolderInput, 'Move', () => setModal({ k: 'move', file: f })], [Trash2, 'Delete', () => setModal({ k: 'delete', ids: [f.id] })]].map(([I, l, fn]: any) => <button key={l} role="menuitem" className="w-full flex items-center gap-2 px-3 min-h-[40px] text-sm rounded-lg hover:bg-line/50" onClick={fn}><I className="w-4 h-4" />{l}</button>)}</div>}</div></li>)}</ul>}
      {files.length < total && <div className="p-3 text-center"><button className="btn-ghost" onClick={() => load(files.length)}>Load more</button></div>}</div>

    {modal?.k === 'newfolder' && <Modal title="New folder" onClose={() => setModal(null)}><form onSubmit={(e) => { e.preventDefault(); const n = nameRef.current!.value.trim(); if (n) act(() => api('/folders', { method: 'POST', body: JSON.stringify({ name: n, parentId: folderId }) }), 'Folder created.'); }}>
      <label className="label" htmlFor="fn">Folder name</label><input id="fn" ref={nameRef} className="input" maxLength={120} autoFocus /><div className="flex justify-end gap-2 mt-4"><button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn-primary">Create</button></div></form></Modal>}
    {modal?.k === 'rename' && <Modal title="Rename" onClose={() => setModal(null)}><form onSubmit={(e) => { e.preventDefault(); const n = nameRef.current!.value.trim(); if (!n) return; const m = modal as any;
      act(() => (m.file ? api(`/files/${m.file.id}`, { method: 'PATCH', body: JSON.stringify({ name: n }) }) : api(`/folders/${m.folder.id}`, { method: 'PATCH', body: JSON.stringify({ name: n }) })), 'Renamed.'); }}>
      <label className="label" htmlFor="rn">New name</label><input id="rn" ref={nameRef} className="input" defaultValue={(modal as any).file?.original_name ?? (modal as any).folder?.name} autoFocus /><div className="flex justify-end gap-2 mt-4"><button type="button" className="btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn-primary">Save</button></div></form></Modal>}
    {modal?.k === 'move' && <Modal title={`Move ${modal.file.original_name}`} onClose={() => setModal(null)}><div className="space-y-1">
      {[{ id: null, name: 'All files (root)' } as any, ...folders].map((f) => <button key={f.id ?? 'root'} className="w-full text-left px-3 min-h-[44px] rounded-lg hover:bg-line/50 text-sm" onClick={() => act(() => api(`/files/${(modal as any).file.id}`, { method: 'PATCH', body: JSON.stringify({ folderId: f.id }) }), 'Moved.')}>{f.name}</button>)}</div></Modal>}
    {modal?.k === 'delete' && <Modal title="Confirm delete" onClose={() => setModal(null)}>
      <p className="text-sm">{modal.folder ? `Delete the folder "${modal.folder.name}" and its subfolders? Files inside are not deleted; they are moved to All files.` : `Permanently delete ${modal.ids.length} file${modal.ids.length > 1 ? 's' : ''}? This cannot be undone.`}</p>
      <div className="flex justify-end gap-2 mt-4"><button className="btn-ghost" onClick={() => setModal(null)}>Cancel</button>
        <button className="btn-danger" onClick={() => act(async () => { const m = modal as any; if (m.folder) await api(`/folders/${m.folder.id}`, { method: 'DELETE' }); else await Promise.all(m.ids.map((id: string) => api(`/files/${id}`, { method: 'DELETE' }))); setSel(new Set()); }, 'Deleted.')}>Delete</button></div></Modal>}
    {modal?.k === 'preview' && <Preview file={modal.file} onClose={() => setModal(null)} onDownload={() => open(modal.file, true)} />}
  </div>;
}

function Preview({ file, onClose, onDownload }: { file: F & { _url?: string }; onClose: () => void; onDownload: () => void }) {
  const [url, setUrl] = useState(file._url ?? ''); const [text, setText] = useState(''); const [err, setErr] = useState('');
  const ext = file.file_extension;
  useEffect(() => { (async () => { try { const u = url || (await api(`/files/${file.id}/preview`)).url; setUrl(u);
    if (['txt', 'csv'].includes(ext)) { const r = await fetch(u, { headers: { Range: 'bytes=0-200000' } }); setText(await r.text()); } } catch (e: any) { setErr(e.message || 'Preview failed.'); } })(); }, []); // eslint-disable-line
  return <Modal title={file.original_name} onClose={onClose} wide>
    {err ? <p className="err" role="alert">{err}</p> : !url ? <div className="h-40 animate-pulse bg-line rounded" aria-busy="true" /> :
      ext === 'pdf' ? <iframe title={file.original_name} src={url} className="w-full h-[70vh] rounded" /> :
        ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? <img src={url} alt={file.original_name} className="max-h-[70vh] mx-auto rounded" /> :
          ['txt', 'csv'].includes(ext) ? <pre className="text-xs whitespace-pre-wrap break-words max-h-[70vh] overflow-auto">{text}</pre> /* rendered as text, never HTML */ :
            <div className="text-sm space-y-1"><p>This file type can't be previewed in the browser.</p><p className="text-muted">{ext.toUpperCase()} · {fmtBytes(file.size_bytes)} · Uploaded {fmtDate(file.created_at)}</p></div>}
    <div className="mt-4 flex justify-end"><button className="btn-primary" onClick={onDownload}><Download className="w-4 h-4" />Download</button></div></Modal>;
}
