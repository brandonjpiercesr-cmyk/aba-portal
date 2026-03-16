'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, friendlyDate, describeType } from '../../components/UI';

export default function ErrorsPage() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState('24');
  const [search, setSearch] = useState('');

  async function load() { setLoading(true); const d=await fetch(`/api/errors?hours=${hours}`).then(r=>r.json()); setErrors(d.errors||[]); setLoading(false); }
  useEffect(()=>{load();},[hours]);

  const filtered = errors.filter(e => !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase()));

  return (<div>
    <PageTitle right={<span className="text-dim text-xs">{filtered.length} errors</span>}>Error Log</PageTitle>
    <div className="flex gap-2 mb-4">
      <input className="flex-1" placeholder="Search errors..." value={search} onChange={e=>setSearch(e.target.value)} />
      <select className="w-32" value={hours} onChange={e=>setHours(e.target.value)}>
        <option value="6">6h</option><option value="24">24h</option><option value="72">3d</option><option value="168">7d</option>
      </select>
      <Btn onClick={load}>Refresh</Btn>
    </div>
    <Card>{loading?<Loading/>:filtered.length===0?<div className="text-dim text-center py-8">No errors found</div>:(
      <table><thead><tr><th>Time</th><th>What</th><th>Source</th><th>Content</th></tr></thead>
      <tbody>{filtered.map(e=><tr key={e.id} data-aba-ctx={JSON.stringify({type:'error',label:e.source,data:{type:e.memory_type,content:(e.content||'').slice(0,200)}})}>
        <td className="mono whitespace-nowrap">{friendlyDate(e.created_at)}</td>
        <td><Tag variant="err">{describeType(e.memory_type)}</Tag></td>
        <td className="mono max-w-[180px] truncate">{e.source}</td>
        <td className="max-w-[400px]">{(e.content||'').slice(0,300)}</td></tr>)}</tbody></table>
    )}</Card>
  </div>);
}
