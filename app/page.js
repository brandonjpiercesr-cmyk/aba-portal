'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Stat, Pill, PageTitle, Loading, friendlyTime, timeAgo, Btn, describeType, isSignificantActivity } from '../components/UI';

export default function Dashboard() {
  const [dash, setDash] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    setLoading(true);
    const [d, a] = await Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/activity?minutes=30&limit=100').then(r => r.json()),
    ]);
    setDash(d);
    setActivity((a.activity || []).filter(isSignificantActivity));
    setLoading(false);
  }

  useEffect(() => { load(); const iv = setInterval(load, 60000); return () => clearInterval(iv); }, []);

  if (loading && !dash) return <Loading />;
  const b = dash?.brain || {}, e = dash?.errors || {}, em = dash?.emails || {};

  return (
    <div>
      <PageTitle right={<span className="text-[10px] text-dim">{dash?.ts ? 'Updated ' + friendlyTime(dash.ts) : ''}</span>}>Dashboard</PageTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-5">
        <Stat value={b.total || 0} label="Brain Entries" tooltip="Total entries in ABA brain (aba_memory table in Supabase)" onClick={() => router.push('/brain')} />
        <Stat value={b.last24h || 0} label="Brain 24h" tooltip="New brain entries written in the last 24 hours" onClick={() => router.push('/brain')} />
        <Stat value={b.lastHour || 0} label="Brain 1h" tooltip="New brain entries written in the last hour (OMI, emails, proactive)" onClick={() => router.push('/activity')} />
        <Stat value={e.last24h || 0} label="Errors 24h" color={e.last24h > 0 ? 'text-red-400' : 'text-green-400'} tooltip="Errors, failures, and crashed processes in the last 24 hours" onClick={() => router.push('/errors')} />
        <Stat value={em.last24h || 0} label="Emails Sent 24h" tooltip="Emails sent by ABA across all Nylas grants in last 24 hours" onClick={() => router.push('/email')} />
        <Stat value={dash?.agents?.total || 0} label="Agents" tooltip="Total registered agents in the aba_agent_jds table" onClick={() => router.push('/agents')} />
        <Stat value={dash?.taste?.batchesLast24h || 0} label="TASTE 24h" tooltip="TASTE batch processing runs in the last 24 hours (compiles OMI fragments into sessions)" onClick={() => router.push('/taste')} />
        <Stat value={dash?.omi?.transcriptsLast24h || 0} label="OMI 24h" tooltip="Raw OMI pendant transcript fragments received in last 24 hours" onClick={() => router.push('/omi')} />
        <Stat value={dash?.training?.totalNotes || 0} label="Training Notes" tooltip="Total CCWA training notes (Claude Base teaching ABAbase)" onClick={() => router.push('/training')} />
        <Stat value={<><span className={`inline-block w-2 h-2 rounded-full mr-2 ${dash?.ababase?.status === 'up' ? 'bg-green-400' : 'bg-red-400'}`}></span>{dash?.ababase?.status || '?'}</>}
          label="ABAbase" tooltip="Whether abacia-services.onrender.com is responding to health checks" onClick={() => router.push('/render')} />
      </div>

      <Card title="Recent Significant Activity (30 min)" actions={<Btn onClick={load}>Refresh</Btn>}>
        {activity.length === 0 ? <Loading text="No significant activity in last 30 minutes" /> : (
          <table>
            <thead><tr><th>Time</th><th>What Happened</th><th>Source</th><th>Details</th></tr></thead>
            <tbody>
              {activity.slice(0, 30).map(a => (
                <tr key={a.id}>
                  <td className="mono whitespace-nowrap">{friendlyTime(a.created_at)}</td>
                  <td title={a.memory_type}><Pill>{describeType(a.memory_type)}</Pill></td>
                  <td className="mono max-w-[160px] truncate" title={a.source}>{a.source}</td>
                  <td className="max-w-[350px]">{(a.content || '').slice(0, 150)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
