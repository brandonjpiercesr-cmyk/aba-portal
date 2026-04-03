'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Modal, Empty, friendlyDate } from '../../components/UI';

export default function EmailPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [tracing, setTracing] = useState(null);
  const [trace, setTrace] = useState(null);

  useEffect(() => {
    fetch('/api/email').then(r => r.json()).then(d => {
      setEmails(d.emails || d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const traceEmail = async (email) => {
    setTracing(email);
    try {
      const content = typeof email.content === 'string' ? JSON.parse(email.content) : email.content;
      const q = content?.subject || content?.to || content?.message_id || '';
      const res = await fetch('/api/email/trace?q=' + encodeURIComponent(q)).then(r => r.json());
      setTrace(res);
    } catch { setTrace({ error: 'Could not trace' }); }
    setSelected(email);
  };

  if (loading) return <Loading text="Loading email trace..." />;

  const sent = emails.filter(e => {
    const c = typeof e.content === 'string' ? JSON.parse(e.content) : e.content;
    return c?.direction === 'sent' || e.memory_type === 'email_sent' || e.memory_type === 'email_dedup';
  });
  const received = emails.filter(e => {
    const c = typeof e.content === 'string' ? JSON.parse(e.content) : e.content;
    return c?.direction === 'received' || e.memory_type === 'email_task_processed';
  });

  return (
    <div className="fade-in">
      <PageTitle sub="Trace every email ABA sent or processed" right={<Btn onClick={() => window.location.reload()}>Refresh</Btn>}>Email Trace</PageTitle>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat value={emails.length} label="Total Email Events" />
        <Stat value={sent.length} label="Sent" color="text-green-400" />
        <Stat value={received.length} label="Processed" color="text-cyan-400" />
      </div>

      <Card title={`Email Events (${emails.length})`}>
        {emails.length === 0 ? <Empty text="No email events found" /> : (
          <div className="space-y-0">
            {emails.slice(0, 100).map((email, i) => {
              let content = {};
              try { content = typeof email.content === 'string' ? JSON.parse(email.content) : email.content; } catch {}
              return (
                <div key={i} className="border-b border-white/[0.03] last:border-0 py-2.5 px-1 cursor-pointer hover:bg-white/[0.02] transition-all"
                  onClick={() => traceEmail(email)}>
                  <div className="flex items-center gap-2">
                    <Tag variant={email.memory_type === 'email_sent' || email.memory_type === 'email_dedup' ? 'ok' : 'cyan'}>
                      {email.memory_type === 'email_sent' || email.memory_type === 'email_dedup' ? 'SENT' : 'IN'}
                    </Tag>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{content?.subject || content?.to || 'Email event'}</div>
                      <div className="text-[10px] text-dim truncate">
                        {content?.to && <span>To: {content.to}</span>}
                        {content?.from && <span> From: {content.from}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-dim whitespace-nowrap">{friendlyDate(email.created_at)}</span>
                    <span className="text-purple text-[10px]">Trace ▸</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => { setSelected(null); setTrace(null); }} title="Email Trace" wide>
        {selected && (() => {
          let content = {};
          try { content = typeof selected.content === 'string' ? JSON.parse(selected.content) : selected.content; } catch {}
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div><span className="text-[10px] text-dim block">Type</span><Tag>{selected.memory_type}</Tag></div>
                <div><span className="text-[10px] text-dim block">Source</span><span className="text-white break-all">{selected.source}</span></div>
                <div><span className="text-[10px] text-dim block">When</span><span className="text-white">{friendlyDate(selected.created_at)}</span></div>
              </div>
              {content?.to && <div className="text-xs"><span className="text-dim">To: </span><span className="text-white">{content.to}</span></div>}
              {content?.from && <div className="text-xs"><span className="text-dim">From: </span><span className="text-white">{content.from}</span></div>}
              {content?.subject && <div className="text-xs"><span className="text-dim">Subject: </span><span className="text-white">{content.subject}</span></div>}
              {content?.body && (
                <div>
                  <span className="text-[10px] text-dim block mb-1">Body</span>
                  <div className="text-xs text-gray-300 bg-white/[0.02] rounded-lg p-3 max-h-[200px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: content.body }} />
                </div>
              )}
              {trace && !trace.error && (
                <div>
                  <span className="text-[10px] text-dim block mb-1">Trace Path</span>
                  <pre className="text-xs text-gray-300 bg-white/[0.02] rounded-lg p-3 max-h-[200px] overflow-y-auto mono">
                    {JSON.stringify(trace, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
