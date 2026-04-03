'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Modal, Empty } from '../../components/UI';

const PROVIDER_INFO = {
  ANTHROPIC_API_KEY: { provider: 'Anthropic (Claude)', color: 'text-purple', infra: 'AWS', console: 'https://console.anthropic.com/settings/keys' },
  GROQ_API_KEY: { provider: 'Groq', color: 'text-orange-400', infra: 'Independent', console: 'https://console.groq.com/keys' },
  GOOGLE_AI_API_KEY: { provider: 'Google (Gemini)', color: 'text-blue-400', infra: 'GCP', console: 'https://aistudio.google.com/apikey' },
  OPENAI_API_KEY: { provider: 'OpenAI (GPT)', color: 'text-green-400', infra: 'Azure', console: 'https://platform.openai.com/api-keys' },
  ELEVENLABS_API_KEY: { provider: 'ElevenLabs (Voice)', color: 'text-pink-400', infra: 'Independent', console: 'https://elevenlabs.io/app/settings/api-keys' },
  NYLAS_API_KEY: { provider: 'Nylas (Email)', color: 'text-cyan-400', infra: 'AWS', console: 'https://dashboard-v3.nylas.com' },
  OMI_API_KEY: { provider: 'OMI (Pendant)', color: 'text-yellow-400', infra: 'Independent', console: 'https://docs.omi.me' },
  SUPABASE_SERVICE_KEY: { provider: 'Supabase (Brain)', color: 'text-emerald-400', infra: 'AWS', console: 'https://supabase.com/dashboard' },
  PERPLEXITY_API_KEY: { provider: 'Perplexity (Search)', color: 'text-indigo-400', infra: 'Independent', console: 'https://www.perplexity.ai/settings/api' },
};

