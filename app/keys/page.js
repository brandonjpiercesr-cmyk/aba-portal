'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Modal, Empty, friendlyDate } from '../../components/UI';

const PROVIDERS = {
  anthropic: { name: 'Anthropic (Claude)', color: 'text-purple', bg: 'bg-purple/20', infra: 'AWS', models: 'Sonnet 4, Haiku 4.5' },
  gemini: { name: 'Google (Gemini)', color: 'text-blue-400', bg: 'bg-blue-400/20', infra: 'GCP', models: 'Gemini 2.5 Flash' },
  openai: { name: 'OpenAI (GPT)', color: 'text-green-400', bg: 'bg-green-400/20', infra: 'Azure', models: 'GPT-4.1, GPT-4.1-mini' },
  groq: { name: 'Groq (Llama)', color: 'text-orange-400', bg: 'bg-orange-400/20', infra: 'Independent', models: 'Llama 3.1 70B, 8B' },
};

const KEY_INFO = {
  ANTHROPIC_API_KEY: { provider: 'Anthropic', color: 'text-purple', console: 'https://console.anthropic.com/settings/keys' },
  GROQ_API_KEY: { provider: 'Groq', color: 'text-orange-400', console: 'https://console.groq.com/keys' },
  GOOGLE_AI_API_KEY: { provider: 'Google', color: 'text-blue-400', console: 'https://aistudio.google.com/apikey' },
  OPENAI_API_KEY: { provider: 'OpenAI', color: 'text-green-400', console: 'https://platform.openai.com/api-keys' },
  ELEVENLABS_API_KEY: { provider: 'ElevenLabs', color: 'text-pink-400', console: 'https://elevenlabs.io/app/settings/api-keys' },
  NYLAS_API_KEY: { provider: 'Nylas', color: 'text-cyan-400', console: 'https://dashboard-v3.nylas.com' },
  NYLAS_SANDBOX_KEY: { provider: 'Nylas Sandbox', color: 'text-cyan-400', console: 'https://dashboard-v3.nylas.com' },
  SUPABASE_SERVICE_KEY: { provider: 'Supabase', color: 'text-emerald-400', console: 'https://supabase.com/dashboard' },
  SUPABASE_SERVICE_ROLE_KEY: { provider: 'Supabase', color: 'text-emerald-400', console: 'https://supabase.com/dashboard' },
  OMI_API_KEY: { provider: 'OMI', color: 'text-yellow-400' },
};

