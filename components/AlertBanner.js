'use client';
import { useState, useEffect } from 'react';

export default function AlertBanner() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const check = async () => {
      try {
        // ⬡B:aoa.audit_fix:FIX:M12_alert_lightweight:20260404⬡
        // Was fetching full dashboard (9+ queries). Now uses lightweight endpoints.
        const [keepalive, errors, kills] = await Promise.all([
          fetch('/api/keepalive').then(r => r.json()).catch(() => null),
          fetch('/api/errors?hours=1').then(r => r.json()).catch(() => null),
          fetch('/api/killswitch').then(r => r.json()).catch(() => null),
        ]);

        const a = [];
        const abaStatus = keepalive?.services?.['abacia-services']?.status;
        if (abaStatus === 'down') a.push({ level: 'critical', msg: 'ABAbase is DOWN — services may not respond' });
        if ((errors?.count || 0) > 5) a.push({ level: 'error', msg: `${errors.count} errors in the last hour` });
        if ((errors?.count || 0) > 0 && (errors?.count || 0) <= 5) a.push({ level: 'warn', msg: `${errors.count} error${errors.count > 1 ? 's' : ''} in the last hour` });

        const killed = (kills?.switches || []).filter(s => s.status === 'KILLED');
        if (killed.length > 0) a.push({ level: 'warn', msg: `${killed.length} kill switch${killed.length > 1 ? 'es' : ''} active: ${killed.map(k => k.label).join(', ')}` });

        setAlerts(a);
      } catch {}
    };

    check();
    const iv = setInterval(check, 60000);
    return () => clearInterval(iv);
  }, []);

  if (alerts.length === 0) return null;

  const colors = {
    critical: 'bg-red-500/15 border-red-500/30 text-red-400',
    error: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    warn: 'bg-yellow-500/8 border-yellow-500/15 text-yellow-400',
  };

  const highest = alerts.find(a => a.level === 'critical') || alerts.find(a => a.level === 'error') || alerts[0];

  return (
    <div className={`mb-4 px-4 py-2.5 rounded-xl border text-xs flex items-center gap-2 ${colors[highest.level]}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${highest.level === 'critical' ? 'bg-red-400 animate-pulse' : highest.level === 'error' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
      <span className="flex-1">{alerts.map(a => a.msg).join(' · ')}</span>
      <button onClick={() => setAlerts([])} className="text-white/30 hover:text-white/60">×</button>
    </div>
  );
}
