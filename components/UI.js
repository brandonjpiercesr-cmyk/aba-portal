'use client';
import Link from 'next/link';

export function Card({ title, actions, children, className = '' }) {
  return (
    <div className={`glass-card overflow-hidden mb-4 ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-white/[0.04] flex justify-between items-center">
          <span className="font-semibold text-sm text-white">{title}</span>
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 overflow-x-auto">{children}</div>
    </div>
  );
}

export function Stat({ value, label, color, tooltip, href, sub }) {
  const inner = (
    <div className={`glass-card p-4 ${href ? 'cursor-pointer hover:border-purple/40 hover:bg-purple/[0.03] transition-all group' : ''}`} title={tooltip || ''}>
      <div className={`text-2xl font-bold ${color || 'text-white'} ${href ? 'group-hover:text-purple transition-colors' : ''}`}>
        {value === undefined || value === null ? '—' : (typeof value === 'number' ? value.toLocaleString() : value)}
      </div>
      <div className="text-[10px] text-dim mt-1 uppercase tracking-wider">{label}</div>
      {sub && <div className="text-[10px] text-dim/60 mt-0.5">{sub}</div>}
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export function Tag({ children, variant = 'info' }) {
  const styles = {
    ok: 'bg-green-500/10 text-green-400 border border-green-500/20',
    err: 'bg-red-500/10 text-red-400 border border-red-500/20',
    warn: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    info: 'bg-purple/10 text-purple border border-purple/20',
    dim: 'bg-gray-500/10 text-dim border border-gray-500/10',
    orange: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  };
  return <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${styles[variant] || styles.info}`}>{children}</span>;
}

export function Pill({ children }) {
  return <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-dim mr-1 mb-0.5">{children}</span>;
}

export function Btn({ children, onClick, variant = 'default', size = 'sm', disabled, className = '' }) {
  const base = 'rounded-lg border font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-[11px]', md: 'px-4 py-2 text-xs', lg: 'px-5 py-2.5 text-sm' };
  const variants = {
    default: 'border-white/[0.08] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08] hover:border-purple/30',
    primary: 'border-purple bg-purple text-white hover:bg-purple-deep shadow-sm shadow-purple/20',
    danger: 'border-red-500/30 text-red-400 bg-white/[0.02] hover:bg-red-500/10',
    success: 'border-green-500/30 text-green-400 bg-white/[0.02] hover:bg-green-500/10',
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
}

export function PageTitle({ children, right, sub }) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-5 gap-2">
      <div>
        <h1 className="text-xl font-bold text-white">{children}</h1>
        {sub && <p className="text-xs text-dim mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex gap-2 items-center flex-wrap">{right}</div>}
    </div>
  );
}

export function Loading({ text = 'Loading...' }) {
  return (
    <div className="text-center py-16">
      <div className="w-8 h-8 border-2 border-purple/30 border-t-purple rounded-full animate-spin mx-auto mb-3" />
      <p className="text-dim text-sm">{text}</p>
    </div>
  );
}

export function Empty({ text = 'No data found' }) {
  return <div className="text-dim text-center py-12 text-sm">{text}</div>;
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`glass-card ${wide ? 'w-full max-w-5xl' : 'w-full max-w-3xl'} max-h-[90vh] overflow-y-auto p-5 border-purple/20 glow-purple`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-dim hover:text-white text-lg">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function friendlyTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}
export function friendlyDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + friendlyTime(d);
}
export function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}
export const shortTime = friendlyTime;
export const shortDate = friendlyDate;

export function describeType(type) {
  const map = {
    omi_transcript: 'OMI Audio', omi_proactive_context: 'ABA Noticed Something', omi_proactive_execution: 'ABA Took Action',
    email_dedup: 'Email Confirmed', email_sent: 'ABA Sent Email', email_task_processed: 'Email Task Processed',
    taste_batch_summary: 'TASTE Batch Summary', taste_batch_result: 'TASTE Result', ccwa_training_note: 'Training Note',
    aba_command_executed: 'Voice Command', writing_standards: 'Writing Rules', approval_queue: 'Approval Waiting',
    awa_job: 'Job Listing', awa_application_sent: 'Application Sent', think_cycle: 'Proactive Thinking',
    shadow_audit: 'Shadow Audit', air_trace: 'AIR Trace', command_center_activity: 'Command Center',
    bug_report: 'Bug Report', ham_preferences: 'User Preferences', ham_profile: 'HAM Profile',
    nylas_grant: 'Email Connected', session_memo: 'Session Memo', checkpoint: 'Checkpoint',
    dawn_briefing: 'DAWN Briefing', aba_memo: 'Memo', scheduled_task: 'Scheduled Task',
    cost_tracking: 'Cost Entry', aba_event: 'ABA Event', code_stamp: 'Code Stamp',
    system_override: 'Kill Switch',
  };
  return map[type] || type;
}

export function isSignificantActivity(item) {
  const noise = ['omi_transcript', 'omi_heartbeat', 'omi_request_log', 'workflow_log'];
  if (noise.includes(item.memory_type)) return false;
  if (item.source?.startsWith('omi_stream_')) return false;
  return true;
}
