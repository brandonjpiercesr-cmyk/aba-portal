'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Modal, Empty, friendlyDate, timeAgo } from '../../components/UI';

// Code path mapping for email trace
const CODE_PATHS = {
  mars_pipeline: {
    label: 'MARS Pipeline Email',
    chain: 'OMI pendant → /api/omi/webhook → MARSRealtime.processCompletedMemory() → sendMARSEmail()',
    files: 'services/taste/MARSRealtime.js (~line 334)',
    killSwitch: 'mars_email',
    detect: (source, type) => source?.includes('mars.pipeline') || source?.includes('mars.report') || type === 'mars_pipeline_result',
  },
  iman_send: {
    label: 'IMAN Direct Email (AIR tool)',
    chain: 'User/system → AIR → Claude chose send_email tool → airExecutor.js executeTool()',
    files: 'lib/airExecutor.js (~line 774), lib/air.js (~line 1016)',
    killSwitch: null,
    detect: (source, type) => source?.startsWith('iman_send') || source?.startsWith('iman_email'),
  },
  proactive_email: {
    label: 'Proactive/DAWN Email',
    chain: 'Heartbeat cron → HeartbeatService → DAWN briefing generation → DAWNDeliveryService.sendEmail()',
    files: 'services/dawn/DAWNDeliveryService.js, services/dawn/DAWNService_v2.js',
    killSwitch: 'proactive_email',
    detect: (source, type, content) => source?.includes('dawn') || source?.includes('proactive') || type?.includes('dawn'),
  },
  taste_email: {
    label: 'TASTE Transcript Email',
    chain: 'OMI stream → TasteBatchProcessor → batch compiled → email summary sent',
    files: 'services/taste/TasteBatchProcessor.js',
    killSwitch: 'taste_transcript',
    detect: (source, type) => source?.includes('taste') || type?.includes('taste'),
  },
  cook_email: {
    label: 'COOK Scaffold Email',
    chain: 'COOK agent → task created → scaffold delivery email',
    files: 'services/taste/COOKExecutor.js',
    killSwitch: 'cook_scaffold',
    detect: (source, type) => source?.includes('cook') || type?.includes('cook'),
  },
  awa_email: {
    label: 'AWA Alert Email',
    chain: 'AWA proactive check → materials ready / interview upcoming → alert email',
    files: 'services/awa/AWAProactive.js',
    killSwitch: 'awa_proactive',
    detect: (source, type) => source?.includes('awa') || type?.includes('awa'),
  },
};

function detectCodePath(email) {
  const content = typeof email.content === 'string' ? JSON.parse(email.content) : email.content;
  for (const [key, path] of Object.entries(CODE_PATHS)) {
    try {
      if (path.detect(email.source, email.memory_type, content)) return { key, ...path };
    } catch {}
  }
  return { key: 'unknown', label: 'Unknown Path', chain: '—', files: '—', killSwitch: null };
}

export default function EmailPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [codePath, setCodePath] = useState(null);
  const [killing, setKilling] = useState(false);

  useEffect(() => {
    fetch('/api/email').then(r => r.json()).then(d => {
      setEmails(d.emails || d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const openTrace = (email) => {
    setCodePath(detectCodePath(email));
    setSelected(email);
  };

  const killPath = async (switchId) => {
    setKilling(true);
    try {
      await fetch('/api/killswitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: switchId, action: 'kill', reason: 'Killed from Email Trace page' })
      });
    } catch {}
    setKilling(false);
  };

  if (loading) return <Loading text="Loading email trace..." />;

  const sent = emails.filter(e => e.memory_type === 'email_sent' || e.memory_type === 'email_dedup');
  const processed = emails.filter(e => e.memory_type === 'email_task_processed');

  return (
    <div className="fade-in">
      <PageTitle sub="Trace every email ABA sent or processed — click any email to see the code path" right={
        <Btn onClick={() => window.location.reload()}>Refresh</Btn>
      }>Email Trace</PageTitle>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat value={emails.length} label="Total Email Events" />
        <Stat value={sent.length} label="Sent by ABA" color="text-green-400" />
        <Stat value={processed.length} label="Inbound Processed" color="text-cyan-400" />
      </div>

      <Card title={`Email Events (${emails.length})`}>
        {emails.length === 0 ? <Empty text="No email events found in the last 24 hours." /> : (
          <div className="space-y-0">
            {emails.slice(0, 100).map((email, i) => {
              let content = {};
              try { content = typeof email.content === 'string' ? JSON.parse(email.content) : email.content; } catch {}
              const path = detectCodePath(email);
              return (
                <div key={i} className="border-b border-white/[0.03] last:border-0 py-2.5 px-1 cursor-pointer hover:bg-white/[0.02] transition-all"
                  onClick={() => openTrace(email)}>
                  <div className="flex items-center gap-2">
                    <Tag variant={email.memory_type === 'email_sent' || email.memory_type === 'email_dedup' ? 'ok' : 'cyan'}>
                      {email.memory_type === 'email_sent' || email.memory_type === 'email_dedup' ? 'SENT' : 'IN'}
                    </Tag>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{content?.subject || content?.to || 'Email event'}</div>
                      <div className="text-[10px] text-dim truncate">
                        {content?.to && <span>To: {content.to} </span>}
                        <span className="text-purple/60">{path.label}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-dim whitespace-nowrap">{timeAgo(email.created_at)}</span>
                    <span className="text-purple text-[10px]">Trace ▸</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => { setSelected(null); setCodePath(null); }} title="Email Trace" wide>
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

              {/* Code path trace */}
              {codePath && (
                <div className="glass-subtle p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">Code Path: {codePath.label}</span>
                    {codePath.killSwitch && (
                      <Btn variant="danger" size="sm" onClick={() => killPath(codePath.killSwitch)} disabled={killing}>
                        {killing ? 'Killing...' : `Kill ${codePath.killSwitch}`}
                      </Btn>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-dim block mb-1">Trigger Chain</span>
                    <span className="text-xs text-gray-300">{codePath.chain}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-dim block mb-1">Files</span>
                    <span className="text-xs text-cyan-400 font-mono">{codePath.files}</span>
                  </div>
                  {codePath.killSwitch && (
                    <div className="text-[10px] text-yellow-400/70">
                      Kill switch "{codePath.killSwitch}" will disable this entire code path without a deploy.
                    </div>
                  )}
                </div>
              )}

              {content?.body && (
                <div>
                  <span className="text-[10px] text-dim block mb-1">Body</span>
                  <div className="text-xs text-gray-300 bg-white/[0.02] rounded-lg p-3 max-h-[200px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: content.body }} />
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
