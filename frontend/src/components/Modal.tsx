import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null; ref.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k); return () => { document.removeEventListener('keydown', k); prev?.focus(); };
  }, [onClose]);
  return <div className="fixed inset-0 z-40 bg-black/60 flex items-end md:items-center justify-center p-0 md:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`card w-full ${wide ? 'md:max-w-4xl' : 'md:max-w-md'} max-h-[90vh] overflow-auto p-5 rounded-b-none md:rounded-b-2xl`}>
      <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-lg">{title}</h2><button className="btn-ghost !min-h-[36px] !px-2" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button></div>
      {children}</div></div>;
}
