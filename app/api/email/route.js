import { NextResponse } from 'next/server';
import { NYLAS_KEY, NYLAS_GRANTS } from '../../../lib/config';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const grant = searchParams.get('grant') || 'all';
    const since = Math.floor(Date.now() / 1000) - (hours * 3600);
    const grants = grant === 'all' ? Object.entries(NYLAS_GRANTS) : [[grant, NYLAS_GRANTS[grant]]];
    const results = [];

    for (const [name, grantId] of grants) {
      if (!grantId) continue;
      try {
        const r = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages?in=SENT&received_after=${since}&limit=50`, {
          headers: { 'Authorization': `Bearer ${NYLAS_KEY}`, 'Accept': 'application/json' }
        });
        const json = await r.json();
        for (const m of (json.data || [])) {
          results.push({
            grant: name, id: m.id, thread_id: m.thread_id,
            date: new Date(m.date * 1000).toISOString(),
            from: m.from?.[0]?.email || '?', from_name: m.from?.[0]?.name || '?',
            to: (m.to || []).map(t => t.email), cc: (m.cc || []).map(t => t.email),
            subject: m.subject || '(no subject)', snippet: (m.snippet || '').slice(0, 200)
          });
        }
      } catch (e) { results.push({ grant: name, error: e.message }); }
    }
    results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return NextResponse.json({ emails: results, count: results.length, hours });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
