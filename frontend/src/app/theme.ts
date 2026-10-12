export function initTheme() { const t = localStorage.getItem('cloudy-theme') ?? 'dark'; document.documentElement.classList.toggle('dark', t === 'dark'); }
export function getTheme() { return document.documentElement.classList.contains('dark') ? 'dark' : 'light'; }
export function setTheme(t: 'dark' | 'light') { localStorage.setItem('cloudy-theme', t); document.documentElement.classList.toggle('dark', t === 'dark'); }
