import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const Ctx = createContext<{ session: Session | null; loading: boolean }>({ session: null, loading: true });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null); const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return <Ctx.Provider value={{ session, loading }}>{children}</Ctx.Provider>;
}
export function Protected({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth(); const loc = useLocation();
  if (loading) return <div className="p-8 text-muted" role="status">Loading…</div>;
  return session ? <>{children}</> : <Navigate to="/login" state={{ from: loc.pathname }} replace />;
}
export function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8 text-muted" role="status">Loading…</div>;
  return session ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}
