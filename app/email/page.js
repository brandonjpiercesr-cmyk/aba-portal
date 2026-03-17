'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, Pill, friendlyTime, friendlyDate, Modal } from '../../components/UI';

export default function EmailPage() {
  const [emails, setEmails] = useState([]);
  const [totalHuman, setTotalHuman] = useState(0);
  const [loading, setLoading] = useState(true);
  const [grant, setGrant] = useState('all');
  const [hours, setHours] = useState('24');
  const [mode, setMode] = useState('aba_only');
  const [viewing, setViewing] = useState(null);
  const [trace, setTrace] = useState(null);
  const [tracing, setTracing] = useState(false);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const d = await fetch(`/api/email?grant=${grant}&hours=${hours}&mode=${mode}`).then(r=>r.json());
    setEmails(d.emails||[]);
    setTotalHuman(d.totalIncludingHuman || 0);
    setLoading(false);
  }
  useEffect(()=>{load();},[grant,hours,mode]);

  async function traceEmail(email) {
    setViewing(email); setTracing(true); setTrace(null);
    const d = await fetch(`/api/email/trace?subject=${encodeURIComponent(email.subject)}&id=${email.id}&thread=${email.thread_id||''}`).then(r=>r.json());
    setTrace(d); setTracing(false);
  }

  const grantColor = g => ({claudette:'info',brandon_personal:'orange',bdif:'ok',brandon_gmg:'warn',bj:'dim',brandon_alt:'dim'}[g]||'dim');
  const filtered = emails.filter(e => !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase()));

  return (<div>
    <PageTitle right={<span className="text-dim text-xs">{filtered.length.toLocaleString()} ABA-initiated{mode==='all'?` (${totalHuman} total incl. human)`:''}</span>}>Email Audit</PageTitle>
    <div className="flex gap-2 mb-4 flex-wrap">
      <input className="flex-1 min-w-[200px]" placeholder="Search emails..." value={search} onChange={e=>setSearch(e.target.value)} />
      <Btn variant={mode==='aba_only'?'primary':'default'} size="md" onClick={()=>setMode('aba_only')}>ABA-Initiated Only</Btn>
      <Btn variant={mode==='all'?'primary':'default'} size="md" onClick={()=>setMode('all')}>All Sent</Btn>
      <select className="w-40" value={grant} onChange={e=>setGrant(e.target.value)}>
        <option value="all">All Grants (6)</option>
        <option value="claudette">ABA / Claudette</option>
        <option value="brandon_personal">Brandon Personal</option>
        <option value="brandon_gmg">Brandon GMG</option>
        <option value="bdif">BDIF</option>
        <option value="bj">BJ Pierce</option>
        <option value="brandon_alt">Brandon Alt</option>
      </select>
      <select className="w-24" value={hours} onChange={e=>setHours(e.target.value)}>
        <option value="6">6h</option><option value="24">24h</option><option value="72">3d</option><option value="168">7d</option>
      </select>
      <Btn onClick={load}>Refresh</Btn>
    </div>
    <Card>{loading?<Loading/>:(
      <table><thead><tr><th>Time</th><th>Grant</th><th>From</th><th>To</th><th>Subject</th><th></th></tr></thead>
      <tbody>{filtered.map((e,i)=>(
        <tr key={i} data-aba-ctx={JSON.stringify({type:'email',label:e.subject,data:{from:e.from,to:e.to,subject:e.subject,date:e.date,grant:e.grant}})}>
          <td className="mono whitespace-nowrap">{friendlyTime(e.date)}</td>
          <td><Tag variant={grantColor(e.grant)}>{e.grantLabel||e.grant}</Tag></td>
          <td className="max-w-[130px] truncate">{e.from_name||e.from}</td>
          <td className="max-w-[160px] truncate">{(e.to||[]).join(', ')}</td>
          <td className="font-medium text-white max-w-[250px] truncate">
            {!e.abaInitiated && <span className="text-dim text-[10px] mr-1">[human]</span>}
            {e.subject}
          </td>
          <td><Btn onClick={()=>traceEmail(e)}>Trace</Btn></td>
        </tr>
      ))}</tbody></table>
    )}</Card>

    <Modal open={!!viewing} onClose={()=>{setViewing(null);setTrace(null);}} title={viewing?.subject||'Email Trace'}>
      {viewing&&(<div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-dim">From:</span> {viewing.from_name} ({viewing.from})</div>
          <div><span className="text-dim">To:</span> {(viewing.to||[]).join(', ')}</div>
          <div><span className="text-dim">Grant:</span> <Tag variant={grantColor(viewing.grant)}>{viewing.grantLabel||viewing.grant}</Tag></div>
          <div><span className="text-dim">Time:</span> {friendlyDate(viewing.date)}</div>
          <div><span className="text-dim">ABA-Initiated:</span> {viewing.abaInitiated ? <Tag variant="info">Yes</Tag> : <Tag variant="dim">No (human sent)</Tag>}</div>
        </div>
        <div className="border-t border-white/[0.04] pt-3">
          <h3 className="text-xs font-bold text-white mb-2">What Triggered This Email</h3>
          {!viewing.abaInitiated ? (
            <div className="glass-card p-3 text-sm text-dim">This email was sent by a human, not by ABA. No automated trigger.</div>
          ) : tracing ? <Loading text="Tracing code path..." /> : trace ? (
            <div className="space-y-3">
              <div className="glass-card p-3 text-sm">{trace.explanation}</div>
              {trace.trace?.send_logs?.length>0&&<div><span className="text-dim text-[10px]">Send Logs ({trace.trace.send_logs.length})</span>
                {trace.trace.send_logs.map(l=><div key={l.id} className="text-xs mt-1 text-dim">{friendlyDate(l.created_at)}: {(l.content||'').slice(0,150)}</div>)}</div>}
              {trace.trace?.task_logs?.length>0&&<div><span className="text-dim text-[10px]">Task Logs ({trace.trace.task_logs.length})</span>
                {trace.trace.task_logs.map(l=><div key={l.id} className="text-xs mt-1 text-dim">{friendlyDate(l.created_at)}: {(l.content||'').slice(0,150)}</div>)}</div>}
              {trace.trace?.proactive?.length>0&&<div><span className="text-dim text-[10px]">Proactive Trigger ({trace.trace.proactive.length})</span>
                {trace.trace.proactive.map(l=><div key={l.id} className="text-xs mt-1 text-dim">{friendlyDate(l.created_at)}: {(l.content||'').slice(0,150)}</div>)}</div>}
              {trace.trace?.commands?.length>0&&<div><span className="text-dim text-[10px]">Voice Commands ({trace.trace.commands.length})</span>
                {trace.trace.commands.map(l=><div key={l.id} className="text-xs mt-1 text-dim">{friendlyDate(l.created_at)}: {(l.content||'').slice(0,150)}</div>)}</div>}
              <div className="text-dim text-[10px]">{trace.total} trace records found</div>
            </div>
          ) : null}
        </div>
      </div>)}
    </Modal>
  </div>);
}
