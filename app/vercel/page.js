'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, friendlyDate } from '../../components/UI';

export default function VercelPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const d = await fetch('/api/vercel').then(r=>r.json());
    setProjects(d.projects||[]);
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  const filtered = projects.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (<div>
    <PageTitle right={<><Btn onClick={load}>Refresh</Btn><span className="text-dim text-xs">{projects.length} projects</span></>}>Vercel Projects</PageTitle>
    <div className="flex gap-2 mb-4">
      <input className="flex-1" placeholder="Filter projects..." value={search} onChange={e=>setSearch(e.target.value)} />
    </div>
    {loading?<Loading/>:(
      <Card>
        <table><thead><tr><th>Name</th><th>URL</th><th>Framework</th><th>Updated</th></tr></thead>
        <tbody>{filtered.map(p=>(
          <tr key={p.id}>
            <td className="font-semibold text-white">{p.name}</td>
            <td>{p.url ? <a href={'https://'+p.url} target="_blank" className="text-accent text-xs">{p.url}</a> : <span className="text-dim">N/A</span>}</td>
            <td><Tag variant="dim">{p.framework||'unknown'}</Tag></td>
            <td className="mono text-xs">{p.updatedAt ? friendlyDate(p.updatedAt) : ''}</td>
          </tr>
        ))}</tbody></table>
      </Card>
    )}
  </div>);
}
