'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Pill, friendlyTime, timeAgo } from '../../components/UI';

const TRIGGER_COLORS = {
  air_request: 'text-blue-400', email_webhook: 'text-yellow-400', heartbeat: 'text-green-400',
  omi_webhook: 'text-purple-400', vara_call: 'text-pink-400', dawn_trigger: 'text-orange-400',
  proactive_cron: 'text-cyan-400', cook_test: 'text-lime-400'
};
const RESULT_VARIANTS = { success: 'ok', skipped: 'warn', error: 'err', blocked: 'err', empty: 'dim' };

export default function EventsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ trigger: '', channel: '', result: '' });
  const [expanded, setExpanded] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter.trigger) params.set('trigger', filter.trigger);
    if (filter.channel) params.set('channel', filter.channel);
    if (filter.result) params.set('result', filter.result);
    const d = await fetch('/api/events?' + params.toString()).then(r => r.json());
    setData(d);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, [autoRefresh, load]);

  if (loading || !data) return <Loading text="Loading event feed..." />;

  const events = data.events || [];

  return (<div>
    <PageTitle right={<div className="flex gap-2 items-center">
      <Tag variant={autoRefresh ? 'ok' : 'dim'}>{autoRefresh ? 'LIVE' : 'PAUSED'}</Tag>
      <Btn onClick={() => setAutoRefresh(!autoRefresh)}>{autoRefresh ? 'Pause' : 'Resume'}</Btn>
      <Btn onClick={load}>Refresh</Btn>
    </div>}>Event Feed</PageTitle>

    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-5">
      <Stat value={data.total || 0} label="Events (24h)" />
      <Stat value={`$${data.total_cost || 0}`} label="Total Cost" color="text-yellow-400" />
      <Stat value={(data.summary?.by_trigger || []).length} label="Trigger Types" />
      <Stat value={(data.summary?.by_channel || []).length} label="Channels" />
      <Stat value={events[0] ? timeAgo(events[0]._created || events[0].timestamp) : 'none'} label="Last Event" />
    </div>

    <div className="flex gap-2 mb-4 flex-wrap">
      <select value={filter.trigger} onChange={e => setFilter(f => ({...f, trigger: e.target.value}))}
        className="bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-xs text-gray-300">
        <option value="">All Triggers</option>
        {(data.summary?.by_trigger || []).map(([t, c]) => <option key={t} value={t}>{t} ({c})</option>)}
      </select>
      <select value={filter.channel} onChange={e => setFilter(f => ({...f, channel: e.target.value}))}
        className="bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-xs text-gray-300">
        <option value="">All Channels</option>
        {(data.summary?.by_channel || []).map(([t, c]) => <option key={t} value={t}>{t} ({c})</option>)}
      </select>
      <select value={filter.result} onChange={e => setFilter(f => ({...f, result: e.target.value}))}
        className="bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-xs text-gray-300">
        <option value="">All Results</option>
        {(data.summary?.by_result || []).map(([t, c]) => <option key={t} value={t}>{t} ({c})</option>)}
      </select>
      {(filter.trigger || filter.channel || filter.result) &&
        <Btn variant="danger" onClick={() => setFilter({ trigger: '', channel: '', result: '' })}>Clear</Btn>}
    </div>

    <Card title={`Events (${events.length})`}>
      {events.length === 0 && <div className="text-dim text-xs py-8 text-center">No events yet. Events will appear as ABA processes requests.</div>}
      <div className="space-y-0">
        {events.map((ev, i) => {
          const isExpanded = expanded === i;
          return (
            <div key={i} className="border-b border-white/[0.04] py-2 cursor-pointer hover:bg-white/[0.02] px-2 -mx-2 rounded transition-all"
              onClick={() => setExpanded(isExpanded ? null : i)}>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-dim w-16 shrink-0">{ev._created ? friendlyTime(ev._created) : '?'}</span>
                <span className={`font-semibold w-28 shrink-0 ${TRIGGER_COLORS[ev.trigger] || 'text-white'}`}>{ev.trigger}</span>
                <span className="text-white flex-1 truncate">{ev.action}</span>
                <Tag variant={RESULT_VARIANTS[ev.result] || 'info'}>{ev.result}</Tag>
                {ev.cost_usd > 0 && <span className="text-yellow-400 font-mono text-[10px]">${ev.cost_usd}</span>}
                {ev.duration_ms && <span className="text-dim text-[10px]">{ev.duration_ms}ms</span>}
              </div>
              {ev.detail && <div className="text-dim text-[10px] mt-0.5 ml-[72px] truncate">{ev.detail}</div>}
              {isExpanded && (
                <div className="mt-2 ml-[72px] glass-card p-3 text-[11px] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="text-dim">Channel:</span> <span className="text-white">{ev.channel}</span></div>
                    <div><span className="text-dim">User:</span> <span className="text-white">{ev.user_id}</span></div>
                    <div><span className="text-dim">Model:</span> <span className="text-white">{ev.model || 'none'}</span></div>
                    <div><span className="text-dim">Duration:</span> <span className="text-white">{ev.duration_ms ? ev.duration_ms + 'ms' : 'n/a'}</span></div>
                  </div>
                  {ev.agents && ev.agents.length > 0 && (
                    <div><span className="text-dim">Agents:</span> <span className="ml-1">{ev.agents.map((a,j) => <Pill key={j}>{a}</Pill>)}</span></div>
                  )}
                  {ev.tools && ev.tools.length > 0 && (
                    <div><span className="text-dim">Tools:</span> <span className="ml-1">{ev.tools.map((t,j) => <Pill key={j}>{typeof t === 'string' ? t : `${t.tool} ${t.success ? '✓' : '✗'}`}</Pill>)}</span></div>
                  )}
                  {ev.tokens && (
                    <div><span className="text-dim">Tokens:</span> <span className="text-white ml-1">in:{ev.tokens.input} out:{ev.tokens.output} cache_r:{ev.tokens.cache_read} cache_w:{ev.tokens.cache_create}</span></div>
                  )}
                  {ev.message_preview && (
                    <div><span className="text-dim">Message:</span> <span className="text-white ml-1">{ev.message_preview}</span></div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  </div>);
}
