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

    if (!subject && !emailId) return NextResponse.json({ error: 'subject or id required' }, { status: 400 });

    const allResults = [];
    const seenIds = new Set();

    async function search(field, term) {
      if (!term || term.length < 3) return;
      try {
        const { data } = await sb.from('aba_memory')
          .select('*')
          .ilike(field, `%${term}%`)
          .order('created_at', { ascending: false })
          .limit(10);
        for (const row of (data || [])) {
          if (!seenIds.has(row.id)) { seenIds.add(row.id); allResults.push(row); }
        }
      } catch {}
    }

    // STRATEGY 1: Build the dedup source slug (how IMAN actually logs emails)
    // Format: email_sent_RECIPIENT_SUBJECT_SLUG
    if (subject) {
      const slug = subject.toLowerCase()
        .replace(/^(re:\s*|fwd:\s*|\[aba\]\s*|⬡\s*)/gi, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 60);
      
      // Search source field for the slug
      await search('source', slug);
      
      // Also try with recipient in the source
      if (toEmail) {
        const recipientSlug = `email_sent_${toEmail.split('@')[0]}`;
        await search('source', recipientSlug);
      }
    }

    // STRATEGY 2: Search by Nylas message ID
    if (emailId) await search('content', emailId);

    // STRATEGY 3: Search by thread ID
    if (threadId) await search('content', threadId);

    // STRATEGY 4: Search content for recipient email
    if (toEmail) await search('content', toEmail);

    // STRATEGY 5: Search content for subject text (cleaned)
    if (subject) {
      const clean = subject.replace(/^(Re:\s*|Fwd:\s*|\[ABA\]\s*|⬡\s*)/gi, '').trim();
      if (clean.length > 8) await search('content', clean.slice(0, 50));
    }

    // STRATEGY 6: Search IMAN send logs by timestamp window
    // (iman_send_ logs contain recipient and subject in content)
    if (subject) {
      const subjectWords = subject.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => w.length > 4).slice(0, 3);
      for (const word of subjectWords) {
        await search('content', word);
      }
    }

    // Categorize
    const trace = {
      dedup_markers: allResults.filter(d => d.memory_type === 'email_dedup' || d.source?.startsWith('email_sent_')),
      send_logs: allResults.filter(d => d.memory_type === 'email_sent' || d.source?.startsWith('iman_send_') || d.source?.startsWith('iman_email_')),
      task_logs: allResults.filter(d => d.memory_type === 'email_task_processed'),
      commands: allResults.filter(d => d.memory_type === 'aba_command_executed'),
      proactive: allResults.filter(d => d.source?.includes('proactive') || d.source?.includes('think_loop') || d.source?.includes('heartbeat') || d.source?.includes('dawn') || d.source?.includes('ceecee')),
      air_traces: allResults.filter(d => d.source?.startsWith('air_trace')),
    };

    // Plain language
    let explanation = '';
    if (trace.dedup_markers.length > 0) {
      const marker = trace.dedup_markers[0];
      const src = marker.source || '';
      if (src.includes('eric@')) explanation += 'This was sent TO Eric. ';
      if (src.includes('brandon')) explanation += 'This was sent TO Brandon. ';
      explanation += 'ABA has a dedup marker for this email (it was ABA-initiated). ';
    }
    if (trace.send_logs.length > 0) explanation += 'IMAN (Intelligent Mail and Notification Agent) sent this. ';
    if (trace.task_logs.length > 0) explanation += 'Triggered by an inbound email AIR processed as a task. ';
    if (trace.proactive.length > 0) explanation += 'The proactive cron (HeartbeatService/DAWN) initiated this. ';
    if (trace.commands.length > 0) explanation += 'A voice command through OMI triggered this. ';
    if (trace.air_traces.length > 0) {
      const traceContent = trace.air_traces[0].content || '';
      if (traceContent.includes('proactive')) explanation += 'AIR trace shows this came from the proactive loop. ';
      else if (traceContent.includes('omi')) explanation += 'AIR trace shows this came from an OMI command. ';
      else explanation += 'AIR execution trace found. ';
    }

    if (!explanation) {
      explanation = allResults.length === 0
        ? 'No trace records found. This was sent by a human manually, not by ABA.'
        : `Found ${allResults.length} related records but could not pinpoint the exact trigger. Check records below.`;
    }

    return NextResponse.json({ trace, explanation, total: allResults.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
