'use client';
// ⬡B:VIGIL.gatekeeper:AOA:access_control_page:20260408⬡
// AOA Portal — Access Control Management
// View and manage who can access which ABA platform.
// Toggle master switch, lock/unlock platforms, grant/revoke per-HAM access.

import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, Modal, Empty, timeAgo } from '../../components/UI';
import { ABACIA_URL } from '../../lib/config';
import { auth } from '../../lib/firebase';

const PLATFORMS = ['all', 'myaba', 'cib', 'awa', 'gmgu', 'mesa', 'iris', 'aoa', 'vara', 'omi', 'ccwa'];

async function abaFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', 'X-ABA-Platform': 'aoa' };
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {}
  return fetch(`${ABACIA_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
}

export default function AccessControlPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [masterEnforcing, setMasterEnforcing] = useState(false);
  const [showGrant, setShowGrant] = useState(false);
  const [grantForm, setGrantForm] = useState({ ham_id: '', email: '', platform: 'all', notes: '' });
  const [error, setError] = useState(null);

  async function loadRules() {
    setLoading(true);
    try {
      const res = await abaFetch('/api/access/rules');
      const d = await res.json();
      if (d.success) {
        setRules(d.rules || []);
        const master = (d.rules || []).find(r => r.ham_id === '_system' && r.platform === 'all');
        setMasterEnforcing(master ? !master.access : true);
      } else {
        setError(d.error || 'Failed to load rules');
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { loadRules(); }, []);

  async function toggleMaster() {
    const newState = !masterEnforcing;
    await abaFetch('/api/access/master/toggle', {
      method: 'POST', body: JSON.stringify({ enforcing: newState })
    });
    setMasterEnforcing(newState);
    loadRules();
  }

  async function grantAccess() {
    if (!grantForm.ham_id || !grantForm.email) return;
    await abaFetch('/api/access/grant', {
      method: 'POST', body: JSON.stringify(grantForm)
    });
    setShowGrant(false);
    setGrantForm({ ham_id: '', email: '', platform: 'all', notes: '' });
    loadRules();
  }

  async function revokeRule(id) {
    if (!confirm('Revoke this access rule?')) return;
    await abaFetch('/api/access/revoke', {
      method: 'POST', body: JSON.stringify({ id })
    });
    loadRules();
  }

  async function togglePlatformLock(platform, currentlyLocked) {
    if (currentlyLocked) {
      const lockRule = rules.find(r => r.ham_id === '_lock' && r.platform === platform);
      if (lockRule) await revokeRule(lockRule.id);
    } else {
      await abaFetch('/api/access/grant', {
        method: 'POST',
        body: JSON.stringify({ ham_id: '_lock', email: '_lock@system', platform, notes: `Platform locked via AOA Portal` })
      });
    }
    loadRules();
  }

  const systemRules = rules.filter(r => r.ham_id === '_system' || r.ham_id === '_lock');
  const hamRules = rules.filter(r => r.ham_id !== '_system' && r.ham_id !== '_lock');
  const lockedPlatforms = rules.filter(r => r.ham_id === '_lock' && r.access).map(r => r.platform);

  const byHam = {};
  hamRules.forEach(r => {
    if (!byHam[r.ham_id]) byHam[r.ham_id] = [];
    byHam[r.ham_id].push(r);
  });

  return (
    <div>
      <PageTitle right={<Btn onClick={loadRules}>Refresh</Btn>}>Access Control</PageTitle>

      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

      <Card title="Master Switch" className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">
              {masterEnforcing
                ? 'Gatekeeper is ENFORCING — only whitelisted HAMs can access locked platforms'
                : 'Gatekeeper is OPEN — all HAMs can access everything (except locked platforms)'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Platform locks work independently. Even when master is open, locked platforms require explicit grants.
            </p>
          </div>
          <Btn variant={masterEnforcing ? 'danger' : 'default'} onClick={toggleMaster}>
            {masterEnforcing ? 'Unlock (Open Access)' : 'Lock Down (Enforce)'}
          </Btn>
        </div>
      </Card>

      <Card title="Platform Locks" className="mb-4">
        <p className="text-xs text-gray-500 mb-3">Locked platforms require explicit HAM grants even when master switch is open.</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.filter(p => p !== 'all').map(p => {
            const locked = lockedPlatforms.includes(p);
            return (
              <button
                key={p}
                onClick={() => togglePlatformLock(p, locked)}
                className={`px-3 py-1.5 rounded text-sm font-mono transition ${
                  locked
                    ? 'bg-red-900/40 text-red-300 border border-red-700'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {locked ? '🔒' : '🔓'} {p.toUpperCase()}
              </button>
            );
          })}
        </div>
      </Card>

      <Card
        title={`HAM Access Rules (${hamRules.length})`}
        actions={<Btn onClick={() => setShowGrant(true)}>+ Grant Access</Btn>}
        className="mb-4"
      >
        {loading ? <Loading /> : Object.keys(byHam).length === 0 ? <Empty text="No HAM access rules" /> : (
          <div className="space-y-3">
            {Object.entries(byHam).sort((a,b) => a[0].localeCompare(b[0])).map(([hamId, hamRules]) => (
              <div key={hamId} className="border border-zinc-800 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm">{hamId.toUpperCase()}</span>
                  <span className="text-xs text-gray-500">{hamRules.length} rule{hamRules.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-1">
                  {hamRules.map(r => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Tag variant={r.access ? 'info' : 'error'}>{r.access ? 'ALLOW' : 'DENY'}</Tag>
                        <span className="text-gray-400">{r.email || '(no email)'}</span>
                        <span className="font-mono text-gray-500">{r.platform}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">{timeAgo(r.updated_at)}</span>
                        <button onClick={() => revokeRule(r.id)} className="text-red-500 hover:text-red-300 text-xs">revoke</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showGrant} onClose={() => setShowGrant(false)} title="Grant Access">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">HAM ID</label>
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              placeholder="e.g., bj, eric, vante"
              value={grantForm.ham_id} onChange={e => setGrantForm({...grantForm, ham_id: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Email</label>
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              placeholder="e.g., bryanjpiercejr@gmail.com"
              value={grantForm.email} onChange={e => setGrantForm({...grantForm, email: e.target.value})} />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Platform</label>
            <select className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              value={grantForm.platform} onChange={e => setGrantForm({...grantForm, platform: e.target.value})}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Notes (optional)</label>
            <input className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
              placeholder="Why are you granting this?"
              value={grantForm.notes} onChange={e => setGrantForm({...grantForm, notes: e.target.value})} />
          </div>
          <Btn variant="primary" onClick={grantAccess}>Grant Access</Btn>
        </div>
      </Modal>
    </div>
  );
}
