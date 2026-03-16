'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, shortDate } from '../../components/UI';
export default function TrainingPage() {
  const [notes, setNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const d=await fetch('/api/ccwa').then(r=>r.json()); setNotes(d.notes||[]); setTotal(d.total||0); setLoading(false); }
  useEffect(()=>{load();},[]);
  return (<div>
    <PageTitle right={<><Btn onClick={load}>Refresh</Btn><span className="text-dim text-xs">{total} total</span></>}>CCWA Training Notes</PageTitle>
    <Card>{loading?<Loading/>:(
      <table><thead><tr><th>Created</th><th>Source</th><th>Content</th></tr></thead>
      <tbody>{notes.map(n=><tr key={n.id}><td className="mono whitespace-nowrap">{shortDate(n.created_at)}</td>
        <td className="mono max-w-[200px] truncate">{n.source}</td>
        <td className="max-w-[500px]">{(n.content||'').slice(0,300)}</td></tr>)}</tbody></table>
    )}</Card>
  </div>);
}
