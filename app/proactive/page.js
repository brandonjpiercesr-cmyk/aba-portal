'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, shortTime } from '../../components/UI';
export default function ProactivePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const d=await fetch('/api/proactive').then(r=>r.json()); setEvents(d.proactive||[]); setLoading(false); }
  useEffect(()=>{load();},[]);
  return (<div>
    <PageTitle right={<Btn onClick={load}>Refresh</Btn>}>OMI Proactive Events</PageTitle>
    <Card>{loading?<Loading/>:events.length===0?<div className="text-dim text-center py-8">No proactive events</div>:(
      <table><thead><tr><th>Time</th><th>Type</th><th>Content</th></tr></thead>
      <tbody>{events.map(p=><tr key={p.id}><td className="mono whitespace-nowrap">{shortTime(p.created_at)}</td>
        <td><Tag variant={p.memory_type.includes('execution')?'warn':'dim'}>{p.memory_type.replace('omi_proactive_','')}</Tag></td>
        <td>{(p.content||'').slice(0,300)}</td></tr>)}</tbody></table>
    )}</Card>
  </div>);
}
