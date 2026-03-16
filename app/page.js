'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, Pill, PageTitle, Loading, shortTime, timeAgo, Btn } from '../components/UI';

export default function Dashboard() {
  const [dash, setDash] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [d, a] = await Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/activity?minutes=30&limit=40').then(r => r.json()),
    ]);
    setDash(d);
    setActivity(a.activity || []);
    setLoading(false);
  }

  useEffect(() => { load(); const iv = setInterval(load, 60000); return () => clearInterval(iv); }, []);

  if (loading && !dash) return <Loading />;
  const b = dash?.brain || {}, e = dash?.errors || {}, em = dash?.emails || {};

  return (
    <div>
      <PageTitle right={<span className="text-[10px] text-dim">{dash?.ts ? 'Updated ' + shortTime(dash.ts) : ''}</span>}>Dashboard</PageTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-5">
        <Stat value={b.total?.toLocaleString() || 0} label="Brain Entries" />
        <Stat value={b.last24h || 0} label="Brain 24h" />
        <Stat value={b.lastHour || 0} label="Brain 1h" />
        <Stat value={e.last24h || 0} label="Errors 24h" color={e.last24h > 0 ? 'text-red-400' : 'text-green-400'} />
        <Stat value={em.last24h || 0} label="Emails Sent 24h" />
        <Stat value={dash?.agents?.total || 0} label="Agents" />
        <Stat value={dash?.taste?.batchesLast24h || 0} label="TASTE 24h" />
        <Stat value={dash?.omi?.transcriptsLast24h || 0} label="OMI 24h" />
        <Stat value={dash?.training?.totalNotes || 0} label="Training Notes" />
        <Stat value={<><span className={`inline-block w-2 h-2 rounded-full mr-2 ${dash?.ababase?.status === 'up' ? 'bg-green-400' : 'bg-red-400'}`}></span>{dash?.ababase?.status || '?'}</>} label="ABAbase" />
      </div>

      <Card title="Recent Activity (30 min)" actions={<Btn onClick={load}>Refresh</Btn>}>
        {activity.length === 0 ? <Loading text="No recent activity" /> : (
          <table>
            <thead><tr><th>Time</th><th>Type</th><th>Source</th><th>Content</th></tr></thead>
            <tbody>
              {activity.map(a => (
                <tr key={a.id}>
                  <td className="mono whitespace-nowrap">{shortTime(a.created_at)}</td>
                  <td><Pill>{a.memory_type}</Pill></td>
                  <td className="mono max-w-[180px] truncate" title={a.source}>{a.source}</td>
                  <td className="max-w-[400px]">{(a.content || '').slice(0, 150)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
