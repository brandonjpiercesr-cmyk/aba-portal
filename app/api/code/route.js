import { NextResponse } from 'next/server';

const GH_TOKEN = process.env.GITHUB_TOKEN;
const REPOS = {
  'abacia-services': 'brandonjpiercesr-cmyk/abacia-services',
  'aba-portal': 'brandonjpiercesr-cmyk/aba-portal',
  'myaba': 'brandonjpiercesr-cmyk/myaba',
};

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'tree';
    const repo = searchParams.get('repo') || 'abacia-services';
    const path = searchParams.get('path') || '';
    const query = searchParams.get('q') || '';
    const line = parseInt(searchParams.get('line') || '0');

    const repoPath = REPOS[repo];
    if (!repoPath) return NextResponse.json({ error: 'Unknown repo. Options: ' + Object.keys(REPOS).join(', ') }, { status: 400 });

    const headers = { 'Authorization': `token ${GH_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' };

    // List directory / file tree
    if (action === 'tree') {
      const r = await fetch(`https://api.github.com/repos/${repoPath}/contents/${path}`, { headers });
      const data = await r.json();
      if (Array.isArray(data)) {
        // Directory listing
        const items = data.map(f => ({
          name: f.name, path: f.path, type: f.type, size: f.size,
        })).sort((a, b) => {
          if (a.type === 'dir' && b.type !== 'dir') return -1;
          if (a.type !== 'dir' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });
        return NextResponse.json({ repo, path, items, type: 'directory' });
      } else if (data.content) {
        // File content
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        const lines = content.split('\n');
        const lineStart = line > 0 ? Math.max(0, line - 10) : 0;
        const lineEnd = line > 0 ? Math.min(lines.length, line + 30) : lines.length;
        return NextResponse.json({
          repo, path: data.path, type: 'file', size: data.size,
          totalLines: lines.length,
          content: line > 0 ? lines.slice(lineStart, lineEnd).join('\n') : content,
          lineStart: lineStart + 1,
          lineEnd,
          sha: data.sha,
        });
      }
      return NextResponse.json(data);
    }

    // Search code in repo
    if (action === 'search' && query) {
      const r = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}+repo:${repoPath}`, { headers });
      const data = await r.json();
      const results = (data.items || []).map(item => ({
        path: item.path, name: item.name,
        url: item.html_url,
        matches: (item.text_matches || []).map(m => ({
          fragment: m.fragment, matches: m.matches,
        })),
      }));
      return NextResponse.json({ repo, query, results, total: data.total_count || 0 });
    }

    // Recent commits
    if (action === 'commits') {
      const r = await fetch(`https://api.github.com/repos/${repoPath}/commits?per_page=15&path=${path}`, { headers });
      const data = await r.json();
      const commits = (data || []).map(c => ({
        sha: c.sha?.slice(0, 10), message: c.commit?.message?.split('\n')[0]?.slice(0, 80),
        author: c.commit?.author?.name, date: c.commit?.author?.date,
      }));
      return NextResponse.json({ repo, path, commits });
    }

    return NextResponse.json({ error: 'action must be tree, search, or commits' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
