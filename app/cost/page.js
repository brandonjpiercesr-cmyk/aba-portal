'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag } from '../../components/UI';

export default function CostPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); const d = await fetch('/api/cost').then(r => r.json()); setData(d); setLoading(false); }
  useEffect(() => { load(); const iv = setInterval(load, 60000); return () => clearInterval(iv); }, []);

  if (loading || !data) return <Loading />;

  const t = data.today || {};
  const h = data.last_hour || {};
  const w = data.week || {};

  return (<div>
    <PageTitle right={<div className="flex gap-2"><Tag>{data.realtime ? 'LIVE DATA' : 'ESTIMATES'}</Tag><Btn onClick={load}>Refresh</Btn></div>}>Cost Dashboard</PageTitle>

    {!data.realtime && <div className="glass-card p-3 mb-4 border border-yellow-500/30 text-yellow-400 text-xs">
      No real tracking data yet. Cost tracking writes to brain started April 2, 2026. Data will appear after the next API call.
    </div>}

    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
      <Stat value={`$${t.total_cost || 0}`} label="Today Actual" tooltip={`${t.total_calls || 0} API calls`} />
      <Stat value={`$${t.projected_daily || 0}`} label="Projected Today" tooltip="Based on current burn rate" />
      <Stat value={`$${h.cost || 0}`} label="Last Hour" tooltip={`${h.calls || 0} calls`} />
      <Stat value={`$${w.avg_daily || 0}`} label="7-Day Avg/Day" tooltip={`$${w.total_cost || 0} total this week`} />
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
      <Stat value={`${(t.input_tokens || 0).toLocaleString()}`} label="Input Tokens" tooltip="Total input tokens today" />
      <Stat value={`${(t.output_tokens || 0).toLocaleString()}`} label="Output Tokens" tooltip="Total output tokens today" />
      <Stat value={`${t.cache_hit_rate || 0}%`} label="Cache Hit Rate" tooltip={`Read: ${(t.cache_read || 0).toLocaleString()} | Create: ${(t.cache_create || 0).toLocaleString()}`} />
      <Stat value={`${t.total_calls || 0}`} label="Total Calls" tooltip="API calls today" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
      <Card title="Cost by Model">
        {(t.by_model || []).map((m, i) => (
          <div key={i} className="flex justify-between text-xs py-1 border-b border-white/5">
            <span className="text-white">{m.name}</span>
            <span className="text-yellow-400 font-mono">${m.cost}</span>
          </div>
        ))}
        {(!t.by_model || t.by_model.length === 0) && <div className="text-dim text-xs">No data yet</div>}
      </Card>
      <Card title="Cost by Channel">
        {(t.by_channel || []).map((m, i) => (
          <div key={i} className="flex justify-between text-xs py-1 border-b border-white/5">
            <span className="text-white">{m.name}</span>
            <span className="text-yellow-400 font-mono">${m.cost}</span>
          </div>
        ))}
        {(!t.by_channel || t.by_channel.length === 0) && <div className="text-dim text-xs">No data yet</div>}
      </Card>
      <Card title="Cost by Call Type">
        {(t.by_type || []).map((m, i) => (
          <div key={i} className="flex justify-between text-xs py-1 border-b border-white/5">
            <span className="text-white">{m.name}</span>
            <span className="text-yellow-400 font-mono">${m.cost}</span>
          </div>
        ))}
        {(!t.by_type || t.by_type.length === 0) && <div className="text-dim text-xs">No data yet</div>}
      </Card>
    </div>

    {w.by_day && w.by_day.length > 0 && <Card title="Daily Costs (7 Days)">
      <div className="flex gap-1 items-end h-24 mb-2">
        {w.by_day.map((d, i) => {
          const maxCost = Math.max(...w.by_day.map(x => x.cost), 1);
          const pct = Math.round((d.cost / maxCost) * 100);
          return <div key={i} className="flex-1 flex flex-col items-center">
            <div className="text-[10px] text-yellow-400 font-mono mb-1">${d.cost}</div>
            <div className="w-full bg-yellow-400/80 rounded-t" style={{ height: `${pct}%`, minHeight: '2px' }} />
            <div className="text-[9px] text-dim mt-1">{d.date.slice(5)}</div>
          </div>;
        })}
      </div>
    </Card>}

    <Card title="Recent Calls (Last 20)">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-dim border-b border-white/10">
            <th className="text-left py-1">Time</th>
            <th className="text-left">Model</th>
            <th className="text-left">Channel</th>
            <th className="text-left">Type</th>
            <th className="text-right">Cost</th>
            <th className="text-right">In</th>
            <th className="text-right">Out</th>
            <th className="text-right">Cache%</th>
          </tr></thead>
          <tbody>
            {(data.recent_calls || []).map((c, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-1 text-dim">{c.time ? new Date(c.time).toLocaleTimeString() : '?'}</td>
                <td className="text-white">{c.model}</td>
                <td>{c.channel}</td>
                <td>{c.type}</td>
                <td className="text-right text-yellow-400 font-mono">${c.cost}</td>
                <td className="text-right font-mono">{(c.input || 0).toLocaleString()}</td>
                <td className="text-right font-mono">{(c.output || 0).toLocaleString()}</td>
                <td className="text-right">{c.cache_hit}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(!data.recent_calls || data.recent_calls.length === 0) && <div className="text-dim text-xs py-4 text-center">No tracked calls yet. Data appears after the next API call hits airExecutor.</div>}
    </Card>
  </div>);
}
