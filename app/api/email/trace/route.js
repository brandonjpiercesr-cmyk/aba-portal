import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject') || '';
    const emailId = searchParams.get('id') || '';
    const threadId = searchParams.get('thread') || '';
    const toEmail = searchParams.get('to') || '';
    const dateStr = searchParams.get('date') || '';

    if (!subject && !emailId) return NextResponse.json({ error: 'subject or id required' }, { status: 400 });

    const allResults = [];
    const seenIds = new Set();

    async function search(field, term, limit = 10) {
      if (!term || term.length < 3) return;
      try {
        const { data } = await sb.from('aba_memory').select('*')
          .ilike(field, `%${term}%`).order('created_at', { ascending: false }).limit(limit);
        for (const row of (data || [])) {
          if (!seenIds.has(row.id)) { seenIds.add(row.id); allResults.push(row); }
        }
      } catch {}
    }

    async function searchMulti(terms) {
      for (const [field, term] of terms) await search(field, term);
    }

    // STRATEGY 1: Time window search (most reliable)
    // If we know when the email was sent, find all email activity within +/- 5 minutes
    if (dateStr) {
      const emailTime = new Date(dateStr).getTime();
      const windowStart = new Date(emailTime - 300000).toISOString(); // 5 min before
      const windowEnd = new Date(emailTime + 300000).toISOString();   // 5 min after
      try {
        const { data } = await sb.from('aba_memory').select('*')
          .or('memory_type.eq.email_dedup,memory_type.eq.email_sent,memory_type.eq.mars_pipeline_result,source.ilike.%iman%,source.ilike.%mars%,source.ilike.%cook%')
          .gte('created_at', windowStart).lte('created_at', windowEnd)
          .order('created_at', { ascending: false }).limit(20);
        for (const row of (data || [])) {
          if (!seenIds.has(row.id)) { seenIds.add(row.id); allResults.push(row); }
        }
      } catch {}
    }

    // STRATEGY 2: Dedup slug match
    if (subject) {
      const slug = subject.toLowerCase().replace(/^(re:\s*|fwd:\s*|\[aba\]\s*|⬡\s*|mars:\s*)/gi, '')
        .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
      await search('source', slug);
      if (toEmail) {
        const recipSlug = `email_sent_${toEmail.toLowerCase().split('@')[0]}`;
        await search('source', recipSlug);
      }
    }

    // STRATEGY 3: Search IMAN send logs and MARS pipeline results
    await searchMulti([
      ['source', 'iman_send'],
      ['source', 'iman_email'],
      ['source', 'mars.report'],
      ['source', 'mars.pipeline'],
    ]);
    // Filter to only recent if too many generic hits
    if (allResults.length > 30) {
      // Keep only results that mention the recipient or subject keywords
      const subjectWords = subject.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 4);
      const keepSet = new Set();
      for (const r of allResults) {
        const txt = ((r.content || '') + ' ' + (r.source || '')).toLowerCase();
        if (toEmail && txt.includes(toEmail.toLowerCase())) { keepSet.add(r.id); continue; }
        if (subjectWords.some(w => txt.includes(w))) { keepSet.add(r.id); continue; }
      }
      // Only filter if we'd keep at least some
      if (keepSet.size > 0) {
        const before = allResults.length;
        allResults.splice(0, allResults.length, ...allResults.filter(r => keepSet.has(r.id)));
      }
    }

    // STRATEGY 4: Nylas message/thread ID
    if (emailId) await search('content', emailId);
    if (threadId) await search('content', threadId);

    // STRATEGY 5: Recipient email in content
    if (toEmail) await search('content', toEmail, 15);

    // STRATEGY 6: Subject keywords
    if (subject) {
      const clean = subject.replace(/^(Re:\s*|Fwd:\s*|\[ABA\]\s*|⬡\s*|MARS:\s*)/gi, '').trim();
      const words = clean.split(/\s+/).filter(w => w.length > 5).slice(0, 3);
      for (const word of words) await search('content', word, 5);
    }

    // STRATEGY 7: Check air_trace entries around the same time
    if (dateStr) {
      const emailTime = new Date(dateStr).getTime();
      const windowStart = new Date(emailTime - 600000).toISOString(); // 10 min before
      const windowEnd = new Date(emailTime + 60000).toISOString();
      try {
        const { data } = await sb.from('aba_memory').select('*')
          .ilike('source', '%air_trace%')
          .gte('created_at', windowStart).lte('created_at', windowEnd)
          .order('created_at', { ascending: false }).limit(5);
        for (const row of (data || [])) {
          if (!seenIds.has(row.id)) { seenIds.add(row.id); allResults.push(row); }
        }
      } catch {}
    }

    // Categorize
    const trace = {
      dedup_markers: allResults.filter(d => d.memory_type === 'email_dedup' || (d.source || '').startsWith('email_sent_')),
      send_logs: allResults.filter(d => d.memory_type === 'email_sent' || (d.source || '').startsWith('iman_send') || (d.source || '').startsWith('iman_email')),
      mars_pipeline: allResults.filter(d => (d.source || '').includes('mars') && (d.memory_type === 'mars_pipeline_result' || d.memory_type === 'mars_report')),
      task_logs: allResults.filter(d => d.memory_type === 'email_task_processed'),
      commands: allResults.filter(d => d.memory_type === 'aba_command_executed'),
      proactive: allResults.filter(d => ['proactive', 'think_loop', 'heartbeat', 'dawn', 'ceecee'].some(k => (d.source || '').includes(k))),
      air_traces: allResults.filter(d => (d.source || '').startsWith('air_trace')),
      cook: allResults.filter(d => (d.source || '').includes('cook') || d.memory_type === 'cook_task' || d.memory_type === 'cook_deliverable'),
    };

    // Build plain language explanation
    let explanation = '';

    if (trace.mars_pipeline.length > 0) {
      explanation += 'This is a MARS (Meeting After Report System) email. ABA processed a meeting transcript, generated the summary, and emailed it automatically. ';
      const mp = trace.mars_pipeline[0];
      try {
        const parsed = JSON.parse(mp.content);
        if (parsed.type) explanation += `Meeting type: ${parsed.type}. `;
        if (parsed.significance) explanation += `Significance: ${parsed.significance}. `;
      } catch {}
    }
    if (trace.dedup_markers.length > 0) {
      const marker = trace.dedup_markers[0];
      explanation += 'ABA has a dedup marker (confirms ABA sent this). ';
      if ((marker.source || '').includes('eric@')) explanation += 'NOTE: This was sent to Eric (should not happen in PRE-ALPHA). ';
    }
    if (trace.send_logs.length > 0) explanation += `IMAN sent this (${trace.send_logs.length} send log(s) found). `;
    if (trace.task_logs.length > 0) explanation += 'Triggered by an inbound email AIR processed as a task. ';
    if (trace.proactive.length > 0) explanation += 'The proactive cron (HeartbeatService/DAWN) initiated this. ';
    if (trace.commands.length > 0) explanation += 'A voice command through OMI triggered this. ';
    if (trace.cook.length > 0) explanation += `COOK agent work related (${trace.cook.length} entries). `;
    if (trace.air_traces.length > 0) {
      const channels = trace.air_traces.map(t => {
        try { return JSON.parse(t.content).channel; } catch { return null; }
      }).filter(Boolean);
      if (channels.length > 0) explanation += `AIR channels involved: ${[...new Set(channels)].join(', ')}. `;
    }

    if (!explanation) {
      explanation = allResults.length === 0
        ? 'No trace records found. This was likely sent by a human manually, not by ABA.'
        : `Found ${allResults.length} related records but could not pinpoint the exact trigger. Check the records below.`;
    }

    return NextResponse.json({ trace, explanation, total: allResults.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
