'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, friendlyTime } from '../../components/UI';

export default function ProactivePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load() { setLoading(true); const d=await fetch('/api/proactive').then(r=>r.json()); setEvents(d.proactive||[]); setLoading(false); }
  useEffect(()=>{load();},[]);

  const filtered = events.filter(e => !search || (e.content||'').toLowerCase().includes(search.toLowerCase()));

  return (<div>
    <PageTitle right={<Btn onClick={load}>Refresh</Btn>}>OMI Proactive Events</PageTitle>
    <div className="glass-card p-3 mb-4 text-xs text-dim">
      These are things ABA noticed in ambient audio and either stored for context or acted on. <strong className="text-yellow-400">Executions</strong> mean ABA actually did something. <strong className="text-dim">Context</strong> means ABA just remembered it for later.
    </div>
    <div className="flex gap-2 mb-4">
      <input className="flex-1" placeholder="Search proactive events..." value={search} onChange={e=>setSearch(e.target.value)} />
    </div>
    <Card>{loading?<Loading/>:filtered.length===0?<div className="text-dim py-4">No events</div>:(
      <table><thead><tr><th>Time</th><th>Type</th><th>What ABA Noticed</th></tr></thead>
      <tbody>{filtered.map(p=><tr key={p.id} data-aba-ctx={JSON.stringify({type:'proactive_event',label:p.memory_type,data:{content:(p.content||'').slice(0,200)}})}>
        <td className="mono whitespace-nowrap">{friendlyTime(p.created_at)}</td>
        <td><Tag variant={p.memory_type.includes('execution')?'warn':'dim'}>{p.memory_type.includes('execution')?'Execution':'Context'}</Tag></td>
        <td>{(p.content||'').replace(/^OMI PROACTIVE (MEMORY|EXECUTION):\s*/i,'')}</td></tr>)}</tbody></table>
    )}</Card>
  </div>);
}
