'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Empty, Btn, Tag, Modal } from '../../components/UI';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState({});

  async function load() {
    setLoading(true);
    const d = await fetch('/api/agents').then(r => r.json());
    setAgents(d.agents || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEdit(agent) {
    setEditData({ ...agent });
    setEditing(agent);
  }

  async function saveAgent() {
    const { id, ...updates } = editData;
    await fetch('/api/agents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
    setEditing(null);
    load();
  }

  if (loading) return <Loading />;

  return (
    <div>
      <PageTitle right={<><Btn onClick={load}>Refresh</Btn><span className="text-dim text-xs">{agents.length} agents</span></>}>Agent Job Descriptions</PageTitle>
      <Card>
        <table>
          <thead><tr><th>Name</th><th>Acronym</th><th>Full Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {agents.map(a => (
              <tr key={a.id}>
                <td className="font-semibold text-white">{a.agent_name}</td>
                <td><Tag>{a.acronym || '-'}</Tag></td>
                <td className="text-dim">{a.full_name || '-'}</td>
                <td className="max-w-[350px]">{(a.role_summary || a.description || '').slice(0, 150)}</td>
                <td><Tag variant={a.status === 'active' ? 'ok' : 'dim'}>{a.status || 'active'}</Tag></td>
                <td><Btn onClick={() => openEdit(a)}>Edit</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Edit Agent: ${editing?.agent_name || ''}`}>
        {editing && (
          <div className="space-y-3">
            {Object.entries(editData).filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k)).map(([key, val]) => {
              const strVal = typeof val === 'object' ? JSON.stringify(val, null, 2) : (val || '');
              const isLong = strVal.length > 80;
              return (
                <div key={key}>
                  <label className="text-[10px] text-dim uppercase tracking-wider">{key}</label>
                  {isLong ? (
                    <textarea rows={5} value={editData[key] || ''} onChange={e => setEditData({ ...editData, [key]: e.target.value })} />
                  ) : (
                    <input value={editData[key] || ''} onChange={e => setEditData({ ...editData, [key]: e.target.value })} />
                  )}
                </div>
              );
            })}
            <div className="flex gap-2 pt-2">
              <Btn variant="primary" size="md" onClick={saveAgent}>Save Changes</Btn>
              <Btn size="md" onClick={() => setEditing(null)}>Cancel</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
