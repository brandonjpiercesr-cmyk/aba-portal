'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, friendlyDate } from '../../components/UI';

export default function RenderPage() {
  const [services, setServices] = useState([]);
  const [deploys, setDeploys] = useState({});
  const [envVars, setEnvVars] = useState({});
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const d = await fetch('/api/render').then(r=>r.json());
    setServices(d.services||[]);
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  async function loadDeploys(id) {
    const d = await fetch(`/api/render?action=deploys&service=${id}`).then(r=>r.json());
    setDeploys(prev=>({...prev,[id]:d.deploys||[]}));
  }

  async function loadEnv(id) {
    const d = await fetch(`/api/render?action=env&service=${id}`).then(r=>r.json());
    setEnvVars(prev=>({...prev,[id]:d.env||[]}));
  }

  async function triggerDeploy(id, name) {
    if(!confirm(`Deploy ${name} now?`)) return;
    await fetch('/api/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service:id})});
    alert('Deploy triggered for '+name);
    loadDeploys(id);
  }

  const typeLabel = t => ({web_service:'Web',background_worker:'Worker',static_site:'Static',cron_job:'Cron'}[t]||t);

  return (<div>
    <PageTitle right={<><Btn onClick={load}>Refresh</Btn><span className="text-dim text-xs">{services.length} services</span></>}>Render Services</PageTitle>
    {loading?<Loading/>:services.map(s=>(
      <Card key={s.id} title={<><span className={`inline-block w-2 h-2 rounded-full mr-2 ${s.status==='active'?'bg-green-400':'bg-red-400'}`}></span>{s.name} <Tag variant="dim">{typeLabel(s.type)}</Tag></>}
        actions={<><Btn variant="primary" onClick={()=>triggerDeploy(s.id,s.name)}>Deploy</Btn><Btn onClick={()=>loadDeploys(s.id)}>Deploys</Btn><Btn onClick={()=>loadEnv(s.id)}>Env Vars</Btn></>}>
        <div className="text-xs text-dim mb-2">
          {s.url && <span>URL: <a href={'https://'+s.url} target="_blank" className="text-accent">{s.url}</a></span>}
          {s.repo && <span className="ml-4">Repo: <span className="mono">{s.repo}</span></span>}
        </div>

        {deploys[s.id]&&(<div className="mt-2"><table><thead><tr><th>ID</th><th>Status</th><th>Commit</th><th>Created</th></tr></thead>
          <tbody>{deploys[s.id].map(d=>{const dep=d.deploy||d; return <tr key={dep.id}>
            <td className="mono text-xs">{(dep.id||'').slice(0,16)}</td>
            <td><Tag variant={dep.status==='live'?'ok':dep.status==='build_failed'?'err':'warn'}>{dep.status}</Tag></td>
            <td className="mono text-xs">{(dep.commit?.id||'?').slice(0,8)}</td>
            <td className="mono text-xs">{dep.createdAt?friendlyDate(dep.createdAt):''}</td></tr>})}</tbody></table></div>
        )}

        {envVars[s.id]&&(<div className="mt-2"><table><thead><tr><th>Key</th><th>Value (masked)</th></tr></thead>
          <tbody>{envVars[s.id].map(e=><tr key={e.key}><td className="mono text-xs font-semibold">{e.key}</td><td className="mono text-xs text-dim">{e.value}</td></tr>)}</tbody></table></div>
        )}
      </Card>
    ))}
  </div>);
}
