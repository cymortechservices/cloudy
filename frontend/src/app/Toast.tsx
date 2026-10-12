import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
type T = { id: number; msg: string; kind: 'ok' | 'err' };
const Ctx = createContext<(msg: string, kind?: 'ok' | 'err') => void>(() => {});
export const useToast = () => useContext(Ctx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((msg: string, kind: 'ok' | 'err' = 'ok') => {
    const id = Date.now() + Math.random(); setItems((i) => [...i, { id, msg, kind }]);
    setTimeout(() => setItems((i) => i.filter((x) => x.id !== id)), 5000);
  }, []);
  return <Ctx.Provider value={push}>{children}
    <div className="fixed bottom-20 md:bottom-4 right-4 left-4 md:left-auto z-50 space-y-2" role="status" aria-live="polite">
      {items.map((t) => <div key={t.id} className={`card px-4 py-3 text-sm border-l-4 ${t.kind === 'ok' ? 'border-l-emerald-500' : 'border-l-red-500'}`}>{t.msg}</div>)}
    </div></Ctx.Provider>;
}
