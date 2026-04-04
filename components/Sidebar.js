'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ABALogoSmall } from './ABAConsciousness';
import { useBgPicker } from './Background';

const NAV = [
  { group: 'Command', items: [
    { href: '/', label: 'Dashboard', icon: '◈' },
    { href: '/events', label: 'Event Feed', icon: '◉' },
    { href: '/cost', label: 'Cost Tracking', icon: '◇' },
    { href: '/activity', label: 'Live Activity', icon: '◐' },
  ]},
  { group: 'Agents', items: [
    { href: '/agents', label: 'Agent Roster', icon: '◎' },
    { href: '/killswitch', label: 'Kill Switches', icon: '⊘' },
  ]},
  { group: 'Intelligence', items: [
    { href: '/brain', label: 'Brain Search', icon: '◆' },
    { href: '/email', label: 'Email Trace', icon: '◫' },
    { href: '/training', label: 'Training Notes', icon: '◑' },
  ]},
  { group: 'Transcripts', items: [
    { href: '/omi', label: 'OMI Raw', icon: '◌' },
    { href: '/taste', label: 'TASTE Batches', icon: '◍' },
    { href: '/proactive', label: 'Proactive Events', icon: '◒' },
  ]},
  { group: 'Workforce', items: [
    { href: '/awa', label: 'AWA Jobs', icon: '◓' },
  ]},
  { group: 'Infrastructure', items: [
    { href: '/shadow', label: 'SHADOW Oversight', icon: '◔' },
    { href: '/keys', label: 'Key Management', icon: '⚿' },
    { href: '/services', label: 'Services', icon: '◧' },
    { href: '/errors', label: 'Error Log', icon: '◬' },
  ]},
  { group: 'ABA', items: [
    { href: '/chat', label: 'ABA Chat', icon: '⬡' },
  ]},
];

export default function Sidebar({ mobile, onClose }) {
  const pathname = usePathname();
  const { setPickerOpen } = useBgPicker();

  return (
    <aside className={`${mobile ? 'fixed inset-0 z-50' : 'w-56 flex-shrink-0 h-screen sticky top-0 hidden md:block'}`}>
      {mobile && <div className="absolute inset-0 bg-black/60" onClick={onClose} />}
      <div className={`${mobile ? 'absolute left-0 top-0 w-64 h-full z-10' : 'w-full h-full'} bg-[rgba(15,23,42,0.85)] backdrop-blur-xl border-r border-white/[0.04] overflow-y-auto`}>
        <div className="px-4 py-4 border-b border-white/[0.04] flex items-center gap-3">
          <ABALogoSmall state="idle" />
          <div>
            <h1 className="text-sm font-bold text-white"><span className="text-purple">AOA</span> Portal</h1>
            <p className="text-[9px] text-dim mt-0.5">Anatomy of ABA</p>
          </div>
          {mobile && <button onClick={onClose} className="ml-auto text-dim hover:text-white text-lg">&times;</button>}
        </div>

        {NAV.map(g => (
          <div key={g.group} className="py-1">
            <div className="px-4 py-1.5 text-[9px] uppercase tracking-widest text-dim/60 mt-2 font-semibold">{g.group}</div>
            {g.items.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={mobile ? onClose : undefined}
                  className={`flex items-center gap-2.5 px-4 py-2 text-[13px] border-l-[3px] transition-all ${
                    active
                      ? 'bg-purple/[0.08] border-purple text-white font-medium'
                      : 'border-transparent text-gray-400 hover:bg-white/[0.03] hover:text-white'
                  }`}>
                  <span className={`text-xs ${active ? 'text-purple' : 'text-dim'}`}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="px-4 py-3 mt-4 border-t border-white/[0.04]">
          <button onClick={() => setPickerOpen(true)}
            className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-dim hover:text-white hover:bg-white/[0.04] transition-all">
            ◐ Change Background
          </button>
          <div className="text-[9px] text-dim/30 text-center mt-2">T10 Operator Access</div>
        </div>
      </div>
    </aside>
  );
}
