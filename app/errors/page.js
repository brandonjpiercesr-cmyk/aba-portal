'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Modal, Empty, friendlyDate, timeAgo } from '../../components/UI';

export default function ErrorsPage() {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/errors?hours=${hours}`).then(r => r.json()).then(d => {
      setErrors(d.errors || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, [hours]);

  const parseContent = (content) => {
    try { return typeof content === 'string' ? JSON.parse(content) : content; }
    catch { return { raw: content }; }
  };

  const explainError = (entry) => {
    const content = parseContent(entry.content);
    const msg = content?.error || content?.message || content?.detail || content?.raw || '';
    const source = entry.source || '';

    if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT')) return 'A service could not connect to another service. Likely a cold start or a service that is down.';
    if (msg.includes('401') || msg.includes('Unauthorized')) return 'An API call was rejected because the authentication token is missing or expired.';
    if (msg.includes('rate_limit') || msg.includes('429')) return 'Too many requests in a short window. The API is throttling.';
    if (msg.includes('500') || msg.includes('Internal Server')) return 'The remote service had an internal error. Check if it deployed recently.';
    if (source.includes('nylas')) return 'Email system error. Check Nylas grant status and API key.';
    if (source.includes('anthropic') || source.includes('claude')) return 'AI model error. Could be overloaded or a malformed request.';
    return 'See the raw content for details.';
  };

  if (loading) return <Loading text="Loading error log..." />;

  return (
    <div className="fade-in">
      <PageTitle sub="Recent errors with plain language explanations" right={
        <div className="flex gap-2 items-center">
          <select value={hours} onChange={e => setHours(Number(e.target.value))}
            className="w-auto bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-gray-300">
            <option value={6}>Last 6 hours</option>
            <option value={24}>Last 24 hours</option>
            <option value={72}>Last 3 days</option>
            <option value={168}>Last week</option>
          </select>
          <Btn onClick={load}>Refresh</Btn>
        </div>
      }>Error Log</PageTitle>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Stat value={errors.length} label={`Errors (${hours}h)`} color={errors.length > 0 ? 'text-red-400' : 'text-green-400'} />
        <Stat value={errors.length === 0 ? 'Clean' : 'Issues Found'} label="Status" color={errors.length === 0 ? 'text-green-400' : 'text-yellow-400'} />
        <Stat value={errors[0] ? timeAgo(errors[0].created_at) : '—'} label="Most Recent" />
      </div>

      <Card title={`Errors (${errors.length})`}>
        {errors.length === 0 ? <Empty text="No errors in this time window. All clear." /> : (
          <div className="space-y-0">
            {errors.map((err, i) => {
              const content = parseContent(err.content);
              const explanation = explainError(err);
              return (
                <div key={i} className="border-b border-white/[0.03] last:border-0 py-3 px-1 cursor-pointer hover:bg-white/[0.02] transition-all"
                  onClick={() => setSelected(err)}>
                  <div className="flex items-start gap-2">
                    <Tag variant="err">Error</Tag>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white">{explanation}</div>
                      <div className="text-[10px] text-dim mt-0.5 truncate">
                        {err.source || err.memory_type}
                      </div>
                    </div>
                    <span className="text-[10px] text-dim whitespace-nowrap">{timeAgo(err.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Error Detail" wide>
        {selected && (
          <div className="space-y-3">
            <div className="glass-subtle p-3 rounded-lg">
              <span className="text-[10px] text-dim block mb-1">What happened</span>
              <span className="text-sm text-white">{explainError(selected)}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-[10px] text-dim block">When</span><span className="text-white">{friendlyDate(selected.created_at)}</span></div>
              <div><span className="text-[10px] text-dim block">Source</span><span className="text-white break-all">{selected.source}</span></div>
            </div>
            <div>
              <span className="text-[10px] text-dim block mb-1">Raw Content</span>
              <pre className="text-xs text-gray-300 bg-white/[0.02] rounded-lg p-3 max-h-[300px] overflow-y-auto mono">
                {JSON.stringify(parseContent(selected.content), null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
