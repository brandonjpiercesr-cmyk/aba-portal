'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Pill, shortTime } from '../../components/UI';
export default function OmiPage() {
  const [transcripts, setTranscripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState('4');
  async function load() { setLoading(true); const d=await fetch(`/api/omi?hours=${hours}`).then(r=>r.json()); setTranscripts(d.transcripts||[]); setLoading(false); }
  useEffect(()=>{load();},[hours]);
  return (<div>
    <PageTitle>OMI Transcripts</PageTitle>
    <div className="flex gap-2 mb-4">
      <select className="w-32" value={hours} onChange={e=>setHours(e.target.value)}>
        <option value="1">1h</option><option value="4">4h</option><option value="12">12h</option><option value="24">24h</option>
      </select><Btn onClick={load}>Refresh</Btn><span className="text-dim text-xs self-center">{transcripts.length} transcripts</span>
    </div>
    <Card>{loading?<Loading/>:transcripts.length===0?<div className="text-dim text-center py-8">No transcripts</div>:(
      <table><thead><tr><th>Time</th><th>Tags</th><th>Content</th></tr></thead>
      <tbody>{transcripts.map(t=><tr key={t.id}><td className="mono whitespace-nowrap">{shortTime(t.created_at)}</td>
        <td>{(t.tags||[]).slice(0,4).map(tg=><Pill key={tg}>{tg}</Pill>)}</td>
        <td>{(t.content||'').slice(0,300)}</td></tr>)}</tbody></table>
    )}</Card>
  </div>);
}
