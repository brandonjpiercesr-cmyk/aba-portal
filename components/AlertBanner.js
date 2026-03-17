'use client';
import { useState, useEffect } from 'react';

export default function AlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [dismissed, setDismissed] = useState(new Set());

  async function check() {
    try {
      const d = await fetch('/api/monitor').then(r => r.json());
      setAlerts(d.alerts || []);
      setStatus(d.status || 'healthy');
    } catch { setStatus('error'); }
  }

  useEffect(() => { check(); const iv = setInterval(check, 60000); return () => clearInterval(iv); }, []);

  const visible = alerts.filter(a => !dismissed.has(a.msg));
  if (visible.length === 0) return null;

  const bg = status === 'critical' ? 'bg-red-500/15 border-red-500/30' :
             status === 'error' ? 'bg-red-500/10 border-red-500/20' :
             'bg-yellow-500/10 border-yellow-500/20';

  return (
    <div className={`${bg} border rounded-lg px-4 py-2 mb-4`}>
      {visible.map((a, i) => (
        <div key={i} className="flex justify-between items-center py-1">
          <span className={`text-xs ${a.level === 'critical' ? 'text-red-400 font-semibold' : a.level === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
            {a.level === 'critical' ? '🔴' : a.level === 'error' ? '🟠' : '🟡'} {a.msg}
          </span>
          <button onClick={() => setDismissed(prev => new Set([...prev, a.msg]))} className="text-dim text-xs hover:text-white ml-4">&times;</button>
        </div>
      ))}
    </div>
  );
}
