'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, friendlyDate, Modal } from '../../components/UI';

export default function TrainingPage() {
  const [notes, setNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [newNote, setNewNote] = useState('');

  async function load() { setLoading(true); const d=await fetch('/api/ccwa').then(r=>r.json()); setNotes(d.notes||[]); setTotal(d.total||0); setLoading(false); }
  useEffect(()=>{load();},[]);

  async function addNote() {
    await fetch('/api/brain', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ source: `aoa_manual_training_${Date.now()}`, memory_type: 'ccwa_training_note', content: newNote, importance: 8, tags: ['ccwa','training','aoa_portal','T10_HAM_manual'] })
    });
    setAdding(false); setNewNote(''); load();
  }

  const filtered = notes.filter(n => !search || (n.content||'').toLowerCase().includes(search.toLowerCase()) || (n.source||'').toLowerCase().includes(search.toLowerCase()));

  return (<div>
    <PageTitle right={<><Btn variant="primary" size="md" onClick={()=>setAdding(true)}>+ Add Training Note</Btn><span className="text-dim text-xs">{total} total</span></>}>CCWA Training Notes</PageTitle>
    <div className="flex gap-2 mb-4">
      <input className="flex-1" placeholder="Search training notes..." value={search} onChange={e=>setSearch(e.target.value)} />
      <Btn onClick={load}>Refresh</Btn>
    </div>
    <Card>{loading?<Loading/>:(
      <table><thead><tr><th>Created</th><th>Source</th><th>Content</th></tr></thead>
      <tbody>{filtered.map(n=><tr key={n.id} data-aba-ctx={JSON.stringify({type:'training_note',label:n.source,data:{content:(n.content||'').slice(0,200)}})}>
        <td className="mono whitespace-nowrap">{friendlyDate(n.created_at)}</td>
        <td className="mono max-w-[200px] truncate">{n.source}</td>
        <td className="max-w-[500px]">{(n.content||'').slice(0,300)}</td></tr>)}</tbody></table>
    )}</Card>

    <Modal open={adding} onClose={()=>setAdding(false)} title="Add CCWA Training Note (T10 HAM Manual)">
      <div className="space-y-3">
        <div><label className="text-[10px] text-dim uppercase">Training Content</label>
          <textarea rows={10} value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="What should ABAbase learn?" /></div>
        <Btn variant="primary" size="md" onClick={addNote}>Save Training Note</Btn>
      </div>
    </Modal>
  </div>);
}
