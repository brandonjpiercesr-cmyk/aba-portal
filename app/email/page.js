'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, Pill, shortTime } from '../../components/UI';
export default function EmailPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grant, setGrant] = useState('all');
  const [hours, setHours] = useState('24');
  async function load() {
    setLoading(true);
    const d = await fetch(`/api/email?grant=${grant}&hours=${hours}`).then(r=>r.json());
    setEmails(d.emails||[]); setLoading(false);
  }
  useEffect(()=>{load();},[grant,hours]);
  return (<div>
    <PageTitle right={<span className="text-dim text-xs">{emails.length} emails</span>}>Email Audit</PageTitle>
    <div className="flex gap-2 mb-4">
      <select className="w-40" value={grant} onChange={e=>setGrant(e.target.value)}>
        <option value="all">All Grants</option><option value="claudette">Claudette</option><option value="brandon">Brandon Personal</option><option value="bdif">BDIF</option>
      </select>
      <select className="w-32" value={hours} onChange={e=>setHours(e.target.value)}>
        <option value="6">6 hours</option><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option>
      </select>
      <Btn onClick={load}>Refresh</Btn>
    </div>
    <Card>{loading?<Loading/>:(
      <table><thead><tr><th>Time</th><th>Grant</th><th>From</th><th>To</th><th>Subject</th><th>Snippet</th></tr></thead>
      <tbody>{emails.map((e,i)=>{
        const gv=e.grant==='claudette'?'info':e.grant==='brandon'?'orange':'ok';
        return <tr key={i}><td className="mono whitespace-nowrap">{shortTime(e.date)}</td><td><Tag variant={gv}>{e.grant}</Tag></td>
        <td>{e.from_name||e.from}</td><td className="max-w-[200px]">{(e.to||[]).join(', ')}</td>
        <td className="font-medium text-white max-w-[250px]">{e.subject}</td><td className="text-dim max-w-[200px]">{e.snippet}</td></tr>
      })}</tbody></table>
    )}</Card>
  </div>);
}
