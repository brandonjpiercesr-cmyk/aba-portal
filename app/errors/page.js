'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, Pill, shortDate } from '../../components/UI';
export default function ErrorsPage() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState('24');
  async function load() { setLoading(true); const d=await fetch(`/api/errors?hours=${hours}`).then(r=>r.json()); setErrors(d.errors||[]); setLoading(false); }
  useEffect(()=>{load();},[hours]);
  return (<div>
    <PageTitle right={<span className="text-dim text-xs">{errors.length} errors</span>}>Error Log</PageTitle>
    <div className="flex gap-2 mb-4">
      <select className="w-32" value={hours} onChange={e=>setHours(e.target.value)}>
        <option value="6">6h</option><option value="24">24h</option><option value="72">3d</option><option value="168">7d</option>
      </select><Btn onClick={load}>Refresh</Btn>
    </div>
    <Card>{loading?<Loading/>:errors.length===0?<div className="text-dim text-center py-8">No errors found</div>:(
      <table><thead><tr><th>Time</th><th>Type</th><th>Source</th><th>Content</th></tr></thead>
      <tbody>{errors.map(e=><tr key={e.id}><td className="mono whitespace-nowrap">{shortDate(e.created_at)}</td>
        <td><Tag variant="err">{e.memory_type}</Tag></td><td className="mono max-w-[180px] truncate">{e.source}</td>
        <td className="max-w-[400px]">{(e.content||'').slice(0,300)}</td></tr>)}</tbody></table>
    )}</Card>
  </div>);
}
