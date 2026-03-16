'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Empty, Btn, Pill, Tag, Modal, friendlyDate, describeType } from '../../components/UI';

export default function BrainPage() {
  const [results, setResults] = useState([]);
  const [types, setTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [limit, setLimit] = useState(50);
  const [viewing, setViewing] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ source: '', memory_type: '', content: '', importance: 5 });

  useEffect(()=>{ fetch('/api/brain?action=types').then(r=>r.json()).then(d=>setTypes(d.types||[])); },[]);

  async function search() {
    setLoading(true);
    const params = new URLSearchParams({limit});
    if(q) params.set('q',q);
    if(type) params.set('type',type);
    const d = await fetch(`/api/brain?${params}`).then(r=>r.json());
    setResults(d.data||[]); setTotal(d.total||0); setLoading(false);
  }

  async function deleteEntry(id) { if(!confirm('Delete #'+id+'?')) return; await fetch(`/api/brain?id=${id}`,{method:'DELETE'}); search(); }

  async function addEntry() {
    await fetch('/api/brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newEntry, source: `aoa_manual_${Date.now()}`, tags: ['aoa_portal', 'T10_HAM_manual'] })
    });
    // Use POST for new entries
    // Use the Supabase insert directly
    await fetch('/api/brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: null,
        source: newEntry.source || `aoa_manual_${Date.now()}`,
        memory_type: newEntry.memory_type,
        content: newEntry.content,
        importance: parseInt(newEntry.importance) || 5,
        tags: ['aoa_portal', 'T10_HAM_manual']
      })
    });
    setAdding(false);
    setNewEntry({ source: '', memory_type: '', content: '', importance: 5 });
    search();
  }

  return (<div>
    <PageTitle right={<Btn variant="primary" size="md" onClick={()=>setAdding(true)}>+ Add Memory</Btn>}>Brain Memory Search</PageTitle>
    <div className="flex gap-2 mb-4">
      <input className="flex-1" placeholder="Search content or source..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} />
      <select className="w-48" value={type} onChange={e=>setType(e.target.value)}>
        <option value="">All Types</option>
        {types.map(t=><option key={t} value={t}>{t}</option>)}
      </select>
      <input className="w-16" type="number" value={limit} onChange={e=>setLimit(e.target.value)} />
      <Btn variant="primary" size="md" onClick={search}>Search</Btn>
    </div>

    <Card>{loading?<Loading/>:results.length===0?<Empty text="Enter a search term and press Search"/>:(
      <><div className="text-dim text-xs mb-2">{total?.toLocaleString()} total results</div>
      <table><thead><tr><th>Created</th><th>What</th><th>Source</th><th>Content</th><th>Imp</th><th></th></tr></thead>
      <tbody>{results.map(m=>(
        <tr key={m.id} data-aba-ctx={JSON.stringify({type:'brain_entry',label:m.source,data:{id:m.id,type:m.memory_type,source:m.source}})}>
          <td className="mono whitespace-nowrap">{friendlyDate(m.created_at)}</td>
          <td title={m.memory_type}><Pill>{describeType(m.memory_type)}</Pill></td>
          <td className="mono max-w-[150px] truncate" title={m.source}>{m.source}</td>
          <td className="max-w-[350px] cursor-pointer hover:text-white" onClick={()=>setViewing(m)}>{(m.content||'').slice(0,180)}</td>
          <td>{m.importance||0}</td>
          <td><Btn variant="danger" onClick={()=>deleteEntry(m.id)}>Del</Btn></td>
        </tr>
      ))}</tbody></table></>
    )}</Card>

    <Modal open={!!viewing} onClose={()=>setViewing(null)} title={`Brain Entry #${viewing?.id}`}>
      {viewing&&(<div>
        <div className="flex gap-2 mb-2"><Pill>{describeType(viewing.memory_type)}</Pill><span className="mono text-dim text-xs">{viewing.source}</span></div>
        <div className="text-dim text-xs mb-3">{friendlyDate(viewing.created_at)} | Importance: {viewing.importance||0}</div>
        <pre className="bg-bg p-3 rounded text-xs max-h-[400px] overflow-y-auto">{viewing.content}</pre>
        {viewing.tags&&<div className="mt-2">{viewing.tags.map(t=><Pill key={t}>{t}</Pill>)}</div>}
      </div>)}
    </Modal>

    <Modal open={adding} onClose={()=>setAdding(false)} title="Add Brain Entry (T10 HAM Manual)">
      <div className="space-y-3">
        <div><label className="text-[10px] text-dim uppercase">Source</label><input value={newEntry.source} onChange={e=>setNewEntry({...newEntry,source:e.target.value})} placeholder="e.g. aoa_manual_note" /></div>
        <div><label className="text-[10px] text-dim uppercase">Memory Type</label><input value={newEntry.memory_type} onChange={e=>setNewEntry({...newEntry,memory_type:e.target.value})} placeholder="e.g. ccwa_training_note, writing_standards" /></div>
        <div><label className="text-[10px] text-dim uppercase">Content</label><textarea rows={6} value={newEntry.content} onChange={e=>setNewEntry({...newEntry,content:e.target.value})} placeholder="The actual content..." /></div>
        <div><label className="text-[10px] text-dim uppercase">Importance (1-10)</label><input type="number" min="1" max="10" value={newEntry.importance} onChange={e=>setNewEntry({...newEntry,importance:e.target.value})} /></div>
        <Btn variant="primary" size="md" onClick={addEntry}>Save to Brain</Btn>
      </div>
    </Modal>
  </div>);
}
