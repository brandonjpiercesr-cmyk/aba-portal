'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, shortDate } from '../../components/UI';
export default function AwaPage() {
  const [jobs, setJobs] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const [j,a] = await Promise.all([fetch('/api/awa?table=jobs').then(r=>r.json()),fetch('/api/awa?table=applications').then(r=>r.json())]);
    setJobs(j.data||[]); setApps(a.data||[]); setLoading(false);
  }
  useEffect(()=>{load();},[]);
  return (<div>
    <PageTitle right={<Btn onClick={load}>Refresh</Btn>}>AWA Pipeline</PageTitle>
    <Card title={`Jobs (${jobs.length})`}>{loading?<Loading/>:jobs.length===0?<div className="text-dim py-4">No jobs</div>:(
      <table><thead><tr><th>Company</th><th>Title</th><th>Status</th><th>Assigned</th><th>Created</th></tr></thead>
      <tbody>{jobs.slice(0,40).map(j=><tr key={j.id}><td>{j.company_name}</td><td>{j.job_title}</td>
        <td><Tag variant={j.status==='applied'?'ok':j.status==='draft'?'warn':'dim'}>{j.status}</Tag></td>
        <td>{j.assigned_to}</td><td className="mono">{j.created_at?shortDate(j.created_at):''}</td></tr>)}</tbody></table>
    )}</Card>
    <Card title={`Applications (${apps.length})`}>{loading?<Loading/>:apps.length===0?<div className="text-dim py-4">No applications</div>:(
      <table><thead><tr><th>Job</th><th>Company</th><th>Applicant</th><th>Status</th><th>Created</th></tr></thead>
      <tbody>{apps.slice(0,40).map(a=><tr key={a.id}><td>{a.job_title}</td><td>{a.company_name}</td>
        <td>{a.applicant_name||a.user_id}</td><td><Tag>{a.status}</Tag></td>
        <td className="mono">{a.created_at?shortDate(a.created_at):''}</td></tr>)}</tbody></table>
    )}</Card>
  </div>);
}
