'use client';

export function Card({ title, actions, children, className = '' }) {
  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden mb-4 ${className}`}>
      {title && (
        <div className="px-4 py-2.5 border-b border-border flex justify-between items-center">
          <span className="font-semibold text-xs text-white">{title}</span>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 overflow-x-auto">{children}</div>
    </div>
  );
}

export function Stat({ value, label, color }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-dim mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export function Tag({ children, variant = 'info' }) {
  const styles = {
    ok: 'bg-green-500/10 text-green-400',
    err: 'bg-red-500/10 text-red-400',
    warn: 'bg-yellow-500/10 text-yellow-400',
    info: 'bg-accent/10 text-accent',
    dim: 'bg-gray-500/10 text-dim',
    orange: 'bg-orange-500/10 text-orange-400',
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${styles[variant] || styles.info}`}>{children}</span>;
}

export function Pill({ children }) {
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-[#1a1a2e] text-dim mr-1 mb-0.5">{children}</span>;
}

export function Btn({ children, onClick, variant = 'default', size = 'sm', disabled, className = '' }) {
  const base = 'rounded border font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-2.5 py-1 text-[10px]', md: 'px-3 py-1.5 text-xs', lg: 'px-4 py-2 text-sm' };
  const variants = {
    default: 'border-border bg-card text-gray-300 hover:bg-[#1a1a2e] hover:border-accent',
    primary: 'border-accent bg-accent text-white hover:bg-indigo-600',
    danger: 'border-red-500/50 text-red-400 bg-card hover:bg-red-500/10',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
}

export function PageTitle({ children, right }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="text-lg font-semibold text-white">{children}</h1>
      {right && <div className="flex gap-2 items-center">{right}</div>}
    </div>
  );
}

export function Loading({ text = 'Loading...' }) {
  return <div className="text-dim text-center py-8 text-sm">{text}</div>;
}

export function Empty({ text = 'No data found' }) {
  return <div className="text-dim text-center py-8 text-sm">{text}</div>;
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-dim hover:text-white text-lg">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

export function shortTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function shortDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + shortTime(d);
}
