'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Tag, Btn, friendlyTime } from '../../components/UI';

export default function CostPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/cost').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading || !data) return <Loading text="Loading cost data..." />;
  const t = data.today || {};
  const w = data.week || {};
  const h = data.lastHour || data.last_hour || {};

  return (
    <div className="fade-in">
      <PageTitle sub="Real USD costs from every API call" right={<Btn onClick={load}>Refresh</Btn>}>Cost Tracking</PageTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat value={`$${t.total_cost ?? '—'}`} label="Today" color="text-yellow-400" sub={`${t.total_calls ?? 0} calls`} />
        <Stat value={`$${h.cost ?? '—'}`} label="Last Hour" color="text-orange-400" sub={`${h.calls ?? 0} calls`} />
        <Stat value={`$${w.total_cost ?? '—'}`} label="7-Day Total" sub={`${w.total_calls ?? 0} calls`} />
        <Stat value={`$${t.projected_daily ?? '—'}`} label="Projected Daily" color="text-red-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat value={t.input_tokens?.toLocaleString() ?? '—'} label="Input Tokens" />
        <Stat value={t.output_tokens?.toLocaleString() ?? '—'} label="Output Tokens" />
        <Stat value={t.cache_hit_rate != null ? t.cache_hit_rate + '%' : '—'} label="Cache Hit Rate" color="text-green-400" />
        <Stat value={t.cache_read?.toLocaleString() ?? '—'} label="Cache Read" color="text-cyan-400" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card title="By Model">
          {(t.by_model || []).length > 0 ? (
            <div className="space-y-2">
              {t.by_model.map(m => (
                <div key={m.name} className="flex justify-between items-center">
                  <span className="text-xs text-gray-300">{m.name}</span>
                  <span className="text-xs text-yellow-400 font-mono">${(m.cost || 0).toFixed(4)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-dim text-xs">No data</p>}
        </Card>

        <Card title="By Channel">
          {(t.by_channel || []).length > 0 ? (
            <div className="space-y-2">
              {t.by_channel.map(c => (
                <div key={c.name} className="flex justify-between items-center">
                  <span className="text-xs text-gray-300">{c.name}</span>
                  <span className="text-xs text-yellow-400 font-mono">${(c.cost || 0).toFixed(4)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-dim text-xs">No data</p>}
        </Card>

        <Card title="By Call Type">
          {(t.by_call_type || t.by_type || []).length > 0 ? (
            <div className="space-y-2">
              {(t.by_call_type || t.by_type).map(c => (
                <div key={c.name} className="flex justify-between items-center">
                  <span className="text-xs text-gray-300">{c.name}</span>
                  <span className="text-xs text-yellow-400 font-mono">${(c.cost || 0).toFixed(4)}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-dim text-xs">No data</p>}
        </Card>
      </div>

      {data.recent_calls?.length > 0 && (
        <Card title="Recent API Calls">
          <table>
            <thead><tr><th>Time</th><th>Model</th><th>Channel</th><th>Tokens</th><th>Cost</th></tr></thead>
            <tbody>
              {data.recent_calls.slice(0, 30).map((c, i) => (
                <tr key={i}>
                  <td className="text-dim">{friendlyTime(c.time)}</td>
                  <td><Tag variant="info">{c.model?.replace('claude-', '')}</Tag></td>
                  <td className="text-gray-300">{c.channel}</td>
                  <td className="text-gray-400 font-mono">{((c.input || 0) + (c.output || 0)).toLocaleString()}</td>
                  <td className="text-yellow-400 font-mono">${c.cost?.toFixed(4) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <div className="text-[10px] text-dim/40 text-center mt-4">
        Tracking started April 2, 2026. Data from trackCost() on every airCall().
      </div>
    </div>
  );
}
