'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Pill, Tag, friendlyTime, describeType, isSignificantActivity } from '../../components/UI';

export default function ActivityPage() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minutes, setMinutes] = useState('30');
  const [showAll, setShowAll] = useState(false);

  async function load() {
    setLoading(true);
    const d = await fetch(`/api/activity?minutes=${minutes}&limit=200`).then(r=>r.json());
    setActivity(d.activity||[]);
    setLoading(false);
  }
  useEffect(()=>{load(); const iv=setInterval(load,30000); return ()=>clearInterval(iv);},[minutes]);

  const filtered = showAll ? activity : activity.filter(isSignificantActivity);

  return (<div>
    <PageTitle right={<span className="text-dim text-xs">{filtered.length} events | auto-refresh 30s</span>}>Live Activity Feed</PageTitle>
    <div className="flex gap-2 mb-4">
      <select className="w-32" value={minutes} onChange={e=>setMinutes(e.target.value)}>
        <option value="5">5 min</option><option value="15">15 min</option><option value="30">30 min</option><option value="60">1 hour</option><option value="360">6 hours</option>
      </select>
      <Btn onClick={load}>Refresh</Btn>
      <Btn variant={showAll?'primary':'default'} onClick={()=>setShowAll(!showAll)}>{showAll?'Showing All (Raw)':'Showing Significant Only'}</Btn>
    </div>
    <Card>{loading&&activity.length===0?<Loading/>:(
      <table><thead><tr><th>Time</th><th>Imp</th><th>What Happened</th><th>Source</th><th>Details</th><th>Tags</th></tr></thead>
      <tbody>{filtered.map(a=><tr key={a.id}><td className="mono whitespace-nowrap">{friendlyTime(a.created_at)}</td>
        <td><Tag variant={a.importance>=8?'err':a.importance>=5?'warn':'dim'}>{a.importance||0}</Tag></td>
        <td title={a.memory_type}><Pill>{describeType(a.memory_type)}</Pill></td>
        <td className="mono max-w-[160px] truncate" title={a.source}>{a.source}</td>
        <td className="max-w-[350px]">{(a.content||'').slice(0,200)}</td>
        <td>{(a.tags||[]).slice(0,4).map(t=><Pill key={t}>{t}</Pill>)}</td></tr>)}</tbody></table>
    )}</Card>
  </div>);
}
