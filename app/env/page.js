'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Modal } from '../../components/UI';

export default function EnvPage() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [env, setEnv] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingEnv, setLoadingEnv] = useState(false);
  const [editing, setEditing] = useState(null);
  const [newVal, setNewVal] = useState('');

  async function loadServices() {
    setLoadingServices(true);
    const d = await fetch('/api/render').then(r=>r.json());
    setServices((d.services||[]).filter(s=>s.type==='web_service'||s.type==='background_worker'));
    setLoadingServices(false);
  }

  async function loadEnv(serviceId) {
    if(!serviceId) return;
    setLoadingEnv(true);
    setSelectedService(serviceId);
    const d = await fetch(`/api/render?action=env&service=${serviceId}`).then(r=>r.json());
    setEnv(d.env||[]);
    setLoadingEnv(false);
  }

  useEffect(()=>{loadServices();},[]);

  async function saveEnv() {
    await fetch('/api/env',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:selectedService,key:editing,value:newVal})});
    setEditing(null); setNewVal('');
    loadEnv(selectedService);
  }

  const serviceName = services.find(s=>s.id===selectedService)?.name || '';

  return (<div>
    <PageTitle>Environment Variables</PageTitle>
    <div className="flex gap-2 mb-4 flex-wrap">
      {loadingServices ? <Loading text="Loading services..." /> : services.map(s=>(
        <Btn key={s.id} variant={selectedService===s.id?'primary':'default'} size="md" onClick={()=>loadEnv(s.id)}>{s.name}</Btn>
      ))}
    </div>
    {selectedService && (
      <Card title={`${serviceName} Environment Variables`}>
        {loadingEnv?<Loading/>:env.length===0?<div className="text-dim py-4">No env vars or service not accessible</div>:(
          <table><thead><tr><th>Key</th><th>Value (masked)</th><th></th></tr></thead>
          <tbody>{env.map(e=><tr key={e.key}><td className="mono text-xs font-semibold">{e.key}</td><td className="mono text-xs text-dim">{e.value}</td>
            <td><Btn onClick={()=>{setEditing(e.key);setNewVal('');}}>Update</Btn></td></tr>)}</tbody></table>
        )}
      </Card>
    )}
    <Modal open={!!editing} onClose={()=>setEditing(null)} title={`Update ${editing} on ${serviceName}`}>
      <div className="space-y-3">
        <div><label className="text-[10px] text-dim">New Value</label><input type="text" value={newVal} onChange={e=>setNewVal(e.target.value)} placeholder="Enter new value..." /></div>
        <div className="flex gap-2"><Btn variant="primary" size="md" onClick={saveEnv}>Save</Btn><Btn size="md" onClick={()=>setEditing(null)}>Cancel</Btn></div>
      </div>
    </Modal>
  </div>);
}
