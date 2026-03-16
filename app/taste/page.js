'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, friendlyDate } from '../../components/UI';

export default function TastePage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load() { setLoading(true); const d=await fetch('/api/taste').then(r=>r.json()); setBatches(d.batches||[]); setLoading(false); }
  useEffect(()=>{load();},[]);

  const filtered = batches.filter(b => !search || JSON.stringify(b).toLowerCase().includes(search.toLowerCase()));

  return (<div>
    <PageTitle right={<Btn onClick={load}>Refresh</Btn>}>TASTE Batch Processing</PageTitle>
    <div className="glass-card p-3 mb-4 text-xs text-dim">
      <strong className="text-white">TASTE</strong> (Transcription and Speech-To-text Engine) compiles raw fragments from OMI, uploaded transcripts, meeting mode, and interview mode into coherent sessions. TASTE picks the best words, deduplicates, and routes processed sessions through AIR. OMI is just one source that feeds TASTE.
    </div>
    <div className="flex gap-2 mb-4"><input className="flex-1" placeholder="Search batches..." value={search} onChange={e=>setSearch(e.target.value)} /></div>
    <Card>{loading?<Loading/>:filtered.length===0?<div className="text-dim py-4">No batches</div>:(
      <table><thead><tr><th>Time</th><th>Type</th><th>Source</th><th>Data</th></tr></thead>
      <tbody>{filtered.map(b=>{
        let parsed={}; try{parsed=typeof b.content==='string'?JSON.parse(b.content):b.content}catch{}
        const isSummary = b.memory_type === 'taste_batch_summary';
        return <tr key={b.id} data-aba-ctx={JSON.stringify({type:'taste_batch',label:b.source,data:parsed})}>
          <td className="mono whitespace-nowrap">{friendlyDate(b.created_at)}</td>
          <td><Tag variant={isSummary?'info':'dim'}>{isSummary?'Batch Summary':'Session Result'}</Tag></td>
          <td className="mono text-xs">{b.source}</td>
          <td className="max-w-[400px]">
            {isSummary ? (
              <div className="text-xs">
                <span className="text-white">{parsed.fragmentsFound||0} fragments</span> compiled into <span className="text-white">{parsed.sessionsCreated||0} sessions</span>,
                {' '}{parsed.duplicatesSkipped||0} dupes skipped, {parsed.errors||0} errors, took {parsed.duration_seconds||0}s
              </div>
            ) : (
              <div className="text-xs">
                Session: <span className="mono">{parsed.session_id||'?'}</span> | HAM: {parsed.ham||'?'} |
                Duplicate: {parsed.duplicate?.isDuplicate?'Yes':'No'}
              </div>
            )}
          </td></tr>;
      })}</tbody></table>
    )}</Card>
  </div>);
}
