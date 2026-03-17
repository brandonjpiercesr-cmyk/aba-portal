import { NextResponse } from 'next/server';
import { NYLAS_KEY, NYLAS_GRANTS } from '../../../lib/config';
import { getSupabase } from '../../../lib/supabase';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const grantFilter = searchParams.get('grant') || 'all';
    const mode = searchParams.get('mode') || 'aba_only'; // 'aba_only' or 'all'
    const since = Math.floor(Date.now() / 1000) - (hours * 3600);

    const grantsToQuery = grantFilter === 'all'
      ? Object.entries(NYLAS_GRANTS)
      : [[grantFilter, NYLAS_GRANTS[grantFilter]]];

    const results = [];

    // Load all dedup markers and send logs from brain to identify ABA-initiated emails
    const sb = getSupabase();
    const sinceISO = new Date(since * 1000).toISOString();
    const { data: dedupMarkers } = await sb.from('aba_memory')
      .select('content, source')
      .or('memory_type.eq.email_dedup,memory_type.eq.email_sent,memory_type.eq.email_task_processed')
      .gte('created_at', sinceISO)
      .limit(500);

    // Build a set of subjects/recipients that ABA sent
    const abaFingerprints = new Set();
    for (const m of (dedupMarkers || [])) {
      const c = (m.content || '').toLowerCase();
      const s = (m.source || '').toLowerCase();
      // Extract key phrases from dedup markers
      abaFingerprints.add(s);
      abaFingerprints.add(c);
    }

    for (const [name, grant] of grantsToQuery) {
      if (!grant) continue;
      const grantId = typeof grant === 'object' ? grant.id : grant;
      const grantLabel = typeof grant === 'object' ? grant.label : name;
      try {
        const r = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages?in=SENT&received_after=${since}&limit=50`, {
          headers: { 'Authorization': `Bearer ${NYLAS_KEY}`, 'Accept': 'application/json' }
        });
        const json = await r.json();
        for (const m of (json.data || [])) {
          // Determine if ABA-initiated by checking brain records
          const subject = (m.subject || '').toLowerCase();
          const fromName = (m.from?.[0]?.name || '').toLowerCase();
          const isAbaInitiated =
            fromName.includes('claudette') ||
            fromName.includes('aba') ||
            subject.includes('[aba]') ||
            subject.includes('⬡ aba') ||
            subject.includes('aba update') ||
            subject.includes('aba error') ||
            subject.includes('draft for review') ||
            subject.includes('approvals waiting') ||
            subject.includes('pipeline update') ||
            [...abaFingerprints].some(fp => fp.includes(subject.slice(0, 40)) || fp.includes(m.id));

          results.push({
            grant: name, grantLabel,
            id: m.id, thread_id: m.thread_id,
            date: new Date(m.date * 1000).toISOString(),
            from: m.from?.[0]?.email || '?', from_name: m.from?.[0]?.name || '?',
            to: (m.to || []).map(t => t.email), cc: (m.cc || []).map(t => t.email),
            subject: m.subject || '(no subject)', snippet: (m.snippet || '').slice(0, 200),
            abaInitiated: isAbaInitiated,
          });
        }
      } catch (e) { results.push({ grant: name, grantLabel, error: e.message }); }
    }
    results.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Filter if mode is aba_only
    const filtered = mode === 'aba_only' ? results.filter(e => e.abaInitiated) : results;

    return NextResponse.json({ emails: filtered, count: filtered.length, totalIncludingHuman: results.length, hours, mode });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
