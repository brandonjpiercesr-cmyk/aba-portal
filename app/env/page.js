'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Modal } from '../../components/UI';
export default function EnvPage() {
  const [env, setEnv] = useState([]);
  const [loading, setLoading] = useState(true);
  const [service, setService] = useState('abacia-services');
  const [editing, setEditing] = useState(null);
  const [newVal, setNewVal] = useState('');
  async function load() { setLoading(true); const d=await fetch(`/api/env?service=${service}`).then(r=>r.json()); setEnv(d.env||[]); setLoading(false); }
  useEffect(()=>{load();},[service]);
  async function saveEnv() {
    await fetch('/api/env',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({service,key:editing,value:newVal})});
    setEditing(null); setNewVal(''); load();
  }
  return (<div>
    <PageTitle>Environment Variables</PageTitle>
    <div className="flex gap-2 mb-4">
      <select className="w-48" value={service} onChange={e=>setService(e.target.value)}>
        <option value="abacia-services">abacia-services</option><option value="myaba">myaba</option><option value="reach-services">reach-services</option>
      </select><Btn onClick={load}>Refresh</Btn>
    </div>
    <Card>{loading?<Loading/>:(
      <table><thead><tr><th>Key</th><th>Value (masked)</th><th></th></tr></thead>
      <tbody>{env.map(e=><tr key={e.key}><td className="mono font-semibold">{e.key}</td><td className="mono text-dim">{e.value}</td>
        <td><Btn onClick={()=>{setEditing(e.key);setNewVal('');}}>Update</Btn></td></tr>)}</tbody></table>
    )}</Card>
    <Modal open={!!editing} onClose={()=>setEditing(null)} title={`Update: ${editing}`}>
      <div className="space-y-3">
        <div><label className="text-[10px] text-dim">New Value</label><input type="text" value={newVal} onChange={e=>setNewVal(e.target.value)} placeholder="Enter new value..." /></div>
        <div className="flex gap-2"><Btn variant="primary" size="md" onClick={saveEnv}>Save</Btn><Btn size="md" onClick={()=>setEditing(null)}>Cancel</Btn></div>
      </div>
    </Modal>
  </div>);
}
