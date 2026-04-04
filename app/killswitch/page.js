'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, friendlyDate } from '../../components/UI';

export default function KillSwitchPage() {
  const [switches, setSwitches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  const load = () => {
    fetch('/api/killswitch').then(r => r.json()).then(d => {
      setSwitches(d.switches || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const toggle = async (sw) => {
    setToggling(sw.id);
    try {
      const action = sw.status === 'KILLED' ? 'enable' : 'kill';
      await fetch('/api/killswitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sw.id, action, reason: action === 'kill' ? 'Toggled from AOA Portal' : undefined })
      });
      await new Promise(r => setTimeout(r, 500));
      load();
    } catch {}
    setToggling(null);
  };

  if (loading) return <Loading text="Loading kill switches..." />;

  const killed = switches.filter(s => s.status === 'KILLED').length;
  const active = switches.filter(s => s.status === 'ACTIVE').length;

  return (
    <div className="fade-in">
      <PageTitle sub="Toggle ABA subsystems without deploying" right={<Btn onClick={load}>Refresh</Btn>}>Kill Switches</PageTitle>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat value={switches.length} label="Total Switches" />
        <Stat value={active} label="Active" color="text-green-400" />
        <Stat value={killed} label="Killed" color="text-red-400" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {switches.map(sw => (
          <div key={sw.id} className="glass-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${sw.status === 'ACTIVE' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-sm font-semibold text-white">{sw.label}</span>
                </div>
                <p className="text-xs text-dim mb-2">{sw.description}</p>
                {sw.status === 'KILLED' && sw.killedAt && (
                  <div className="text-[10px] text-red-400/70">
                    Killed {friendlyDate(sw.killedAt)}
                    {sw.reason && <span className="text-dim ml-1">— {sw.reason}</span>}
                  </div>
                )}
              </div>
              <button
                onClick={() => toggle(sw)}
                disabled={toggling === sw.id}
                className={`relative w-12 h-6 rounded-full transition-all cursor-pointer flex-shrink-0 ${
                  sw.status === 'ACTIVE' ? 'bg-green-500/30' : 'bg-red-500/30'
                } ${toggling === sw.id ? 'opacity-50' : ''}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                  sw.status === 'ACTIVE'
                    ? 'left-[26px] bg-green-400'
                    : 'left-0.5 bg-red-400'
                }`} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-dim/40 text-center mt-6">
        Kill switches write system_override entries to brain. Backend checks before running each subsystem.
      </div>
    </div>
  );
}
