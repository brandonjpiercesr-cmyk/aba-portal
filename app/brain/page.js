'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Empty, Btn, Pill, Tag, Modal, shortDate } from '../../components/UI';

export default function BrainPage() {
  const [results, setResults] = useState([]);
  const [types, setTypes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [limit, setLimit] = useState(50);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    fetch('/api/brain?action=types').then(r => r.json()).then(d => setTypes(d.types || []));
  }, []);

  async function search() {
    setLoading(true);
    const params = new URLSearchParams({ limit });
    if (q) params.set('q', q);
    if (type) params.set('type', type);
    const d = await fetch(`/api/brain?${params}`).then(r => r.json());
    setResults(d.data || []);
    setTotal(d.total || 0);
    setLoading(false);
  }

  async function deleteEntry(id) {
    if (!confirm('Delete brain entry #' + id + '?')) return;
    await fetch(`/api/brain?id=${id}`, { method: 'DELETE' });
    search();
  }

  return (
    <div>
      <PageTitle>Brain Memory Search</PageTitle>
      <div className="flex gap-2 mb-4">
        <input className="flex-1" placeholder="Search content or source..." value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()} />
        <select className="w-48" value={type} onChange={e => setType(e.target.value)}>
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input className="w-16" type="number" value={limit} onChange={e => setLimit(e.target.value)} />
        <Btn variant="primary" size="md" onClick={search}>Search</Btn>
      </div>

      <Card>
        {loading ? <Loading /> : results.length === 0 ? <Empty text="Enter a search and press Search" /> : (
          <>
            <div className="text-dim text-xs mb-2">{total} total results</div>
            <table>
              <thead><tr><th>Created</th><th>Type</th><th>Source</th><th>Content</th><th>Imp</th><th></th></tr></thead>
              <tbody>
                {results.map(m => (
                  <tr key={m.id}>
                    <td className="mono whitespace-nowrap">{shortDate(m.created_at)}</td>
                    <td><Pill>{m.memory_type}</Pill></td>
                    <td className="mono max-w-[150px] truncate" title={m.source}>{m.source}</td>
                    <td className="max-w-[350px] cursor-pointer hover:text-white" onClick={() => setViewing(m)}>{(m.content || '').slice(0, 180)}</td>
                    <td>{m.importance || 0}</td>
                    <td><Btn variant="danger" onClick={() => deleteEntry(m.id)}>Del</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>

      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Brain Entry #${viewing?.id}`}>
        {viewing && (
          <div>
            <div className="flex gap-2 mb-2"><Pill>{viewing.memory_type}</Pill><span className="mono text-dim">{viewing.source}</span></div>
            <div className="text-dim text-xs mb-3">{shortDate(viewing.created_at)} | Importance: {viewing.importance || 0}</div>
            <pre className="bg-bg p-3 rounded text-xs max-h-[400px] overflow-y-auto">{viewing.content}</pre>
            {viewing.tags && <div className="mt-2">{viewing.tags.map(t => <Pill key={t}>{t}</Pill>)}</div>}
          </div>
        )}
      </Modal>
    </div>
  );
}
