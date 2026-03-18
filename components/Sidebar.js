'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { group: 'Command', items: [
    { href: '/', label: 'Dashboard' },
    { href: '/approve', label: 'Approval Queue' },
    { href: '/killswitch', label: 'Kill Switches' },
    { href: '/activity', label: 'Live Activity' },
  ]},
  { group: 'Agents', items: [
    { href: '/agents', label: 'Agent JDs' },
  ]},
  { group: 'Brain', items: [
    { href: '/brain', label: 'Memory Search' },
    { href: '/training', label: 'CCWA Training' },
  ]},
  { group: 'Email', items: [
    { href: '/email', label: 'Email Audit' },
  ]},
  { group: 'OMI / TASTE', items: [
    { href: '/omi', label: 'OMI Transcripts' },
    { href: '/taste', label: 'TASTE Batches' },
    { href: '/proactive', label: 'Proactive Events' },
  ]},
  { group: 'AWA', items: [
    { href: '/awa', label: 'Jobs & Apps' },
  ]},
  { group: 'Infrastructure', items: [
    { href: '/render', label: 'Render (13)' },
    { href: '/vercel', label: 'Vercel (50)' },
    { href: '/env', label: 'Env Variables' },
    { href: '/cost', label: 'Cost Dashboard' },
    { href: '/continuity', label: 'Continuity' },
    { href: '/errors', label: 'Error Log' },
    { href: '/code', label: 'Code Explorer' },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-[rgba(17,17,26,0.8)] backdrop-blur-xl border-r border-white/[0.04] flex-shrink-0 overflow-y-auto h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-white/[0.04]">
        <h1 className="text-sm font-bold text-white"><span className="text-accent">AOA</span> Portal</h1>
        <p className="text-[10px] text-dim mt-0.5">Admin Operations for ABA</p>
      </div>
      {NAV.map(g => (
        <div key={g.group} className="py-1">
          <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-dim mt-2">{g.group}</div>
          {g.items.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`block px-4 py-1.5 text-xs border-l-[3px] transition-all ${
                  active ? 'bg-white/[0.04] border-accent text-white' : 'border-transparent text-gray-400 hover:bg-white/[0.03] hover:text-white'
                }`}>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
