'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, Pill, friendlyDate, Modal } from '../../components/UI';

export default function ApprovePage() {
  const [queue, setQueue] = useState([]);
  const [ready, setReady] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [processing, setProcessing] = useState({});

  async function load() {
    setLoading(true);
    const d = await fetch('/api/approve').then(r => r.json());
    setQueue(d.queue || []);
    setReady(d.readyToApply || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function act(action, id, data) {
    setProcessing(p => ({ ...p, [id]: true }));
    await fetch('/api/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, id, data })
    });
    setProcessing(p => ({ ...p, [id]: false }));
    load();
  }

  if (loading) return <Loading />;

  return (<div>
    <PageTitle right={<><Btn onClick={load}>Refresh</Btn><span className="text-dim text-xs">{ready.length + queue.length} pending</span></>}>Approval Queue</PageTitle>

    {ready.length > 0 && (
      <Card title={`Ready to Apply (${ready.length} applications)`}>
        <div className="space-y-2">
          {ready.map(job => (
            <div key={job.id} className="glass-card p-3 flex justify-between items-center" data-aba-ctx={JSON.stringify({ type: 'approval_job', label: job.title + ' at ' + job.org, data: job })}>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">{job.title}</div>
                <div className="text-dim text-xs">{job.org} {job.url && <a href={job.url} target="_blank" className="text-accent ml-2">View listing</a>}</div>
              </div>
              <div className="flex gap-2 ml-4">
                <Btn variant="primary" size="md" onClick={() => act('approve_application', job.id)}
                  disabled={processing[job.id]}>{processing[job.id] ? 'Sending...' : 'Approve & Send'}</Btn>
                <Btn variant="danger" size="md" onClick={() => act('dismiss', job.id, JSON.stringify(job.data))}
                  disabled={processing[job.id]}>Dismiss</Btn>
                <Btn size="md" onClick={() => setViewing(job)}>Details</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )}

    {queue.length > 0 && (
      <Card title={`Other Pending Items (${queue.length})`}>
        <table>
          <thead><tr><th>Time</th><th>Type</th><th>Details</th><th></th></tr></thead>
          <tbody>{queue.map(q => {
            let parsed = {};
            try { parsed = typeof q.content === 'string' ? JSON.parse(q.content) : q.content; } catch {}
            return (
              <tr key={q.id}>
                <td className="mono whitespace-nowrap text-xs">{friendlyDate(q.created_at)}</td>
                <td><Tag>{parsed.type || q.memory_type}</Tag></td>
                <td className="max-w-[400px]">{parsed.title || parsed.summary || (q.content || '').slice(0, 200)}</td>
                <td><Btn variant="danger" size="sm" onClick={() => act('dismiss_approval', q.id)}>Dismiss</Btn></td>
              </tr>
            );
          })}</tbody>
        </table>
      </Card>
    )}

    {ready.length === 0 && queue.length === 0 && (
      <div className="glass-card p-12 text-center text-dim">Nothing pending. ABA has not staged anything for your approval.</div>
    )}

    <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title || 'Details'}>
      {viewing && (<div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div><span className="text-dim">Company:</span> <span className="text-white">{viewing.org}</span></div>
          <div><span className="text-dim">Status:</span> <Tag>{viewing.status}</Tag></div>
          {viewing.url && <div className="col-span-2"><span className="text-dim">URL:</span> <a href={viewing.url} target="_blank" className="text-accent break-all">{viewing.url}</a></div>}
        </div>
        {viewing.data?.cover_letter && (<div><span className="text-dim text-[10px]">Cover Letter</span><pre className="bg-bg p-3 rounded text-xs max-h-[200px] overflow-y-auto mt-1">{viewing.data.cover_letter}</pre></div>)}
        {viewing.data?.resume_version && (<div><span className="text-dim text-[10px]">Resume Version:</span> <span className="text-xs">{viewing.data.resume_version}</span></div>)}
        <pre className="bg-bg p-3 rounded text-[10px] max-h-[200px] overflow-y-auto">{JSON.stringify(viewing.data, null, 2)}</pre>
      </div>)}
    </Modal>
  </div>);
}
