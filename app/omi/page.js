'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Pill, friendlyTime } from '../../components/UI';

export default function OmiPage() {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState('4');
  const [search, setSearch] = useState('');

  async function load() { setLoading(true); const d=await fetch(`/api/omi?hours=${hours}`).then(r=>r.json()); setTranscripts(d.transcripts||[]); setLoading(false); }
  useEffect(()=>{load();},[hours]);

  const filtered = transcripts.filter(t => !search || (t.content||'').toLowerCase().includes(search.toLowerCase()));

  return (<div>
    <PageTitle>OMI Raw Transcripts</PageTitle>
    <div className="glass-card p-3 mb-4 text-xs text-dim">
      <strong className="text-white">OMI</strong> is the pendant hardware that captures ambient audio. These are the raw transcript fragments before TASTE processes them. OMI fires every few seconds with whatever it hears. TASTE then compiles these fragments into meaningful sessions.
    </div>
    <div className="flex gap-2 mb-4">
      <input className="flex-1" placeholder="Search transcripts..." value={search} onChange={e=>setSearch(e.target.value)} />
      <select className="w-32" value={hours} onChange={e=>setHours(e.target.value)}>
        <option value="1">1h</option><option value="4">4h</option><option value="12">12h</option><option value="24">24h</option>
      </select>
      <Btn onClick={load}>Refresh</Btn>
      <span className="text-dim text-xs self-center">{filtered.length.toLocaleString()} transcripts</span>
    </div>
    <Card>{loading?<Loading/>:filtered.length===0?<div className="text-dim py-4">No transcripts</div>:(
      <table><thead><tr><th>Time</th><th>Route</th><th>Content</th></tr></thead>
      <tbody>{filtered.slice(0,100).map(t=>(
        <tr key={t.id}><td className="mono whitespace-nowrap">{friendlyTime(t.created_at)}</td>
          <td>{(t.tags||[]).filter(tg=>['air_command','tim','luke','dion','logful','emergency','identity_required'].includes(tg)).map(tg=><Pill key={tg}>{tg}</Pill>)}</td>
          <td>{(t.content||'').slice(0,300)}</td></tr>
      ))}</tbody></table>
    )}</Card>
  </div>);
}
