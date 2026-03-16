'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, shortDate } from '../../components/UI';
export default function RenderPage() {
  const [services, setServices] = useState([]);
  const [deploys, setDeploys] = useState({});
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); const d=await fetch('/api/render').then(r=>r.json()); setServices(d.services||[]); setLoading(false); }
  useEffect(()=>{load();},[]);
  async function loadDeploys(name) {
    const d=await fetch(`/api/render?action=deploys&service=${name}`).then(r=>r.json());
    setDeploys(prev=>({...prev,[name]:d.deploys||[]}));
  }
  async function triggerDeploy(name) {
    if(!confirm(`Deploy ${name} now?`)) return;
    await fetch('/api/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:name})});
    alert('Deploy triggered'); load();
  }
  return (<div>
    <PageTitle right={<Btn onClick={load}>Refresh</Btn>}>Render Services</PageTitle>
    {loading?<Loading/>:services.map(s=>(
      <Card key={s.name} title={<><span className={`inline-block w-2 h-2 rounded-full mr-2 ${s.status==='active'?'bg-green-400':'bg-red-400'}`}></span>{s.name}</>}
        actions={<><Btn onClick={()=>triggerDeploy(s.name)} variant="primary">Deploy</Btn><Btn onClick={()=>loadDeploys(s.name)}>Deploys</Btn></>}>
        <div className="text-xs text-dim mb-2">Type: {s.type} | URL: <a href={s.url} target="_blank" className="text-accent">{s.url||'N/A'}</a></div>
        {deploys[s.name]&&(
          <table><thead><tr><th>ID</th><th>Status</th><th>Commit</th><th>Created</th></tr></thead>
          <tbody>{deploys[s.name].map(d=>{const dep=d.deploy||d; return <tr key={dep.id}>
            <td className="mono">{(dep.id||'').slice(0,16)}</td>
            <td><Tag variant={dep.status==='live'?'ok':dep.status==='build_failed'?'err':'warn'}>{dep.status}</Tag></td>
            <td className="mono">{(dep.commit?.id||'?').slice(0,8)}</td>
            <td className="mono">{dep.createdAt?shortDate(dep.createdAt):''}</td></tr>})}</tbody></table>
        )}
      </Card>
    ))}
  </div>);
}