export default function KeysPage() {
  const [keysData, setKeysData] = useState(null);
  const [failover, setFailover] = useState(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/keys').then(r => r.json()).catch(() => null),
      fetch('/api/failover').then(r => r.json()).catch(() => null),
    ]).then(([k, f]) => {
      setKeysData(k);
      setFailover(f);
      setLoading(false);
    });
  };
  useEffect(load, []);

  const switchProvider = async (provider) => {
    setSwitching(true);
    try {
      const res = await fetch('/api/failover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });
      const d = await res.json();
      setFailover(d);
    } catch {}
    setSwitching(false);
    load();
  };

  const testKey = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_anthropic', value: newValue }) });
      setTestResult(await res.json());
    } catch (e) { setTestResult({ valid: false, detail: e.message }); }
    setTesting(false);
  };

  const updateKey = async (serviceId, key) => {
    setUpdating(true); setUpdateResult(null);
    try {
      const res = await fetch('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', serviceId, key, value: newValue }) });
      setUpdateResult(await res.json());
      setTimeout(load, 2000);
    } catch (e) { setUpdateResult({ error: e.message }); }
    setUpdating(false);
  };

  if (loading) return <Loading text="Loading provider status..." />;

  const h = keysData?.health || {};
  const currentProvider = failover?.provider || 'anthropic';
  const isFailover = failover?.mode === 'failover';

  return (
    <div className="fade-in">
      <PageTitle sub="Provider failover, API key management, and health monitoring">Key Management</PageTitle>

      {/* ═══ FAILOVER SECTION — THE MAIN EVENT ═══ */}
      <div className={`glass-card p-5 mb-6 ${isFailover ? 'border-red-500/40 glow-purple' : 'border-green-500/20'}`}>
        <div className="flex items-center gap-3 mb-4">
          <span className={`w-3 h-3 rounded-full ${isFailover ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
          <h2 className="text-base font-bold text-white">
            {isFailover ? `FAILOVER ACTIVE — Running on ${PROVIDERS[currentProvider]?.name}` : 'Normal Operation — Anthropic Primary'}
          </h2>
        </div>

        {isFailover && failover?.reason && (
          <div className="text-xs text-yellow-400/80 mb-4 glass-subtle p-2 rounded-lg">
            Reason: {failover.reason} — activated {friendlyDate(failover.activated_at)}
          </div>
        )}

        <div className="text-xs text-dim mb-3">
          {isFailover
            ? 'All Sonnet calls are routing through the failover provider. ABA is still working, just on a different brain. Flip back to Anthropic when the outage is resolved.'
            : 'If Anthropic goes down, tap a provider below to reroute ALL AI calls instantly. No deploy needed. Takes effect on the next request.'}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(PROVIDERS).map(([key, prov]) => {
            const isActive = currentProvider === key;
            const isUp = h[key] === 'up' || (key === 'gemini' && h[key] !== 'down') || (key === 'openai' && h[key] !== 'down');
            return (
              <button key={key} onClick={() => !switching && switchProvider(key)} disabled={switching || isActive}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isActive
                    ? `${prov.bg} border-current ${prov.color} shadow-lg`
                    : 'border-white/[0.06] hover:border-white/20 text-gray-400 hover:text-white'
                } ${switching ? 'opacity-50' : ''} disabled:cursor-default`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-current' : isUp ? 'bg-green-400' : 'bg-gray-500'}`} />
                  <span className="text-sm font-semibold">{prov.name.split('(')[0].trim()}</span>
                </div>
                <div className="text-[10px] text-dim">{prov.models}</div>
                <div className="text-[10px] text-dim">{prov.infra}</div>
                {isActive && <Tag variant="ok" className="mt-2">ACTIVE</Tag>}
              </button>
            );
          })}
        </div>

        {isFailover && (
          <div className="mt-4 flex items-center gap-3">
            <Btn variant="success" size="md" onClick={() => switchProvider('anthropic')} disabled={switching}>
              {switching ? 'Switching...' : 'Restore Anthropic (Normal Mode)'}
            </Btn>
            <span className="text-[10px] text-dim">This writes a system_override to brain. airExecutor checks it before every API call.</span>
          </div>
        )}

        {failover?.model_mapping && (
          <div className="mt-3 text-[10px] text-dim">
            Model mapping: {Object.entries(failover.model_mapping).map(([from, to]) => `${from} → ${to}`).join(' | ')}
          </div>
        )}
      </div>

      {/* ═══ PROVIDER HEALTH ═══ */}
      <Card title="Provider Health" className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(h).map(([name, status]) => (
            <div key={name} className="flex items-center gap-2 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full ${status === 'up' ? 'bg-green-400' : status === 'overloaded' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-gray-300 capitalize">{name}</span>
              <span className={`ml-auto text-[10px] font-semibold ${status === 'up' ? 'text-green-400' : status === 'overloaded' ? 'text-yellow-400' : 'text-red-400'}`}>
                {status === 'up' ? 'Online' : status === 'overloaded' ? 'Slow' : 'Down'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ═══ API KEY INVENTORY ═══ */}
      {Object.entries(keysData?.services || {}).map(([serviceName, svc]) => (
        <Card key={serviceName} title={`${serviceName} — API Keys`}>
          {Object.keys(svc.vars).length === 0 ? <Empty text="No API keys found" /> : (
            <div className="space-y-0">
              {Object.entries(svc.vars).sort((a, b) => a[0].localeCompare(b[0])).map(([varKey, info]) => {
                const ki = KEY_INFO[varKey] || {};
                return (
                  <div key={varKey} className="border-b border-white/[0.03] last:border-0 py-2.5 px-1 flex items-center gap-3 flex-wrap">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${info.hasValue ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white font-mono">{varKey}</div>
                      {ki.provider && <span className={`text-[10px] ${ki.color || 'text-dim'}`}>{ki.provider}</span>}
                    </div>
                    <span className="text-[10px] text-dim font-mono hidden md:inline">{info.preview}</span>
                    {ki.console && <a href={ki.console} target="_blank" rel="noopener" className="text-[10px] text-purple hover:underline">Console</a>}
                    <Btn size="sm" onClick={() => { setEditModal({ serviceName, serviceId: svc.serviceId, key: varKey, ki }); setNewValue(''); setTestResult(null); setUpdateResult(null); }}>Swap</Btn>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ))}

      {/* ═══ SWAP MODAL ═══ */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Swap: ${editModal?.key}`}>
        {editModal && (
          <div className="space-y-4">
            <div className="glass-subtle p-3 rounded-lg text-xs">
              <div><span className="text-dim">Service:</span> <span className="text-white">{editModal.serviceName}</span></div>
              <div className="mt-1"><span className="text-dim">Key:</span> <span className="text-cyan-400 font-mono">{editModal.key}</span></div>
            </div>
            <div>
              <label className="text-[10px] text-dim block mb-1">New key value</label>
              <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)} placeholder="Paste new key here..." className="font-mono text-xs" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {editModal.key === 'ANTHROPIC_API_KEY' && (
                <Btn onClick={testKey} disabled={testing || !newValue.trim()}>{testing ? 'Testing...' : 'Test First'}</Btn>
              )}
              <Btn variant="primary" onClick={() => updateKey(editModal.serviceId, editModal.key)} disabled={updating || !newValue.trim()}>
                {updating ? 'Setting...' : 'Set Key'}
              </Btn>
            </div>
            {testResult && (
              <div className={`text-xs p-2 rounded-lg ${testResult.valid ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {testResult.valid ? 'Key works.' : `Failed: ${testResult.detail || 'Invalid'}`}
              </div>
            )}
            {updateResult && (
              <div className={`text-xs p-2 rounded-lg ${updateResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {updateResult.success ? `Set. ${updateResult.totalVars} vars confirmed safe.` : `Error: ${updateResult.error}`}
              </div>
            )}
            <div className="text-[10px] text-dim">Uses full-list PUT. Nothing gets wiped (911 Rule 3).</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
