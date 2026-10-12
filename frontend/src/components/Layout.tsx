import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FolderOpen, LayoutDashboard, LogOut, Settings, WifiOff } from 'lucide-react';
import { Logo } from './Logo';
import { supabase } from '../lib/supabase';

const links = [{ to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard }, { to: '/files', label: 'Files', Icon: FolderOpen }, { to: '/settings', label: 'Settings', Icon: Settings }];
export function AppLayout() {
  const nav = useNavigate(); const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => { const a = () => setOnline(true), b = () => setOnline(false); addEventListener('online', a); addEventListener('offline', b); return () => { removeEventListener('online', a); removeEventListener('offline', b); }; }, []);
  const cls = ({ isActive }: { isActive: boolean }) => `flex items-center gap-3 rounded-xl px-3 min-h-[44px] text-sm font-medium ${isActive ? 'bg-brand/15 text-brand' : 'text-muted hover:bg-line/50'}`;
  return <div className="min-h-screen md:flex">
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-line p-4 gap-2 sticky top-0 h-screen">
      <div className="px-2 py-3"><Logo /></div>
      {links.map(({ to, label, Icon }) => <NavLink key={to} to={to} className={cls}><Icon className="w-5 h-5" aria-hidden />{label}</NavLink>)}
      <button className="mt-auto btn-ghost justify-start" onClick={async () => { await supabase.auth.signOut(); nav('/'); }}><LogOut className="w-4 h-4" />Sign out</button>
      <p className="text-xs text-muted px-2">Powered by CymorTechServices</p>
    </aside>
    <main className="flex-1 min-w-0 pb-24 md:pb-8">
      {!online && <div role="alert" className="bg-amber-500/20 text-amber-300 text-sm px-4 py-2 flex gap-2 items-center"><WifiOff className="w-4 h-4" />You're offline. Uploads and downloads need a connection and will not run until you're back online.</div>}
      <div className="max-w-5xl mx-auto p-4 md:p-8"><Outlet /></div>
    </main>
    <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-line bg-card flex justify-around pb-[env(safe-area-inset-bottom)]" aria-label="Main">
      {links.map(({ to, label, Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center justify-center min-h-[56px] flex-1 text-xs ${isActive ? 'text-brand' : 'text-muted'}`}><Icon className="w-5 h-5" aria-hidden />{label}</NavLink>)}
    </nav></div>;
}
