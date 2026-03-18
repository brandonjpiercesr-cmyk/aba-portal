'use client';
import { useState, useEffect } from 'react';
import { Card, PageTitle, Loading, Btn, Tag, Pill } from '../../components/UI';

export default function CodePage() {
  const [repo, setRepo] = useState('abacia-services');
  const [path, setPath] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [commits, setCommits] = useState(null);

  async function browse(newPath) {
    setLoading(true);
    setPath(newPath || '');
    const d = await fetch(`/api/code?repo=${repo}&path=${encodeURIComponent(newPath || '')}`).then(r => r.json());
    setData(d);
    setLoading(false);
    setSearchResults(null);
  }

  async function searchCode() {
    if (!searchQ.trim()) return;
    setSearching(true);
    const d = await fetch(`/api/code?action=search&repo=${repo}&q=${encodeURIComponent(searchQ)}`).then(r => r.json());
    setSearchResults(d);
    setSearching(false);
  }

  async function loadCommits() {
    const d = await fetch(`/api/code?action=commits&repo=${repo}&path=${encodeURIComponent(path)}`).then(r => r.json());
    setCommits(d);
  }

  async function viewFileLine(filePath, line) {
    setLoading(true);
    setPath(filePath);
    const d = await fetch(`/api/code?repo=${repo}&path=${encodeURIComponent(filePath)}&line=${line}`).then(r => r.json());
    setData(d);
    setLoading(false);
    setSearchResults(null);
  }

  useEffect(() => { browse(''); }, [repo]);

  const breadcrumbs = path ? path.split('/') : [];

  return (<div>
    <PageTitle right={<Btn onClick={loadCommits}>Recent Commits</Btn>}>Code Explorer</PageTitle>
    <div className="flex gap-2 mb-4">
      <select className="w-48" value={repo} onChange={e => { setRepo(e.target.value); setPath(''); }}>
        <option value="abacia-services">abacia-services</option>
        <option value="aba-portal">aba-portal</option>
        <option value="myaba">myaba</option>
      </select>
      <input className="flex-1" placeholder="Search code (e.g. sendMARSEmail, ownerPhone, send_email)..." value={searchQ}
        onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchCode()} />
      <Btn variant="primary" size="md" onClick={searchCode} disabled={searching}>{searching ? 'Searching...' : 'Search'}</Btn>
    </div>

    <div className="flex gap-1 mb-3 text-xs">
      <span className="text-accent cursor-pointer hover:underline" onClick={() => browse('')}>{repo}</span>
      {breadcrumbs.map((part, i) => (
        <span key={i}>
          <span className="text-dim mx-1">/</span>
          <span className="text-accent cursor-pointer hover:underline"
            onClick={() => browse(breadcrumbs.slice(0, i + 1).join('/'))}>{part}</span>
        </span>
      ))}
    </div>

    {searchResults && (
      <Card title={`Search: "${searchResults.query}" (${searchResults.total} results)`}>
        {searchResults.results?.map((r, i) => (
          <div key={i} className="border-b border-white/[0.04] py-2 cursor-pointer hover:bg-white/[0.02]" onClick={() => viewFileLine(r.path, 1)}>
            <div className="text-white text-xs font-semibold">{r.path}</div>
            {r.matches?.map((m, j) => (
              <pre key={j} className="text-[10px] text-dim mt-1 max-h-[60px] overflow-hidden">{m.fragment}</pre>
            ))}
          </div>
        ))}
      </Card>
    )}

    {commits && (
      <Card title="Recent Commits" actions={<Btn onClick={() => setCommits(null)}>Close</Btn>}>
        <table><thead><tr><th>SHA</th><th>Message</th><th>Author</th><th>Date</th></tr></thead>
        <tbody>{commits.commits?.map(c => (
          <tr key={c.sha}><td className="mono text-xs text-accent">{c.sha}</td><td className="text-xs">{c.message}</td>
            <td className="text-xs text-dim">{c.author}</td><td className="mono text-[10px] text-dim">{c.date?.slice(0, 16)}</td></tr>
        ))}</tbody></table>
      </Card>
    )}

    {!searchResults && (
      <Card>
        {loading ? <Loading /> : data?.type === 'directory' ? (
          <div>
            {path && (
              <div className="py-1.5 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] px-2"
                onClick={() => browse(breadcrumbs.slice(0, -1).join('/'))}>
                <span className="text-dim text-xs">📁 ..</span>
              </div>
            )}
            {data.items?.map(item => (
              <div key={item.path} className="py-1.5 border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.02] px-2 flex justify-between"
                onClick={() => browse(item.path)}>
                <span className="text-xs">
                  <span className="mr-2">{item.type === 'dir' ? '📁' : '📄'}</span>
                  <span className={item.type === 'dir' ? 'text-accent font-semibold' : 'text-white'}>{item.name}</span>
                </span>
                {item.size > 0 && <span className="text-dim text-[10px]">{(item.size / 1024).toFixed(1)}kb</span>}
              </div>
            ))}
          </div>
        ) : data?.type === 'file' ? (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-dim text-[10px]">{data.totalLines} lines | {(data.size / 1024).toFixed(1)}kb | SHA: {data.sha?.slice(0, 8)}</span>
              {data.lineStart > 1 && <span className="text-dim text-[10px]">Showing lines {data.lineStart}-{data.lineEnd}</span>}
            </div>
            <pre className="text-[11px] leading-5 overflow-x-auto" style={{ maxHeight: '70vh' }}>{
              data.content?.split('\n').map((line, i) => {
                const lineNum = (data.lineStart || 1) + i;
                return <div key={i} className="hover:bg-white/[0.03]" data-aba-ctx={JSON.stringify({type:'code_line',label:`${path}:${lineNum}`,data:{repo,path,line:lineNum}})}>
                  <span className="inline-block w-12 text-right text-dim mr-3 select-none text-[10px]">{lineNum}</span>
                  <span>{line}</span>
                </div>;
              })
            }</pre>
          </div>
        ) : <div className="text-dim">Select a repo to browse</div>}
      </Card>
    )}
  </div>);
}
