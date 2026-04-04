'use client';
// ⬡B:SHADOW:APP:page:aoa_portal_dashboard:20260404⬡
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Tag, Btn, friendlyTime } from '../../components/UI';

export default function ShadowPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('audits');

  const load = () => {
    setLoading(true);
    fetch('/api/shadow').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading || !data) return <Loading text="Loading SHADOW audit data..." />;
  const s = data.stats || {};

  return (
    <div className="fade-in">
      <PageTitle sub="Post-response audit trail and anomaly detection" right={<Btn onClick={load}>Refresh</Btn>}>SHADOW Oversight</PageTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat value={s.today_audits ?? 0} label="Audits Today" color="text-purple-400" sub="Every AIR response" />
        <Stat value={(s.today_avg_tokens ?? 0).toLocaleString()} label="Avg Tokens" color="text-cyan-400" sub={`Max: ${(s.today_max_tokens ?? 0).toLocaleString()}`} />
        <Stat value={s.active_flags ?? 0} label="Active Flags" color={s.active_flags > 0 ? 'text-red-400' : 'text-green-400'} sub={s.active_flags > 0 ? 'Needs attention' : 'All clear'} />
        <Stat value={s.week_flags ?? 0} label="Flags This Week" color="text-yellow-400" sub={`${s.today_cost_spikes ?? 0} cost spikes today`} />
      </div>

      <div className="flex gap-2 mb-4">
        {['audits', 'flags', 'channels', 'config'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${tab === t ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-gray-400 hover:text-white border border-white/5'}`}>
            {t === 'audits' ? 'Audit Trail' : t === 'flags' ? 'Flags' : t === 'channels' ? 'Channels' : 'Config'}
          </button>
        ))}
      </div>

      {tab === 'audits' && (
        <Card title={`Recent Audits (${(data.recent_audits || []).length})`}>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {(data.recent_audits || []).length === 0 ? (
              <p className="text-dim text-xs">No audits recorded yet</p>
            ) : (
              (data.recent_audits || []).map((a, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-white/[0.03] text-xs">
                  <span className="text-dim w-14 shrink-0">{a.timestamp ? new Date(a.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  <Tag color={a.channel === 'myaba' ? 'purple' : a.channel === 'cib' ? 'blue' : a.channel === 'snap' ? 'green' : 'gray'}>{a.channel}</Tag>
                  <span className="text-gray-300 truncate flex-1" title={a.message_preview}>{a.message_preview || '(no preview)'}</span>
                  <span className={`font-mono ${a.tokens > 100000 ? 'text-red-400' : a.tokens > 50000 ? 'text-yellow-400' : 'text-gray-500'}`}>{(a.tokens || 0).toLocaleString()}</span>
                  <span className="text-dim w-10 text-right">{a.tool_count}t</span>
                  <span className={`w-4 ${a.review_passed === false ? 'text-red-400' : 'text-green-400/50'}`}>{a.review_passed === false ? '✗' : '✓'}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {tab === 'flags' && (
        <Card title={`SHADOW Flags (${(data.active_flags || []).length})`}>
          {(data.active_flags || []).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-green-400/60 text-2xl mb-2">✓</div>
              <p className="text-dim text-xs">No active flags. System is clean.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(data.active_flags || []).map((f, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag color={f.urgency === 'critical' ? 'red' : f.urgency === 'high' ? 'orange' : 'yellow'}>{f.urgency}</Tag>
                    <span className="text-xs text-white font-medium">{f.type}</span>
                    <span className="text-dim text-[10px] ml-auto">{f.created_at ? friendlyTime(f.created_at) : ''}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{typeof f.body === 'string' ? f.body.substring(0, 200) : JSON.stringify(f.body).substring(0, 200)}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'channels' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Requests by Channel">
            {(data.channels || []).length > 0 ? (
              <div className="space-y-2">
                {data.channels.map(c => (
                  <div key={c.name} className="flex justify-between items-center">
                    <span className="text-xs text-gray-300">{c.name}</span>
                    <span className="text-xs text-purple-400 font-mono">{c.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-dim text-xs">No channel data</p>}
          </Card>
          <Card title="Requests by HAM">
            {(data.hams || []).length > 0 ? (
              <div className="space-y-2">
                {data.hams.map(h => (
                  <div key={h.name} className="flex justify-between items-center">
                    <span className="text-xs text-gray-300">{h.name}</span>
                    <span className="text-xs text-cyan-400 font-mono">{h.count}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-dim text-xs">No HAM data</p>}
          </Card>
        </div>
      )}

      {tab === 'config' && (
        <Card title="SHADOW Configuration">
          <div className="space-y-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">COST_SPIKE Thresholds</div>
              <div className="flex gap-4">
                <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05] flex-1">
                  <div className="text-[10px] text-dim">User-facing channels</div>
                  <div className="text-sm text-yellow-400 font-mono">{(data.config?.user_threshold || 100000).toLocaleString()} tokens</div>
                </div>
                <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05] flex-1">
                  <div className="text-[10px] text-dim">Background channels</div>
                  <div className="text-sm text-orange-400 font-mono">{(data.config?.background_threshold || 200000).toLocaleString()} tokens</div>
                </div>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Background Channel Exclusions</div>
              <div className="flex flex-wrap gap-1">
                {(data.config?.background_channels || []).map(ch => (
                  <span key={ch} className="px-2 py-0.5 text-[10px] rounded-full bg-white/[0.05] text-gray-400">{ch}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Enforcement Agents</div>
              <div className="flex gap-2">
                <Tag color="purple">SIGIL</Tag>
                <Tag color="purple">SHADOW</Tag>
              </div>
              <p className="text-[10px] text-dim mt-1">Both fire after every AIR response via enforceAlwaysActive() in agentEnforcer.js</p>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Code Locations</div>
              <div className="text-[10px] text-dim space-y-0.5">
                <p>lib/agentEnforcer.js — enforcement code (283 lines)</p>
                <p>lib/airExecutor.js ~6595 — enforceAlwaysActive() call</p>
                <p>lib/airExecutor.js ~1473 — shadow_review tool definition</p>
                <p>lib/airExecutor.js ~3572 — shadow_review execution</p>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
