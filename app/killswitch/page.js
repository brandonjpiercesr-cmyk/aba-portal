'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag } from '../../components/UI';

export default function KillSwitchPage() {
  const [switches, setSwitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState({});

  async function load() {
    setLoading(true);
    const d = await fetch('/api/killswitch').then(r => r.json());
    setSwitches(d.switches || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggle(id, currentStatus) {
    const action = currentStatus === 'KILLED' ? 'enable' : 'kill';
    const reason = action === 'kill'
      ? prompt('Reason for killing this? (optional)')
      : prompt('Reason for re-enabling? (optional)');
    if (reason === null) return;

    setActing(p => ({ ...p, [id]: true }));
    await fetch('/api/killswitch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reason: reason || undefined })
    });
    setActing(p => ({ ...p, [id]: false }));
    load();
  }

  if (loading) return <Loading />;

  return (<div>
    <PageTitle>Kill Switches</PageTitle>
    <div className="glass-card p-3 mb-4 text-xs text-dim">
      These write system_override entries to ABA brain. The backend code checks for these before running each path. Kill a switch and it stops immediately. No code push needed. No deploy needed. Re-enable when ready.
    </div>
    <div className="space-y-3">
      {switches.map(sw => (
        <div key={sw.id} className="glass-card p-4 flex justify-between items-center">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${sw.status === 'ACTIVE' ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-white font-semibold text-sm">{sw.label}</span>
              <Tag variant={sw.status === 'ACTIVE' ? 'ok' : 'err'}>{sw.status}</Tag>
            </div>
            <div className="text-dim text-xs mt-1 ml-6">{sw.description}</div>
            {sw.killedAt && <div className="text-dim text-[10px] mt-1 ml-6">
              Killed: {new Date(sw.killedAt).toLocaleString()} {sw.reason ? `| Reason: ${sw.reason}` : ''}
            </div>}
          </div>
          <Btn variant={sw.status === 'ACTIVE' ? 'danger' : 'primary'} size="md"
            onClick={() => toggle(sw.id, sw.status)} disabled={acting[sw.id]}>
            {acting[sw.id] ? '...' : sw.status === 'ACTIVE' ? 'Kill' : 'Re-enable'}
          </Btn>
        </div>
      ))}
    </div>
  </div>);
}
