export function Logo({ size = 32, text = true }: { size?: number; text?: boolean }) {
  return <span className="inline-flex items-center gap-2 font-bold text-lg">
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22d3ee" /><stop offset="1" stopColor="#6366f1" /></linearGradient></defs><rect width="64" height="64" rx="16" fill="#0b1220" /><path d="M20 44a9 9 0 0 1-1-17.9A12 12 0 0 1 42 24a10 10 0 0 1 2 20z" fill="url(#lg)" /></svg>
    {text && <span>Cloudy</span>}</span>;
}
export function Footer() {
  return <footer className="border-t border-line mt-16 py-8 text-sm text-muted">
    <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row gap-3 md:items-center justify-between">
      <div><div>© 2026 CymorTechServices. All rights reserved.</div><div>Powered by CymorTechServices · Developed by Legendary Smiley Cymor</div></div>
      <nav className="flex gap-4 flex-wrap" aria-label="Footer"><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a><a href="/contact">Contact</a><a href="/about">About</a></nav>
    </div></footer>;
}
