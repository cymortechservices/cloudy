import { fmtBytes } from '../lib/api';
export type Usage = { quotaBytes: number; usedBytes: number; reservedBytes: number; remainingBytes: number; percentUsed: number; maxFileBytes: number };
export function StorageBar({ u }: { u: Usage }) {
  const full = u.remainingBytes <= 0, warn = u.percentUsed >= 80;
  return <div><div className="flex justify-between text-sm mb-2"><span>{fmtBytes(u.usedBytes)} used</span><span className="text-muted">{fmtBytes(u.remainingBytes)} available of {fmtBytes(u.quotaBytes)}</span></div>
    <div className="h-3 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={Math.round(u.percentUsed)} aria-valuemin={0} aria-valuemax={100} aria-label="Storage used">
      <div className={`h-3 ${full ? 'bg-red-500' : warn ? 'bg-amber-500' : 'bg-gradient-to-r from-sky-400 to-indigo-500'}`} style={{ width: `${Math.min(u.percentUsed, 100)}%` }} /></div>
    {full && <p className="err mt-2" role="alert">Your storage is full. Delete files to upload more.</p>}
    {!full && warn && <p className="text-xs text-amber-500 mt-2" role="alert">You've used {u.percentUsed}% of your storage.</p>}</div>;
}
