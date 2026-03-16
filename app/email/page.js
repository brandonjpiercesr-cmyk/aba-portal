'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, friendlyTime, Modal } from '../../components/UI';

export default function EmailPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grant, setGrant] = useState('all');
  const [hours, setHours] = useState('24');
  const [viewing, setViewing] = useState(null);

  async function load() {
    setLoading(true);
    const d = await fetch(`/api/email?grant=${grant}&hours=${hours}`).then(r=>r.json());
    setEmails(d.emails||[]); setLoading(false);
  }
  useEffect(()=>{load();},[grant, hours]);

  const grantColor = g => ({claudette:'info',brandon_personal:'orange',bdif:'ok',brandon_gmg:'warn',bj:'dim',brandon_alt:'dim'}[g]||'dim');

  return (<div>
    <PageTitle right={<span className="text-dim text-xs">{emails.length.toLocaleString()} emails</span>}>Email Audit</PageTitle>
    <div className="flex gap-2 mb-4 flex-wrap">
      <select className="w-48" value={grant} onChange={e=>setGrant(e.target.value)}>
        <option value="all">All Grants (6)</option>
        <option value="claudette">ABA / Claudette</option>
        <option value="brandon_personal">Brandon Personal</option>
        <option value="brandon_gmg">Brandon GMG</option>
        <option value="bdif">BDIF</option>
        <option value="bj">BJ Pierce</option>
        <option value="brandon_alt">Brandon Alt</option>
      </select>
      <select className="w-32" value={hours} onChange={e=>setHours(e.target.value)}>
        <option value="6">6 hours</option><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option>
      </select>
      <Btn onClick={load}>Refresh</Btn>
    </div>
    <Card>{loading?<Loading/>:(
      <table><thead><tr><th>Time</th><th>Grant</th><th>From</th><th>To</th><th>Subject</th><th>Snippet</th></tr></thead>
      <tbody>{emails.map((e,i)=>(
        <tr key={i} className="cursor-pointer" onClick={()=>setViewing(e)}>
          <td className="mono whitespace-nowrap">{friendlyTime(e.date)}</td>
          <td><Tag variant={grantColor(e.grant)}>{e.grantLabel||e.grant}</Tag></td>
          <td className="max-w-[150px] truncate">{e.from_name||e.from}</td>
          <td className="max-w-[180px] truncate">{(e.to||[]).join(', ')}</td>
          <td className="font-medium text-white max-w-[220px] truncate">{e.subject}</td>
          <td className="text-dim max-w-[200px] truncate">{e.snippet}</td>
        </tr>
      ))}</tbody></table>
    )}</Card>

    <Modal open={!!viewing} onClose={()=>setViewing(null)} title={viewing?.subject||'Email Details'}>
      {viewing && (<div className="space-y-3">
        <div><span className="text-dim text-xs">Grant:</span> <Tag variant={grantColor(viewing.grant)}>{viewing.grantLabel||viewing.grant}</Tag></div>
        <div><span className="text-dim text-xs">From:</span> <span className="text-white">{viewing.from_name} ({viewing.from})</span></div>
        <div><span className="text-dim text-xs">To:</span> <span>{(viewing.to||[]).join(', ')}</span></div>
        {viewing.cc?.length > 0 && <div><span className="text-dim text-xs">CC:</span> <span>{viewing.cc.join(', ')}</span></div>}
        <div><span className="text-dim text-xs">Time:</span> <span className="mono">{viewing.date}</span></div>
        <div><span className="text-dim text-xs">Thread:</span> <span className="mono text-dim">{viewing.thread_id}</span></div>
        <div><span className="text-dim text-xs">Message ID:</span> <span className="mono text-dim">{viewing.id}</span></div>
        <div className="border-t border-border pt-3"><span className="text-dim text-xs">Snippet:</span><p className="mt-1">{viewing.snippet}</p></div>
      </div>)}
    </Modal>
  </div>);
}
