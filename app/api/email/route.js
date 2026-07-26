export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { nylasKey, nylasGrants } from '../../../lib/config';
import { getSupabase } from '../../../lib/supabase';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const grantFilter = searchParams.get('grant') || 'all';
    const mode = searchParams.get('mode') || 'aba_only'; // 'aba_only' or 'all'
    const since = Math.floor(Date.now() / 1000) - (hours * 3600);

    const grantsToQuery = grantFilter === 'all'
      ? Object.entries(nylasGrants())
      : [[grantFilter, nylasGrants()[grantFilter]]];

    const results = [];

    // Load all dedup markers and send logs from brain to identify ABA-initiated emails
    const sb = getSupabase();
    const sinceISO = new Date(since * 1000).toISOString();
    const { data: dedupMarkers } = await sb.from('aba_memory')
      .select('content, source')
      .or('memory_type.eq.email_dedup,memory_type.eq.email_sent,memory_type.eq.email_task_processed')
      .gte('created_at', sinceISO)
      .limit(500);

    // ⬡B:aoa.audit_fix:FIX:H3_email_fingerprint:20260404⬡
    // Build specific fingerprint sets — source keys and message IDs only, NOT full content blobs.
    // Old approach matched subject substrings against entire brain content → massive false positives.
    const abaSourceKeys = new Set();
    const abaMessageIds = new Set();
    for (const m of (dedupMarkers || [])) {
      const s = (m.source || '').toLowerCase();
      abaSourceKeys.add(s);
      // Extract Nylas message IDs from content if present
      try {
        const c = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
        if (c?.message_id) abaMessageIds.add(c.message_id);
        if (c?.nylas_id) abaMessageIds.add(c.nylas_id);
        if (c?.id) abaMessageIds.add(c.id);
      } catch {
        // Content might be a plain string (dedup slug), add as source key
        if (m.content && typeof m.content === 'string' && m.content.length < 200) {
          abaSourceKeys.add(m.content.toLowerCase());
        }
      }
    }

    for (const [name, grant] of grantsToQuery) {
      if (!grant) continue;
      const grantId = typeof grant === 'object' ? grant.id : grant;
      const grantLabel = typeof grant === 'object' ? grant.label : name;
      try {
        const r = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}/messages?in=SENT&received_after=${since}&limit=50`, {
          headers: { 'Authorization': `Bearer ${nylasKey()}`, 'Accept': 'application/json' }
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
            // ⬡B:aoa.audit_fix:FIX:H3b_specific_matching:20260404⬡
            // Match on message ID (specific) or source key slug (specific), NOT content blobs
            abaMessageIds.has(m.id) ||
            [...abaSourceKeys].some(sk => sk.includes(m.id) || (m.thread_id && sk.includes(m.thread_id)));

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
