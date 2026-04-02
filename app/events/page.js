'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Pill, friendlyTime, timeAgo } from '../../components/UI';

const TRIGGER_COLORS = {
  air_request: 'text-blue-400', email_webhook: 'text-yellow-400', heartbeat: 'text-green-400',
  omi_webhook: 'text-purple-400', vara_call: 'text-pink-400', dawn_trigger: 'text-orange-400',
  proactive_cron: 'text-cyan-400', cook_test: 'text-lime-400', cook_executor: 'text-lime-300',
  taste_batch: 'text-teal-400', air_escalate: 'text-red-400'
};
const RESULT_VARIANTS = { success: 'ok', skipped: 'warn', error: 'err', blocked: 'err', empty: 'dim' };
const ACTION_LABELS = {
  air_processed: 'AIR Processed Request',
  email_skipped_skiplist: 'Email Auto-Skipped (Skiplist)',
  email_triaged_no: 'Email Triaged → No Reply',
  email_triaged_yes: 'Email Triaged → Replied',
  omi_received: 'OMI Transcript Received',
  omi_wake_detected: 'OMI Wake Word Detected',
  vara_preload: 'VARA Call Starting',
  vara_cleanup: 'VARA Call Ended',
  briefing_generating: 'DAWN Briefing',
  heartbeat_cycle_complete: 'Heartbeat Cycle',
  heartbeat_started: 'Heartbeat Started',
  proactive_firing: 'Proactive Cron Firing',
  cook_test_fired: 'Cook Test',
  cook_pending_check: 'COOK Checking Tasks',
  taste_batch_started: 'TASTE Batch Processing',
  escalation_fired: 'AIR Escalation'
};

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
    params.set('limit', '200');
    const d = await fetch('/api/events?' + params.toString()).then(r => r.json());
    setData(d);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [autoRefresh, load]);

  if (loading || !data) return <Loading text="Loading event feed..." />;
  const events = data.events || [];

  return (<div>
    <PageTitle right={<div className="flex gap-2 items-center">
      <Tag variant={autoRefresh ? 'ok' : 'dim'}>{autoRefresh ? 'LIVE 10s' : 'PAUSED'}</Tag>
      <Btn onClick={() => setAutoRefresh(!autoRefresh)}>{autoRefresh ? 'Pause' : 'Resume'}</Btn>
      <Btn onClick={load}>Refresh</Btn>
    </div>}>Event Feed</PageTitle>

    <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 mb-5">
      <Stat value={data.total || 0} label="Events (24h)" />
      <Stat value={`$${data.total_cost || 0}`} label="Total Cost" color="text-yellow-400" />
      <Stat value={(data.summary?.by_trigger || []).length} label="Event Types" />
      <Stat value={(data.summary?.by_channel || []).length} label="Channels Active" />
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
        <Btn variant="danger" onClick={() => setFilter({ trigger: '', channel: '', result: '' })}>Clear Filters</Btn>}
    </div>

    <Card title={`Events (${events.length})`}>
      {events.length === 0 && <div className="text-dim text-xs py-8 text-center">No events matching filters.</div>}
      <div className="space-y-0">
        {events.map((ev, i) => {
          const isExpanded = expanded === i;
          const actionLabel = ACTION_LABELS[ev.action] || ev.action;
          return (
            <div key={i} className="border-b border-white/[0.04] py-2.5 cursor-pointer hover:bg-white/[0.02] px-3 -mx-3 rounded transition-all"
              onClick={() => setExpanded(isExpanded ? null : i)}>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-dim w-16 shrink-0 text-[10px]">{ev._created ? friendlyTime(ev._created) : '?'}</span>
                <span className={`font-bold w-24 shrink-0 text-[10px] ${TRIGGER_COLORS[ev.trigger] || 'text-white'}`}>{ev.trigger}</span>
                <span className="text-white flex-1 font-semibold truncate">{actionLabel}</span>
                <Tag variant={RESULT_VARIANTS[ev.result] || 'info'}>{ev.result}</Tag>
                {ev.cost_usd > 0 && <span className="text-yellow-400 font-mono text-[10px] font-bold">${ev.cost_usd}</span>}
                {ev.duration_ms && <span className="text-dim text-[10px] font-mono">{ev.duration_ms > 1000 ? (ev.duration_ms/1000).toFixed(1) + 's' : ev.duration_ms + 'ms'}</span>}
                <span className="text-dim text-[10px]">{isExpanded ? '▼' : '▶'}</span>
              </div>
              {ev.detail && <div className="text-dim text-[11px] mt-1 ml-[104px] leading-relaxed">{ev.detail}</div>}
              
              {isExpanded && (
                <div className="mt-3 ml-[104px] space-y-3">
                  <div className="glass-card p-3">
                    <div className="text-[10px] text-dim uppercase tracking-wider mb-2 font-semibold">Event Details</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
                      <div><span className="text-dim block text-[10px]">Channel</span><span className="text-white font-semibold">{ev.channel || 'unknown'}</span></div>
                      <div><span className="text-dim block text-[10px]">User</span><span className="text-white font-semibold">{ev.user_id || 'unknown'}</span></div>
                      <div><span className="text-dim block text-[10px]">Model</span><span className="text-white font-semibold">{ev.model || 'none'}</span></div>
                      <div><span className="text-dim block text-[10px]">Duration</span><span className="text-white font-semibold">{ev.duration_ms ? (ev.duration_ms > 1000 ? (ev.duration_ms/1000).toFixed(1) + 's' : ev.duration_ms + 'ms') : 'n/a'}</span></div>
                      {ev.ham_name && <div><span className="text-dim block text-[10px]">HAM</span><span className="text-white font-semibold">{ev.ham_name} (T{ev.ham_trust})</span></div>}
                      {ev.iterations != null && <div><span className="text-dim block text-[10px]">Iterations</span><span className="text-white font-semibold">{ev.iterations}</span></div>}
                      {ev.review_passed != null && <div><span className="text-dim block text-[10px]">Review</span><Tag variant={ev.review_passed ? 'ok' : 'err'}>{ev.review_passed ? 'PASS' : 'FAIL'}</Tag></div>}
                      {ev.review_reason && <div><span className="text-dim block text-[10px]">Review Reason</span><span className="text-white">{ev.review_reason}</span></div>}
                    </div>
                  </div>

                  {ev.agents && ev.agents.length > 0 && (
                    <div className="glass-card p-3">
                      <div className="text-[10px] text-dim uppercase tracking-wider mb-2 font-semibold">Agents ({ev.agents.length})</div>
                      <div className="flex flex-wrap gap-1">{ev.agents.map((a,j) => <Pill key={j}>{a}</Pill>)}</div>
                    </div>
                  )}

                  {ev.tools && ev.tools.length > 0 && (
                    <div className="glass-card p-3">
                      <div className="text-[10px] text-dim uppercase tracking-wider mb-2 font-semibold">Tools ({ev.tools.length})</div>
                      {ev.tools.map((t,j) => {
                        const tool = typeof t === 'string' ? { tool: t, success: true } : t;
                        return (
                          <div key={j} className="flex items-start gap-2 py-1 border-b border-white/[0.04] last:border-0 text-[11px]">
                            <Tag variant={tool.success ? 'ok' : 'err'}>{tool.success ? '✓' : '✗'}</Tag>
                            <span className="text-white font-semibold">{tool.tool}</span>
                            {tool.preview && <span className="text-dim text-[10px] flex-1 truncate">{tool.preview}</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {ev.tokens && (
                    <div className="glass-card p-3">
                      <div className="text-[10px] text-dim uppercase tracking-wider mb-2 font-semibold">Token Usage</div>
                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        <div><span className="text-dim block text-[10px]">Input</span><span className="text-white font-mono">{(ev.tokens.input || 0).toLocaleString()}</span></div>
                        <div><span className="text-dim block text-[10px]">Output</span><span className="text-white font-mono">{(ev.tokens.output || 0).toLocaleString()}</span></div>
                        <div><span className="text-dim block text-[10px]">Cache Read</span><span className="text-green-400 font-mono">{(ev.tokens.cache_read || 0).toLocaleString()}</span></div>
                        <div><span className="text-dim block text-[10px]">Cache Write</span><span className="text-yellow-400 font-mono">{(ev.tokens.cache_create || 0).toLocaleString()}</span></div>
                      </div>
                    </div>
                  )}

                  {ev.message_preview && (
                    <div className="glass-card p-3">
                      <div className="text-[10px] text-dim uppercase tracking-wider mb-2 font-semibold">Message</div>
                      <div className="text-white text-[11px] leading-relaxed whitespace-pre-wrap">{ev.message_preview}</div>
                    </div>
                  )}

                  {ev.response_preview && (
                    <div className="glass-card p-3">
                      <div className="text-[10px] text-dim uppercase tracking-wider mb-2 font-semibold">ABA Response</div>
                      <div className="text-white text-[11px] leading-relaxed whitespace-pre-wrap">{ev.response_preview}</div>
                    </div>
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
