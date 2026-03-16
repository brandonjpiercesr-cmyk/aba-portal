'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Empty, Btn, Tag, Modal, Pill } from '../../components/UI';

export default function AgentsPage() {
  const [tableAgents, setTableAgents] = useState([]);
  const [memoryAgents, setMemoryAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});
  const [editTarget, setEditTarget] = useState('table');
  const [tab, setTab] = useState('table');

  async function load() {
    setLoading(true);
    const d = await fetch('/api/agents').then(r => r.json());
    setTableAgents(d.table_agents || []);
    setMemoryAgents(d.memory_agents || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEditTable(agent) {
    setEditData({ ...agent });
    setEditing(agent);
    setEditTarget('table');
  }

  function openEditMemory(agent) {
    setEditData({ id: agent.id, content: agent.content || '' });
    setEditing(agent);
    setEditTarget('memory');
  }

  async function saveAgent() {
    const { id, ...updates } = editData;
    await fetch('/api/agents', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, target: editTarget, ...updates })
    });
    setEditing(null);
    load();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageTitle right={<><Btn onClick={load}>Refresh</Btn><span className="text-dim text-xs">{tableAgents.length} table + {memoryAgents.length} memory</span></>}>Agent Job Descriptions</PageTitle>

      <div className="flex gap-2 mb-4">
        <Btn variant={tab === 'table' ? 'primary' : 'default'} size="md" onClick={() => setTab('table')}>aba_agent_jds Table ({tableAgents.length})</Btn>
        <Btn variant={tab === 'memory' ? 'primary' : 'default'} size="md" onClick={() => setTab('memory')}>Brain Memory JDs ({memoryAgents.length})</Btn>
      </div>

      {tab === 'table' && (
        <Card title="aba_agent_jds (structured registry)">
          {tableAgents.length === 0 ? <Empty text="No agents in table" /> : (
            <table>
              <thead><tr><th>Agent ID</th><th>Full Name</th><th>Department</th><th>Type</th><th>Status</th><th>Tier</th><th></th></tr></thead>
              <tbody>
                {tableAgents.map(a => (
                  <tr key={a.id}>
                    <td className="font-semibold text-white">{a.agent_id}</td>
                    <td>{a.full_name}</td>
                    <td><Pill>{a.department || '-'}</Pill></td>
                    <td>{a.agent_type || '-'}</td>
                    <td><Tag variant={a.status === 'active' ? 'ok' : 'dim'}>{a.status || 'active'}</Tag></td>
                    <td>{a.tier || '-'}</td>
                    <td><Btn onClick={() => openEditTable(a)}>Edit</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'memory' && (
        <Card title="aba_memory (brain-stored JDs)">
          {memoryAgents.length === 0 ? <Empty text="No agents in memory" /> : (
            <table>
              <thead><tr><th>Source</th><th>Content Preview</th><th>Tags</th><th></th></tr></thead>
              <tbody>
                {memoryAgents.map(a => (
                  <tr key={a.id}>
                    <td className="mono max-w-[200px] truncate" title={a.source}>{a.source}</td>
                    <td className="max-w-[400px]">{(a.content || '').slice(0, 200)}</td>
                    <td>{(a.tags || []).slice(0, 3).map(t => <Pill key={t}>{t}</Pill>)}</td>
                    <td><Btn onClick={() => openEditMemory(a)}>Edit</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit Agent: ${editing?.agent_id || editing?.source || ''}`}>
        {editing && editTarget === 'table' && (
          <div className="space-y-3">
            {Object.entries(editData).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).map(([key, val]) => {
              const strVal = typeof val === 'object' && val !== null ? JSON.stringify(val, null, 2) : String(val || '');
              const isLong = strVal.length > 80;
              return (
                <div key={key}>
                  <label className="text-[10px] text-dim uppercase tracking-wider">{key}</label>
                  {isLong ? (
                    <textarea rows={4} value={typeof editData[key] === 'object' ? JSON.stringify(editData[key], null, 2) : (editData[key] || '')}
                      onChange={e => setEditData({ ...editData, [key]: e.target.value })} />
                  ) : (
                    <input value={editData[key] || ''} onChange={e => setEditData({ ...editData, [key]: e.target.value })} />
                  )}
                </div>
              );
            })}
            <div className="flex gap-2 pt-2">
              <Btn variant="primary" size="md" onClick={saveAgent}>Save to aba_agent_jds</Btn>
              <Btn size="md" onClick={() => setEditing(null)}>Cancel</Btn>
            </div>
          </div>
        )}
        {editing && editTarget === 'memory' && (
          <div className="space-y-3">
            <div><label className="text-[10px] text-dim uppercase tracking-wider">Source</label><div className="mono text-xs text-dim py-1">{editing.source}</div></div>
            <div><label className="text-[10px] text-dim uppercase tracking-wider">Content (full JD)</label>
              <textarea rows={15} value={editData.content || ''} onChange={e => setEditData({ ...editData, content: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Btn variant="primary" size="md" onClick={saveAgent}>Save to Brain</Btn>
              <Btn size="md" onClick={() => setEditing(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
