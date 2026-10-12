import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, FolderPlus, FolderOpen } from 'lucide-react';
import { api, fmtBytes, fmtDate } from '../lib/api';
import { FileIcon } from '../components/FileIcon';
import { StorageBar, type Usage } from '../components/StorageBar';

export default function Dashboard() {
  const [d, setD] = useState<any>(null); const [me, setMe] = useState<any>(null); const [err, setErr] = useState('');
  useEffect(() => { Promise.all([api('/dashboard'), api('/me')]).then(([a, b]) => { setD(a); setMe(b); }).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="card p-6" role="alert">{err}</div>;
  if (!d) return <div className="space-y-4" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="card h-24 animate-pulse" />)}</div>;
  const u: Usage = d.storage;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Welcome, {me?.displayName || me?.email}</h1>
      <p className="text-muted text-sm">{new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date())}</p></div>
      <Link to="/files?upload=1" className="btn-primary"><FilePlus2 className="w-4 h-4" />Upload document</Link></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[['Total files', d.totalFiles], ['Folders', d.totalFolders], ['Storage used', fmtBytes(u.usedBytes)], ['Remaining', fmtBytes(u.remainingBytes)]].map(([k, v]) => <div key={k as string} className="card p-4"><div className="text-xs text-muted">{k}</div><div className="text-xl font-bold mt-1">{v}</div></div>)}</div>
    <div className="card p-5"><h2 className="font-semibold mb-3">Storage</h2><StorageBar u={u} /><p className="text-xs text-muted mt-2">Quota: {fmtBytes(u.quotaBytes)} · Max file size: {fmtBytes(u.maxFileBytes)}</p></div>
    <div className="flex gap-2 flex-wrap"><Link to="/files?upload=1" className="btn-ghost"><FilePlus2 className="w-4 h-4" />Upload</Link><Link to="/files?newfolder=1" className="btn-ghost"><FolderPlus className="w-4 h-4" />Create folder</Link><Link to="/files" className="btn-ghost"><FolderOpen className="w-4 h-4" />Browse all files</Link></div>
    <div className="card p-5"><h2 className="font-semibold mb-3">Recent files</h2>
      {d.recentFiles.length === 0 ? <p className="text-sm text-muted">No files yet. Upload your first document to get started.</p> :
        <ul className="divide-y divide-line">{d.recentFiles.map((f: any) => <li key={f.id}><Link to={`/files?open=${f.id}`} className="flex items-center gap-3 py-3 min-h-[56px]"><FileIcon ext={f.file_extension} />
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{f.original_name}</div><div className="text-xs text-muted">{f.file_extension.toUpperCase()} · {fmtBytes(f.size_bytes)} · {fmtDate(f.created_at)}</div></div></Link></li>)}</ul>}</div></div>;
}
