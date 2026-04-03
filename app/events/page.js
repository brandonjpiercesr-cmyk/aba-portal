'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Pill, friendlyTime, timeAgo } from '../../components/UI';

const TRIGGER_COLORS = {
  air_request: 'text-blue-400', email_webhook: 'text-yellow-400', heartbeat: 'text-green-400',
  omi_webhook: 'text-purple', vara_call: 'text-pink-400', dawn_trigger: 'text-orange-400',
  proactive_cron: 'text-cyan-400', cook_executor: 'text-lime-300',
  taste_batch: 'text-teal-400', air_escalate: 'text-red-400'
};
const RESULT_VARIANTS = { success: 'ok', skipped: 'warn', error: 'err', blocked: 'err', empty: 'dim' };
const ACTION_LABELS = {
  air_processed: 'AIR Processed', email_skipped_skiplist: 'Email Skipped', email_triaged_no: 'Email — No Reply',
  email_triaged_yes: 'Email — Replied', omi_received: 'OMI Transcript', omi_wake_detected: 'OMI Wake Word',
  vara_preload: 'VARA Call Start', vara_cleanup: 'VARA Call End', briefing_generating: 'DAWN Briefing',
  heartbeat_cycle_complete: 'Heartbeat Cycle', heartbeat_started: 'Heartbeat Start',
  cook_pending_check: 'COOK Check', taste_batch_started: 'TASTE Batch', escalation_fired: 'Escalation'
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

  return (
    <div className="fade-in">
      <PageTitle sub="Live feed of every ABA event" right={
        <div className="flex gap-2 items-center">
          <Tag variant={autoRefresh ? 'ok' : 'dim'}>{autoRefresh ? 'LIVE 10s' : 'PAUSED'}</Tag>
          <Btn onClick={() => setAutoRefresh(!autoRefresh)}>{autoRefresh ? 'Pause' : 'Resume'}</Btn>
          <Btn onClick={load}>Refresh</Btn>
        </div>
      }>Event Feed</PageTitle>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <Stat value={data.total || 0} label="Events (24h)" />
        <Stat value={`$${data.total_cost || 0}`} label="Total Cost" color="text-yellow-400" />
        <Stat value={(data.summary?.by_trigger || []).length} label="Event Types" />
        <Stat value={(data.summary?.by_channel || []).length} label="Channels Active" />
        <Stat value={events[0] ? timeAgo(events[0]._created || events[0].timestamp) : '—'} label="Last Event" />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={filter.trigger} onChange={e => setFilter(f => ({ ...f, trigger: e.target.value }))}
          className="w-auto bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-gray-300">
          <option value="">All Triggers</option>
          {(data.summary?.by_trigger || []).map(([t, c]) => <option key={t} value={t}>{t} ({c})</option>)}
        </select>
        <select value={filter.channel} onChange={e => setFilter(f => ({ ...f, channel: e.target.value }))}
          className="w-auto bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-gray-300">
          <option value="">All Channels</option>
          {(data.summary?.by_channel || []).map(([t, c]) => <option key={t} value={t}>{t} ({c})</option>)}
        </select>
        <select value={filter.result} onChange={e => setFilter(f => ({ ...f, result: e.target.value }))}
          className="w-auto bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-gray-300">
          <option value="">All Results</option>
          {(data.summary?.by_result || []).map(([t, c]) => <option key={t} value={t}>{t} ({c})</option>)}
        </select>
        {(filter.trigger || filter.channel || filter.result) &&
          <Btn variant="danger" onClick={() => setFilter({ trigger: '', channel: '', result: '' })}>Clear</Btn>}
      </div>

      <Card title={`Events (${events.length})`}>
        {events.length === 0 && <div className="text-dim text-xs py-8 text-center">No events matching filters.</div>}
        <div className="space-y-0">
          {events.map((ev, i) => {
            const isExpanded = expanded === i;
            const label = ACTION_LABELS[ev.action] || ev.action?.replace(/_/g, ' ') || 'Event';
            return (
              <div key={i} className="border-b border-white/[0.03] last:border-0">
                <div className="flex items-center gap-2 py-2.5 px-1 cursor-pointer hover:bg-white/[0.02] transition-all"
                  onClick={() => setExpanded(isExpanded ? null : i)}>
                  <span className={`text-[10px] font-mono ${TRIGGER_COLORS[ev.trigger] || 'text-dim'}`}>{ev.trigger}</span>
                  <span className="text-xs text-gray-300 flex-1">{label}</span>
                  {ev.channel && <Pill>{ev.channel}</Pill>}
                  <Tag variant={RESULT_VARIANTS[ev.result] || 'dim'}>{ev.result}</Tag>
                  <span className="text-[10px] text-dim whitespace-nowrap">{friendlyTime(ev._created || ev.timestamp)}</span>
                  <span className="text-dim text-[10px]">{isExpanded ? '▼' : '▸'}</span>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 text-[11px] space-y-1 bg-white/[0.01] rounded-b-lg">
                    {ev.message_preview && <div><span className="text-dim">Message:</span> <span className="text-gray-300">{ev.message_preview}</span></div>}
                    {ev.response_preview && <div><span className="text-dim">Response:</span> <span className="text-gray-300">{ev.response_preview?.slice(0, 200)}</span></div>}
                    {ev.agents?.length > 0 && <div><span className="text-dim">Agents:</span> {ev.agents.map(a => <Pill key={a}>{a}</Pill>)}</div>}
                    {ev.tools?.length > 0 && <div><span className="text-dim">Tools:</span> {ev.tools.map(t => <Pill key={t}>{t}</Pill>)}</div>}
                    {ev.model && <div><span className="text-dim">Model:</span> <span className="text-cyan-400">{ev.model}</span></div>}
                    {ev.tokens && <div><span className="text-dim">Tokens:</span> <span className="text-yellow-400">{ev.tokens?.toLocaleString()}</span></div>}
                    {ev.cost_usd && <div><span className="text-dim">Cost:</span> <span className="text-yellow-400">${ev.cost_usd}</span></div>}
                    {ev.duration_ms && <div><span className="text-dim">Duration:</span> <span className="text-green-400">{(ev.duration_ms / 1000).toFixed(1)}s</span></div>}
                    {ev.detail && <div><span className="text-dim">Detail:</span> <span className="text-gray-400">{ev.detail}</span></div>}
                    {ev.user_id && <div><span className="text-dim">User:</span> <span className="text-gray-400">{ev.user_id}</span></div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
