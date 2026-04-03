'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Tag, friendlyDate, timeAgo } from '../components/UI';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [cost, setCost] = useState(null);
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()).catch(() => null),
      fetch('/api/cost').then(r => r.json()).catch(() => null),
      fetch('/api/events?limit=10').then(r => r.json()).catch(() => null),
    ]).then(([d, c, e]) => {
      setData(d);
      setCost(c);
      setEvents(e);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loading text="Connecting to ABA brain..." />;

  const d = data || {};
  const costToday = cost?.today?.total_cost_usd ?? '—';
  const costCalls = cost?.today?.total_calls ?? 0;
  const recentEvents = (events?.events || []).filter(e =>
    !['omi_received', 'heartbeat_cycle_complete', 'heartbeat_started'].includes(e.action)
  ).slice(0, 8);

  const killSwitchCount = '—'; // loaded dynamically if needed

  return (
    <div className="fade-in">
      <PageTitle sub="Real-time ABA infrastructure overview">Dashboard</PageTitle>

      {/* Top stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Stat value={d.brain?.total} label="Brain Entries" href="/brain" sub={`${d.brain?.last24h ?? 0} today`} />
        <Stat value={d.brain?.last24h} label="24h New Entries" href="/brain" color="text-purple" />
        <Stat value={d.errors?.last24h} label="Errors (24h)" href="/errors" color={d.errors?.last24h > 0 ? 'text-red-400' : 'text-green-400'} />
        <Stat value={costToday !== '—' ? `$${costToday}` : '—'} label="API Cost Today" href="/cost" color="text-yellow-400" sub={`${costCalls} calls`} />
        <Stat value={d.agents?.total} label="Agents Loaded" href="/agents" color="text-cyan-400" />
        <Stat value={d.ababase?.status === 'up' ? 'Online' : 'Offline'} label="ABAbase" color={d.ababase?.status === 'up' ? 'text-green-400' : 'text-red-400'}
          sub={d.ababase?.status === 'up' ? 'All systems go' : 'Check services'} href="/services" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat value={d.emails?.last24h} label="Emails (24h)" href="/email" />
        <Stat value={d.omi?.transcriptsLast24h} label="OMI Transcripts" color="text-purple-light" />
        <Stat value={d.taste?.batchesLast24h} label="TASTE Batches" color="text-orange-400" />
        <Stat value={d.training?.totalNotes} label="Training Notes" />
      </div>

      {/* Cost breakdown + Recent activity */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Cost breakdown */}
        <Card title="Cost Breakdown Today" actions={<a href="/cost" className="text-[10px] text-purple hover:underline">View All</a>}>
          {cost?.today?.by_model?.length > 0 ? (
            <div className="space-y-2">
              {cost.today.by_model.map(m => (
                <div key={m.name} className="flex justify-between items-center text-xs">
                  <span className="text-gray-300">{m.name}</span>
                  <span className="text-yellow-400 font-mono">${m.cost.toFixed(4)}</span>
                </div>
              ))}
              <div className="border-t border-white/[0.04] pt-2 mt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-dim">Cache hit rate</span>
                  <span className="text-green-400">{cost?.today?.cache_hit_rate || '0%'}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-dim">Projected daily</span>
                  <span className="text-yellow-400">${cost?.today?.projected_daily || '0'}</span>
                </div>
              </div>
            </div>
          ) : <p className="text-dim text-xs">No cost data yet today.</p>}
        </Card>

        {/* Recent activity */}
        <Card title="Recent Activity" actions={<a href="/events" className="text-[10px] text-purple hover:underline">Event Feed</a>}>
          {recentEvents.length > 0 ? (
            <div className="space-y-1.5">
              {recentEvents.map((ev, i) => (
                <div key={i} className="flex items-start gap-2 text-xs py-1">
                  <Tag variant={ev.result === 'success' ? 'ok' : ev.result === 'error' ? 'err' : 'dim'}>{ev.result}</Tag>
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-300">{ev.action?.replace(/_/g, ' ')}</span>
                    {ev.message_preview && <span className="text-dim ml-1 truncate block text-[10px]">{ev.message_preview.slice(0, 60)}</span>}
                  </div>
                  <span className="text-dim text-[10px] whitespace-nowrap">{timeAgo(ev._created || ev.timestamp)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-dim text-xs">No recent activity.</p>}
        </Card>
      </div>
    </div>
  );
}
