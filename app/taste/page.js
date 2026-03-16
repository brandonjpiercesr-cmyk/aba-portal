'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, shortDate } from '../../components/UI';
export default function TastePage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const d=await fetch('/api/taste').then(r=>r.json()); setBatches(d.batches||[]); setLoading(false); }
  useEffect(()=>{load();},[]);
  return (<div>
    <PageTitle right={<Btn onClick={load}>Refresh</Btn>}>TASTE Batch Processing</PageTitle>
    <Card>{loading?<Loading/>:(
      <table><thead><tr><th>Time</th><th>Type</th><th>Source</th><th>Data</th></tr></thead>
      <tbody>{batches.map(b=>{
        let parsed={}; try{parsed=typeof b.content==='string'?JSON.parse(b.content):b.content}catch{}
        return <tr key={b.id}><td className="mono whitespace-nowrap">{shortDate(b.created_at)}</td>
          <td><Tag variant={b.memory_type==='taste_batch_summary'?'info':'dim'}>{b.memory_type}</Tag></td>
          <td className="mono">{b.source}</td>
          <td><pre className="text-[10px] max-w-[400px]">{JSON.stringify(parsed,null,1).slice(0,300)}</pre></td></tr>
      })}</tbody></table>
    )}</Card>
  </div>);
}