export default function KeysPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [newValue, setNewValue] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  const load = () => {
    setLoading(true);
    fetch('/api/keys').then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const testKey = async () => {
    if (!newValue.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_anthropic', value: newValue })
      });
      const d = await res.json();
      setTestResult(d);
    } catch (e) { setTestResult({ valid: false, detail: e.message }); }
    setTesting(false);
  };

  const updateKey = async (serviceId, key) => {
    if (!newValue.trim()) return;
    setUpdating(true);
    setUpdateResult(null);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', serviceId, key, value: newValue })
      });
      const d = await res.json();
      setUpdateResult(d);
      if (d.success) setTimeout(load, 2000);
    } catch (e) { setUpdateResult({ error: e.message }); }
    setUpdating(false);
  };

  if (loading || !data) return <Loading text="Loading key status..." />;

  const h = data.health || {};
  const providerUp = Object.values(h).filter(v => v === 'up').length;
  const providerDown = Object.values(h).filter(v => v === 'down').length;

  return (
    <div className="fade-in">
      <PageTitle sub="Swap API keys on the fly. No deploy needed. Failover status at a glance.">Key Management</PageTitle>

      {/* Provider health status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat value={providerUp} label="Providers Up" color="text-green-400" />
        <Stat value={providerDown} label="Providers Down" color={providerDown > 0 ? 'text-red-400' : 'text-green-400'} />
        <Stat value={h.ababase === 'up' ? 'Online' : 'Offline'} label="ABAbase" color={h.ababase === 'up' ? 'text-green-400' : 'text-red-400'} />
        <Stat value={h.anthropic === 'up' ? 'Online' : h.anthropic === 'overloaded' ? 'Slow' : 'Down'}
          label="Anthropic API" color={h.anthropic === 'up' ? 'text-green-400' : h.anthropic === 'overloaded' ? 'text-yellow-400' : 'text-red-400'} />
      </div>

      {/* Provider status strip */}
      <Card title="Provider Status" className="mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(h).map(([name, status]) => (
            <div key={name} className="flex items-center gap-2 text-xs">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                status === 'up' ? 'bg-green-400' : status === 'overloaded' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-gray-300 capitalize">{name}</span>
              <span className={`ml-auto text-[10px] ${status === 'up' ? 'text-green-400' : status === 'overloaded' ? 'text-yellow-400' : 'text-red-400'}`}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Failover chain */}
      <Card title="Failover Chain" className="mb-4">
        <div className="text-xs text-gray-300 space-y-1.5">
          <div className="flex items-center gap-2">
            <Tag variant={h.anthropic === 'up' ? 'ok' : 'err'}>1</Tag>
            <span>Anthropic Claude (primary) → Sonnet for chat, Haiku for plumbing</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag variant={h.groq === 'up' ? 'ok' : h.groq === 'down' ? 'err' : 'warn'}>2</Tag>
            <span>Groq (voice speed) → Sub-100ms for VARA, TIM, OMI triage</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag variant="dim">3</Tag>
            <span>Gemini Flash (background) → SIGIL, SHADOW, routing, synthesis</span>
          </div>
          <div className="flex items-center gap-2">
            <Tag variant="dim">4</Tag>
            <span>OpenAI GPT (universal backup) → Fallback if Anthropic is down</span>
          </div>
        </div>
        <div className="text-[10px] text-dim mt-3">
          Each provider runs on different cloud infrastructure (AWS, GCP, Azure). They do not fail together unless there is an internet-wide outage.
        </div>
      </Card>

      {/* Per-service key inventory */}
      {Object.entries(data.services || {}).map(([serviceName, svc]) => (
        <Card key={serviceName} title={serviceName}>
          {Object.keys(svc.vars).length === 0 ? <Empty text="No API keys found" /> : (
            <div className="space-y-0">
              {Object.entries(svc.vars).sort((a, b) => a[0].localeCompare(b[0])).map(([varKey, info]) => {
                const provInfo = PROVIDER_INFO[varKey] || {};
                return (
                  <div key={varKey} className="border-b border-white/[0.03] last:border-0 py-2.5 px-1 flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${info.hasValue ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white font-mono">{varKey}</div>
                      <div className="text-[10px] text-dim">
                        {provInfo.provider && <span className={provInfo.color}>{provInfo.provider}</span>}
                        {provInfo.infra && <span className="text-dim ml-2">({provInfo.infra})</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-dim font-mono">{info.preview}</span>
                    <span className="text-[10px] text-dim">{info.length} chars</span>
                    {provInfo.console && (
                      <a href={provInfo.console} target="_blank" rel="noopener" className="text-[10px] text-purple hover:underline">Console</a>
                    )}
                    <Btn size="sm" onClick={() => {
                      setEditModal({ serviceName, serviceId: svc.serviceId, key: varKey, provider: provInfo });
                      setNewValue('');
                      setTestResult(null);
                      setUpdateResult(null);
                    }}>Swap</Btn>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ))}

      {/* Edit/Swap Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Swap Key: ${editModal?.key}`}>
        {editModal && (
          <div className="space-y-4">
            <div className="glass-subtle p-3 rounded-lg">
              <div className="text-xs"><span className="text-dim">Service:</span> <span className="text-white">{editModal.serviceName}</span></div>
              <div className="text-xs mt-1"><span className="text-dim">Key:</span> <span className="text-cyan-400 font-mono">{editModal.key}</span></div>
              {editModal.provider?.provider && (
                <div className="text-xs mt-1"><span className="text-dim">Provider:</span> <span className={editModal.provider.color}>{editModal.provider.provider}</span></div>
              )}
            </div>

            <div>
              <label className="text-[10px] text-dim block mb-1">New key value</label>
              <input type="text" value={newValue} onChange={e => setNewValue(e.target.value)}
                placeholder="Paste new key here..." className="font-mono text-xs" />
            </div>

            <div className="flex gap-2">
              {editModal.key === 'ANTHROPIC_API_KEY' && (
                <Btn onClick={testKey} disabled={testing || !newValue.trim()}>
                  {testing ? 'Testing...' : 'Test Key First'}
                </Btn>
              )}
              <Btn variant="primary" onClick={() => updateKey(editModal.serviceId, editModal.key)}
                disabled={updating || !newValue.trim()}>
                {updating ? 'Updating...' : `Set on ${editModal.serviceName}`}
              </Btn>
            </div>

            {testResult && (
              <div className={`text-xs p-2 rounded-lg ${testResult.valid ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {testResult.valid ? 'Key is valid and working.' : `Key failed: ${testResult.detail || 'Invalid'}`}
              </div>
            )}

            {updateResult && (
              <div className={`text-xs p-2 rounded-lg ${updateResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {updateResult.success
                  ? `Updated. ${updateResult.totalVars} env vars confirmed (none wiped). Service will pick up the new key on next request or deploy.`
                  : `Error: ${updateResult.error}`}
              </div>
            )}

            <div className="text-[10px] text-yellow-400/70">
              911 Rule 3: This uses full-list PUT. All {editModal.serviceName} env vars are pulled first, the one key is updated, then the full list is PUT back. Nothing gets wiped.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
