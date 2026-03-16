'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, friendlyDate, Modal } from '../../components/UI';

export default function AwaPage() {
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState(null);

  async function load() {
    setLoading(true);
    const [j,a] = await Promise.all([fetch('/api/awa?table=jobs').then(r=>r.json()),fetch('/api/awa?table=applications').then(r=>r.json())]);
    setJobs(j.data||[]); setApps(a.data||[]); setLoading(false);
  }
  useEffect(()=>{load();},[]);

  async function deleteJob(id) {
    if(!confirm('Delete this job from the pipeline?')) return;
    await fetch(`/api/awa?id=${id}`,{method:'DELETE'});
    load();
  }

  const filtered = jobs.filter(j => !search || JSON.stringify(j).toLowerCase().includes(search.toLowerCase()));
  const statusColor = s => ({NEW:'info',SAVED:'dim',MATERIALS_READY:'warn',APPLIED:'ok',INTERVIEW_SCHEDULED:'orange',OFFER:'ok',DISMISSED:'err'}[s]||'dim');

  return (<div>
    <PageTitle right={<><Btn onClick={load}>Refresh</Btn><span className="text-dim text-xs">{jobs.length} jobs, {apps.length} applications</span></>}>AWA Pipeline</PageTitle>
    <div className="flex gap-2 mb-4">
      <input className="flex-1" placeholder="Search jobs by title, company, status..." value={search} onChange={e=>setSearch(e.target.value)} />
    </div>

    <Card title={`Jobs (${filtered.length})`}>{loading?<Loading/>:filtered.length===0?<div className="text-dim py-4">No jobs</div>:(
      <table><thead><tr><th>Company</th><th>Title</th><th>Status</th><th>Assigned</th><th>Cover Letter</th><th>Created</th><th></th></tr></thead>
      <tbody>{filtered.slice(0,60).map(j=>(
        <tr key={j.id} className="cursor-pointer" data-aba-ctx={JSON.stringify({type:'awa_job',label:(j.job_title||'')+' at '+(j.organization||''),data:{id:j.id,title:j.job_title,org:j.organization,status:j.status}})}>
          <td className="font-medium text-white max-w-[180px]" onClick={()=>setViewing(j)}>{j.organization||j.company_name||'?'}</td>
          <td className="max-w-[200px]" onClick={()=>setViewing(j)}>{j.job_title||j.title||'?'}</td>
          <td><Tag variant={statusColor(j.status)}>{j.status||'NEW'}</Tag></td>
          <td className="text-xs">{(j.assignees||[]).join(', ')||j.assigned_to||'-'}</td>
          <td>{j.cover_letter?<Tag variant="ok">Yes</Tag>:<Tag variant="dim">No</Tag>}</td>
          <td className="mono text-xs">{j.created_at?friendlyDate(j.created_at):''}</td>
          <td><Btn variant="danger" onClick={()=>deleteJob(j.id)}>Del</Btn></td>
        </tr>
      ))}</tbody></table>
    )}</Card>

    <Card title={`Applications Sent (${apps.length})`}>{loading?<Loading/>:apps.length===0?<div className="text-dim py-4">No applications</div>:(
      <table><thead><tr><th>Time</th><th>Details</th></tr></thead>
      <tbody>{apps.slice(0,30).map(a=>{
        const c = typeof a.content==='string'?JSON.parse(a.content):a.content;
        return <tr key={a.id}><td className="mono text-xs whitespace-nowrap">{friendlyDate(a.created_at)}</td>
          <td>{c.job_title||''} at {c.company_name||c.organization||''} - sent to {c.email_to||'?'}</td></tr>;
      })}</tbody></table>
    )}</Card>

    <Modal open={!!viewing} onClose={()=>setViewing(null)} title={`${viewing?.job_title||'Job'} at ${viewing?.organization||'?'}`}>
      {viewing&&(<div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><span className="text-dim text-[10px]">Status</span><div><Tag variant={statusColor(viewing.status)}>{viewing.status||'NEW'}</Tag></div></div>
          <div><span className="text-dim text-[10px]">Assigned To</span><div>{(viewing.assignees||[]).join(', ')||'-'}</div></div>
          <div><span className="text-dim text-[10px]">URL</span><div>{viewing.url?<a href={viewing.url} target="_blank" className="text-accent text-xs break-all">{viewing.url}</a>:'-'}</div></div>
          <div><span className="text-dim text-[10px]">Salary</span><div>{viewing.salary||viewing.compensation||'-'}</div></div>
          <div><span className="text-dim text-[10px]">Location</span><div>{viewing.location||'-'}</div></div>
          <div><span className="text-dim text-[10px]">Created</span><div className="mono text-xs">{viewing.created_at?friendlyDate(viewing.created_at):'-'}</div></div>
        </div>
        {viewing.cover_letter&&(<div><span className="text-dim text-[10px]">Cover Letter</span><pre className="bg-bg p-3 rounded text-xs max-h-[200px] overflow-y-auto mt-1">{viewing.cover_letter}</pre></div>)}
        {viewing.resume_version&&(<div><span className="text-dim text-[10px]">Resume Version</span><div className="text-xs">{viewing.resume_version}</div></div>)}
        <pre className="bg-bg p-3 rounded text-[10px] max-h-[200px] overflow-y-auto">{JSON.stringify(viewing,null,2)}</pre>
      </div>)}
    </Modal>
  </div>);
}
