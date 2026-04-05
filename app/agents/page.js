'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Pill, Modal, Empty, friendlyDate, timeAgo } from '../../components/UI';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [auditFilter, setAuditFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editJD, setEditJD] = useState('');
  const [saving, setSaving] = useState(false);

  // ⬡B:aoa.audit_fix:FIX:H1b_agents_page_fetch_on_click:20260404⬡
  // Actions load on click, not preloaded (was 103 sequential queries)
  const [loadingActions, setLoadingActions] = useState(false);

  const selectAgent = async (agent) => {
    setSelected(agent);
    setLoadingActions(true);
    try {
      const res = await fetch(`/api/agents/actions?agent=${encodeURIComponent(agent.agent_id)}`);
      const data = await res.json();
      // ⬡B:aoa.audit_fix:FIX:M16_no_state_mutation:20260404⬡ Don't mutate state directly
      setSelected(prev => prev ? { ...prev, recent_actions: data.actions || [] } : null);
    } catch {
      setSelected(prev => prev ? { ...prev, recent_actions: [] } : null);
    }
    setLoadingActions(false);
  };

  const saveJD = async () => {
    if (!selected || !editJD.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/agents', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, full_description: editJD })
      });
      // ⬡B:aoa.audit_fix:FIX:M16_savejd_no_mutation:20260404⬡ Immutable state update
      setSelected(prev => prev ? { ...prev, full_description: editJD } : null);
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  useEffect(() => {
    fetch('/api/agents').then(r => r.json()).then(d => {
      setAgents(d.table_agents || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading text="Loading agent roster..." />;

  const depts = [...new Set(agents.map(a => a.department).filter(Boolean))].sort();
  const auditStatuses = [...new Set(agents.map(a => a.audit_status).filter(Boolean))].sort();

  let filtered = agents;
  if (search) filtered = filtered.filter(a =>
    (a.agent_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.agent_id || '').toLowerCase().includes(search.toLowerCase())
  );
  if (deptFilter) filtered = filtered.filter(a => a.department === deptFilter);
  if (auditFilter) filtered = filtered.filter(a => a.audit_status === auditFilter);

  const audited = agents.filter(a => a.audit_status === 'audited').length;
  const needsAudit = agents.filter(a => a.audit_status === 'needs_real_audit' || !a.audit_status).length;

  return (
    <div className="fade-in">
      <PageTitle sub={`${agents.length} agents loaded — this is by design`}>Agent Roster</PageTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Stat value={agents.length} label="Total Agents" color="text-cyan-400" />
        <Stat value={audited} label="Properly Audited" color="text-green-400" />
        <Stat value={needsAudit} label="Needs Real Audit" color="text-yellow-400" />
        <Stat value={depts.length} label="Departments" />
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..."
          className="w-64 text-xs" />
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="w-auto bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-gray-300">
          <option value="">All Departments</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={auditFilter} onChange={e => setAuditFilter(e.target.value)}
          className="w-auto bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-gray-300">
          <option value="">All Audit Status</option>
          {auditStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <Card title={`Agents (${filtered.length})`}>
        {filtered.length === 0 ? <Empty text="No agents match filters" /> : (
          <div className="space-y-0">
            {filtered.map(agent => (
              <div key={agent.id || agent.agent_id} className="border-b border-white/[0.03] last:border-0 py-2.5 px-1 cursor-pointer hover:bg-white/[0.02] transition-all"
                onClick={() => selectAgent(agent)}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">{agent.agent_name || agent.agent_id}</span>
                      <Tag variant={agent.audit_status === 'audited' ? 'ok' : agent.audit_status === 'needs_real_audit' ? 'warn' : 'dim'}>
                        {agent.audit_status || 'unknown'}
                      </Tag>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {agent.department && <Pill>{agent.department}</Pill>}
                      {agent.tier && <Pill>Tier {agent.tier}</Pill>}
                    </div>
                  </div>
                  <span className="text-dim text-xs">▸</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.agent_name || 'Agent'} wide>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><span className="text-[10px] text-dim block">ID</span><span className="text-xs text-white">{selected.agent_id}</span></div>
              <div><span className="text-[10px] text-dim block">Department</span><span className="text-xs text-white">{selected.department || '—'}</span></div>
              <div><span className="text-[10px] text-dim block">Tier</span><span className="text-xs text-white">{selected.tier || '—'}</span></div>
              <div><span className="text-[10px] text-dim block">Audit</span><Tag variant={selected.audit_status === 'audited' ? 'ok' : 'warn'}>{selected.audit_status || '—'}</Tag></div>
            </div>
            {selected.full_description && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] text-dim">Job Description</span>
                  <Btn size="sm" onClick={() => { setEditing(!editing); setEditJD(selected.full_description || ''); }}>
                    {editing ? 'Cancel' : 'Edit'}
                  </Btn>
                </div>
                {editing ? (
                  <div>
                    <textarea value={editJD} onChange={e => setEditJD(e.target.value)}
                      className="text-xs w-full min-h-[200px] font-mono" rows={12} />
                    <Btn variant="primary" size="sm" onClick={saveJD} disabled={saving} className="mt-2">
                      {saving ? 'Saving...' : 'Save JD'}
                    </Btn>
                  </div>
                ) : (
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3 max-h-[300px] overflow-y-auto">{selected.full_description}</pre>
                )}
              </div>
            )}
            {loadingActions ? (
              <div className="text-xs text-dim py-4 text-center">Loading actions...</div>
            ) : (selected.recent_actions || []).length > 0 && (
              <div>
                <span className="text-[10px] text-dim block mb-2">Recent Actions</span>
                <div className="space-y-1.5">
                  {selected.recent_actions.map((a, i) => (
                    <div key={i} className="glass-subtle p-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-300">{a.memory_type}</span>
                        <span className="text-dim">{friendlyDate(a.created_at)}</span>
                      </div>
                      {a.source && <div className="text-dim text-[10px] mt-0.5">{a.source}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
