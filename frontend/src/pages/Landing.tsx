import { Link } from 'react-router-dom';
import { FolderTree, Lock, Search, Smartphone, Eye, ShieldCheck, Upload, Cloud } from 'lucide-react';
import { Logo, Footer } from '../components/Logo';

const features = [
  { Icon: Lock, t: 'Private storage', d: 'Every account gets its own private space. Files are never publicly listed.' },
  { Icon: FolderTree, t: 'Organized', d: 'Folders, breadcrumbs, sorting and filters keep documents tidy.' },
  { Icon: Eye, t: 'Previews', d: 'Preview PDFs, images and text files right in your browser.' },
  { Icon: Search, t: 'Fast search', d: 'Find a document by filename in a moment.' },
  { Icon: Smartphone, t: 'Any device', d: 'Mobile-first and installable on Android, iPhone, tablet and desktop.' },
  { Icon: ShieldCheck, t: 'Controlled downloads', d: 'Downloads use short-lived links created only after we check you own the file.' },
];
const faqs = [
  ['Is storage unlimited?', 'No. Each account has a fixed quota and the service has a total capacity. Your real usage is always shown in the app.'],
  ['Are my files encrypted?', 'Files are stored in a private bucket and transferred over HTTPS. Cloudy does not currently offer end-to-end encryption.'],
  ['Which files can I upload?', 'PDF, Word, Excel, PowerPoint, TXT, CSV, JPG, PNG and WEBP, up to the per-file size limit shown in the app.'],
  ['Can other users see my files?', 'No. Every request is checked against your verified account on the server.'],
];
export default function Landing() {
  return <div>
    <header className="sticky top-0 z-30 backdrop-blur bg-bg/80 border-b border-line"><div className="max-w-6xl mx-auto px-4 min-h-[60px] flex items-center justify-between gap-2">
      <Link to="/" aria-label="Cloudy home"><Logo /></Link>
      <nav className="hidden md:flex gap-6 text-sm text-muted" aria-label="Primary"><a href="#features">Features</a><a href="#security">Security</a><a href="/about">About</a></nav>
      <div className="flex gap-2"><Link to="/login" className="btn-ghost">Login</Link><Link to="/signup" className="btn-primary">Get Started</Link></div></div></header>
    <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 grid md:grid-cols-2 gap-10 items-center">
      <div><p className="text-brand text-sm font-semibold mb-3">Your files. Your space. Your Cloudy.</p>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Your documents, organized and within reach.</h1>
        <p className="mt-4 text-muted text-lg">Store, organize, and access your important documents in your own secure cloud workspace.</p>
        <div className="mt-6 flex gap-3 flex-wrap"><Link to="/signup" className="btn-primary">Create free account</Link><a href="#how" className="btn-ghost">How it works</a></div></div>
      <div className="card p-5 bg-gradient-to-br from-brand/10 to-brand2/10" aria-hidden="true">
        <div className="flex items-center gap-2 mb-4"><Cloud className="w-5 h-5 text-brand" /><span className="font-semibold">My workspace</span></div>
        {['Certificate.pdf', 'Lecture notes.docx', 'Receipt.png'].map((n) => <div key={n} className="flex justify-between border-t border-line py-3 text-sm"><span>{n}</span><span className="text-muted">Private</span></div>)}
        <div className="mt-3 h-2 rounded-full bg-line"><div className="h-2 w-1/3 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500" /></div></div>
    </section>
    <section id="features" className="max-w-6xl mx-auto px-4 py-12"><h2 className="text-2xl font-bold mb-6">Everything for your documents</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{features.map(({ Icon, t, d }) => <div key={t} className="card p-5"><Icon className="w-6 h-6 text-brand mb-3" aria-hidden /><h3 className="font-semibold">{t}</h3><p className="text-sm text-muted mt-1">{d}</p></div>)}</div></section>
    <section id="how" className="max-w-6xl mx-auto px-4 py-12"><h2 className="text-2xl font-bold mb-6">How it works</h2>
      <ol className="grid md:grid-cols-3 gap-4">{['Create your account and verify your email.', 'Upload documents — drag, drop or pick files.', 'Search, preview and download from any device.'].map((s, i) => <li key={i} className="card p-5"><span className="text-brand font-bold">Step {i + 1}</span><p className="mt-1">{s}</p></li>)}</ol></section>
    <section id="security" className="max-w-6xl mx-auto px-4 py-12"><h2 className="text-2xl font-bold mb-3">Security</h2>
      <p className="text-muted max-w-3xl">Sign-in is handled by Supabase Auth. Files live in a private bucket and are reachable only through short-lived links issued after the server verifies you own them. Uploads are checked for type, size and quota. Cloudy has not undergone an independent security audit and does not claim any certification.</p></section>
    <section className="max-w-6xl mx-auto px-4 py-12"><h2 className="text-2xl font-bold mb-3">Storage transparency</h2>
      <p className="text-muted max-w-3xl">Cloudy runs on third-party infrastructure with real limits. Each account has a quota (1 GB to start) and the service has a total capacity, so storage is never unlimited. Your usage is always shown in the app.</p><Upload className="hidden" /></section>
    <section className="max-w-3xl mx-auto px-4 py-12"><h2 className="text-2xl font-bold mb-4">FAQ</h2>
      {faqs.map(([q, a]) => <details key={q} className="card p-4 mb-3"><summary className="font-medium cursor-pointer">{q}</summary><p className="text-sm text-muted mt-2">{a}</p></details>)}</section>
    <Footer /></div>;
}
