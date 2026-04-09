'use client';
// ⬡B:VIGIL.watchman:AOA:activity_log_page:20260408⬡
// AOA Portal — WATCHMAN Activity Log
// Shows every API call from every HAM, searchable and filterable.

import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, Empty, timeAgo, Pill } from '../../components/UI';
import { SUPABASE_URL, SUPABASE_ANON } from '../../lib/config';

const ACTION_COLORS = {
  chat: 'info', email_send: 'warning', email_read: 'default', email: 'default',
  awa: 'error', voice: 'info', calendar: 'default', settings: 'default',
  conversation_create: 'info', conversation_delete: 'warning', file_upload: 'info',
  access_control: 'error', other: 'default'
};

export default function WatchmanPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hamFilter, setHamFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [limit, setLimit] = useState(50);
  const [stats, setStats] = useState([]);
  const [showStats, setShowStats] = useState(true);

  async function load() {
    setLoading(true);
    try {
      let query = `select=*&order=created_at.desc&limit=${limit}`;
      if (hamFilter) query += `&or=(ham_id.eq.${hamFilter},email.ilike.%25${hamFilter}%25)`;
      if (actionFilter) query += `&action=eq.${actionFilter}`;
      if (platformFilter) query += `&platform=eq.${platformFilter}`;

      const res = await fetch(`${SUPABASE_URL}/rest/v1/aba_activity_log?${query}`, {
        headers: { 'apikey': SUPABASE_ANON }
      });
      const data = await res.json();
      setActivities(data || []);
    } catch (e) { console.error('Load failed:', e); }
    setLoading(false);
  }

  async function loadStats() {
    try {
      const now = new Date();
      const dayAgo = new Date(now - 24*60*60*1000).toISOString();
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/aba_activity_log?select=ham_id,email,platform,action&created_at=gte.${dayAgo}&limit=500`,
        { headers: { 'apikey': SUPABASE_ANON } }
      );
      const data = await res.json();
      const byHam = {};
      (data || []).forEach(e => {
        const key = e.ham_id || e.email || 'unknown';
        if (!byHam[key]) byHam[key] = { ham_id: key, total: 0, actions: {}, platforms: {} };
        byHam[key].total++;
        byHam[key].actions[e.action] = (byHam[key].actions[e.action] || 0) + 1;
        byHam[key].platforms[e.platform] = (byHam[key].platforms[e.platform] || 0) + 1;
      });
      setStats(Object.values(byHam).sort((a,b) => b.total - a.total));
    } catch {}
  }

  useEffect(() => { load(); loadStats(); const iv = setInterval(() => { load(); loadStats(); }, 30000); return () => clearInterval(iv); }, [hamFilter, actionFilter, platformFilter, limit]);

  const uniqueHams = [...new Set(activities.map(a => a.ham_id).filter(Boolean))];
  const uniqueActions = [...new Set(activities.map(a => a.action).filter(Boolean))];
  const uniquePlatforms = [...new Set(activities.map(a => a.platform).filter(Boolean))];

  return (
    <div>
      <PageTitle right={<span className="text-dim text-xs">{activities.length} entries | auto-refresh 30s</span>}>
        WATCHMAN Activity Log
      </PageTitle>

      {showStats && stats.length > 0 && (
        <Card title="Last 24 Hours by HAM" className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map(s => (
              <button key={s.ham_id} onClick={() => setHamFilter(s.ham_id)}
                className={`text-left p-3 rounded border transition ${
                  hamFilter === s.ham_id ? 'border-blue-500 bg-blue-900/20' : 'border-zinc-800 hover:border-zinc-600'
                }`}>
                <div className="font-bold text-sm">{s.ham_id}</div>
                <div className="text-2xl font-mono">{s.total}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {Object.entries(s.actions).sort((a,b) => b[1] - a[1]).slice(0,3).map(([k,v]) => `${k}: ${v}`).join(', ')}
                </div>
              </button>
            ))}
          </div>
          <Btn size="xs" className="mt-2" onClick={() => setShowStats(false)}>Hide Stats</Btn>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
          value={hamFilter} onChange={e => setHamFilter(e.target.value)}>
          <option value="">All HAMs</option>
          {uniqueHams.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
          value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
          value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}>
          <option value="">All Platforms</option>
          {uniquePlatforms.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm"
          value={limit} onChange={e => setLimit(parseInt(e.target.value))}>
          <option value="25">25</option><option value="50">50</option><option value="100">100</option><option value="200">200</option>
        </select>
        <Btn onClick={() => { load(); loadStats(); }}>Refresh</Btn>
        {hamFilter && <Btn variant="default" onClick={() => setHamFilter('')}>Clear Filter</Btn>}
      </div>

      <Card>
        {loading && activities.length === 0 ? <Loading /> : activities.length === 0 ? <Empty text="No activity logged yet" /> : (
          <div className="space-y-1">
            {activities.map(a => {
              const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata || '{}') : (a.metadata || {});
              return (
                <div key={a.id} className="flex items-center justify-between py-2 px-2 border-b border-zinc-800/50 hover:bg-zinc-900/30 text-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Tag variant={ACTION_COLORS[a.action] || 'default'}>{a.action}</Tag>
                    <span className="font-bold text-gray-300 w-20 shrink-0">{a.ham_id || '?'}</span>
                    <span className="font-mono text-gray-500 w-14 shrink-0">{a.platform}</span>
                    <span className="text-gray-400 truncate">{a.summary}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {meta.status && <span className={meta.status >= 400 ? 'text-red-400' : 'text-green-500'}>{meta.status}</span>}
                    {meta.duration_ms != null && <span className="text-gray-600">{meta.duration_ms}ms</span>}
                    <span className="text-gray-600 w-16 text-right">{timeAgo(a.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
