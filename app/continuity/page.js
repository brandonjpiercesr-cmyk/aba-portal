'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag } from '../../components/UI';

export default function ContinuityPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); const d=await fetch('/api/continuity').then(r=>r.json()); setData(d); setLoading(false); }
  useEffect(()=>{load();},[]);

  if(loading||!data) return <Loading/>;

  const statusColor = s => s==='up'||s==='configured'||s==='operational' ? 'text-green-400' : s==='degraded'?'text-yellow-400':'text-red-400';

  return (<div>
    <PageTitle right={<Btn onClick={load}>Refresh</Btn>}>Business Continuity</PageTitle>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
      <Stat value={<><span className={`inline-block w-2 h-2 rounded-full mr-2 ${data.overall==='operational'?'bg-green-400':'bg-yellow-400'}`}></span>{data.overall}</>} label="Overall" tooltip="Combined health of all systems" />
      <Stat value={data.ababase?.status||'?'} label="ABAbase" color={statusColor(data.ababase?.status)} tooltip="abacia-services.onrender.com health check" />
      <Stat value={data.supabase?.status||'?'} label="Supabase" color={statusColor(data.supabase?.status)} tooltip="Brain database connectivity" />
      <Stat value={data.render?.status||'?'} label="Render" color={statusColor(data.render?.status)} tooltip={`${data.render?.active||0} active, ${data.render?.suspended||0} suspended`} />
    </div>

    <Card title="API Key Status">
      {data.api_keys ? (
        <table><thead><tr><th>Service</th><th>Status</th><th>Used For</th></tr></thead>
        <tbody>
          {Object.entries(data.api_keys).filter(([k])=>k!=='status').map(([key, status])=>{
            const uses = {anthropic:'Primary ABA chat + tool use',gemini:'Background loops (FREE)',elevenlabs:'VARA voice calls',nylas:'Email sending/reading',github:'Code deployment',groq:'Backup if Anthropic down',perplexity:'Web research routing'};
            return <tr key={key}><td className="font-medium text-white capitalize">{key}</td>
              <td><Tag variant={status==='configured'?'ok':'err'}>{status}</Tag></td>
              <td className="text-dim text-xs">{uses[key]||''}</td></tr>;
          })}
        </tbody></table>
      ) : <Loading text="Could not load API key status" />}
    </Card>

    <Card title="Model Routing (911 Cost Fix)">
      {data.model_routing && (
        <table><thead><tr><th>Use Case</th><th>Model</th></tr></thead>
        <tbody>{Object.entries(data.model_routing).filter(([k])=>k!=='note').map(([key, val])=>(
          <tr key={key}><td className="text-white capitalize">{key.replace(/_/g,' ')}</td><td className="text-dim">{val}</td></tr>
        ))}</tbody></table>
      )}
      {data.model_routing?.note && <div className="mt-2 text-yellow-400/80 text-xs glass-card p-2">{data.model_routing.note}</div>}
    </Card>

    <Card title="Render Services">
      <div className="text-xs">
        <span className="text-white">{data.render?.active||0} active</span>
        <span className="text-dim mx-2">|</span>
        <span className="text-dim">{data.render?.suspended||0} suspended</span>
        <span className="text-dim mx-2">|</span>
        <span className="text-dim">{data.render?.total||0} total</span>
      </div>
    </Card>
  </div>);
}
