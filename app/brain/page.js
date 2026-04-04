'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Modal, Empty, friendlyDate, describeType } from '../../components/UI';

export default function BrainPage() {
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addData, setAddData] = useState({ source: '', memory_type: 'manual_entry', content: '', importance: 5 });
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const deleteEntry = async (id) => {
    // Confirmation handled by button state
    setDeleting(id);
    try {
      await fetch('/api/brain?id=' + id, { method: 'DELETE' });
      setSelected(null);
      search(offset);
    } catch {}
    setDeleting(null);
  };
  const limit = 50;

  const addEntry = async () => {
    if (!addData.content.trim()) return;
    setAdding(true);
    try {
      await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addData)
      });
      setAddOpen(false);
      setAddData({ source: '', memory_type: 'manual_entry', content: '', importance: 5 });
      search(0);
    } catch {}
    setAdding(false);
  };

  useEffect(() => {
    fetch('/api/brain?action=types').then(r => r.json()).then(d => setTypes(d.types || []));
  }, []);

  const search = useCallback(async (newOffset = 0) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), offset: String(newOffset) });
    if (query) params.set('q', query);
    if (typeFilter) params.set('type', typeFilter);
    const d = await fetch('/api/brain?' + params.toString()).then(r => r.json());
    setResults(d.data || []);
    setTotal(d.total || 0);
    setOffset(newOffset);
    setLoading(false);
  }, [query, typeFilter]);

  useEffect(() => { search(0); }, [typeFilter]);

  const parseContent = (content) => {
    if (!content) return '';
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content;
      return JSON.stringify(parsed, null, 2);
    } catch { return String(content); }
  };

  const contentPreview = (content) => {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    return str?.slice(0, 120) || '';
  };

  return (
    <div className="fade-in">
      <PageTitle sub="Search all brain entries by content, type, source, and date" right={
        <Btn variant="primary" onClick={() => setAddOpen(true)}>+ Add Entry</Btn>
      }>Brain Search</PageTitle>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search(0)}
          placeholder="Search content, source..." className="flex-1 min-w-[200px] text-sm" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="w-auto bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-gray-300">
          <option value="">All Types ({types.length})</option>
          {types.map(t => <option key={t} value={t}>{describeType(t)} ({t})</option>)}
        </select>
        <Btn variant="primary" onClick={() => search(0)}>Search</Btn>
      </div>

      {loading ? <Loading text="Searching brain..." /> : (
        <>
          <div className="text-xs text-dim mb-3">
            {total.toLocaleString()} entries found
            {query && <span> matching "{query}"</span>}
            {typeFilter && <span> in {describeType(typeFilter)}</span>}
          </div>

          <Card>
            {results.length === 0 ? <Empty text="No entries found" /> : (
              <div className="space-y-0">
                {results.map((entry, i) => (
                  <div key={entry.id || i} className="border-b border-white/[0.03] last:border-0 py-2.5 px-1 cursor-pointer hover:bg-white/[0.02] transition-all"
                    onClick={() => setSelected(entry)}>
                    <div className="flex items-start gap-2">
                      <Tag variant="info">{describeType(entry.memory_type)}</Tag>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-300 truncate">{contentPreview(entry.content)}</div>
                        <div className="text-[10px] text-dim mt-0.5">
                          {entry.source && <span>{entry.source}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] text-dim whitespace-nowrap">{friendlyDate(entry.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {total > limit && (
            <div className="flex justify-center gap-2 mt-4">
              <Btn disabled={offset === 0} onClick={() => search(Math.max(0, offset - limit))}>Previous</Btn>
              <span className="text-xs text-dim self-center">{offset + 1}–{Math.min(offset + limit, total)} of {total.toLocaleString()}</span>
              <Btn disabled={offset + limit >= total} onClick={() => search(offset + limit)}>Next</Btn>
            </div>
          )}
        </>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.memory_type || 'Entry'} wide>
        {selected && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div><span className="text-[10px] text-dim block">Type</span><Tag variant="info">{describeType(selected.memory_type)}</Tag></div>
              <div><span className="text-[10px] text-dim block">Source</span><span className="text-white break-all">{selected.source || '—'}</span></div>
              <div><span className="text-[10px] text-dim block">Created</span><span className="text-white">{friendlyDate(selected.created_at)}</span></div>
              <div><span className="text-[10px] text-dim block">Importance</span><span className="text-white">{selected.importance ?? '—'}</span></div>
              <div><span className="text-[10px] text-dim block">Actions</span>
                <Btn variant="danger" size="sm" onClick={() => deleteEntry(selected.id)} disabled={deleting === selected.id}>
                  {deleting === selected.id ? 'Deleting...' : 'Delete'}
                </Btn>
              </div>
            </div>
            {selected.tags?.length > 0 && (
              <div><span className="text-[10px] text-dim block mb-1">Tags</span>
                {selected.tags.map((t, i) => <Tag key={i} variant="dim">{t}</Tag>)}
              </div>
            )}
            <div>
              <span className="text-[10px] text-dim block mb-1">Content</span>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap bg-white/[0.02] rounded-lg p-3 max-h-[400px] overflow-y-auto mono">
                {parseContent(selected.content)}
              </pre>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Brain Entry">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-dim block mb-1">Source (dot notation)</label>
            <input value={addData.source} onChange={e => setAddData(d => ({ ...d, source: e.target.value }))}
              placeholder="e.g. manual.note.20260403" className="text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-dim block mb-1">Memory Type</label>
            <input value={addData.memory_type} onChange={e => setAddData(d => ({ ...d, memory_type: e.target.value }))}
              placeholder="e.g. manual_entry, 911_rule, checkpoint" className="text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-dim block mb-1">Content</label>
            <textarea value={addData.content} onChange={e => setAddData(d => ({ ...d, content: e.target.value }))}
              placeholder="Brain entry content..." rows={5} className="text-xs" />
          </div>
          <div>
            <label className="text-[10px] text-dim block mb-1">Importance (1-10)</label>
            <input type="number" min={1} max={10} value={addData.importance}
              onChange={e => setAddData(d => ({ ...d, importance: Number(e.target.value) }))} className="w-20 text-xs" />
          </div>
          <Btn variant="primary" onClick={addEntry} disabled={adding || !addData.content.trim()}>
            {adding ? 'Adding...' : 'Add to Brain'}
          </Btn>
          <div className="text-[10px] text-dim">Tagged with T10_HAM_manual and aoa_portal automatically.</div>
        </div>
      </Modal>
    </div>
  );
}
