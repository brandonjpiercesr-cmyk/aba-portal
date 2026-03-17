import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject') || '';
    const emailId = searchParams.get('id') || '';
    const threadId = searchParams.get('thread') || '';

    if (!subject && !emailId) return NextResponse.json({ error: 'subject or id required' }, { status: 400 });

    // Build multiple search terms for maximum trace coverage
    const searchTerms = [];
    if (emailId) searchTerms.push(emailId);
    if (threadId) searchTerms.push(threadId);
    // Also search by subject keywords (first 40 chars, cleaned)
    if (subject) {
      const cleanSubject = subject.replace(/^(Re:\s*|Fwd:\s*|\[ABA\]\s*)/gi, '').trim().slice(0, 40);
      if (cleanSubject.length > 5) searchTerms.push(cleanSubject);
    }

    // Run parallel searches for each term
    const allResults = [];
    const seenIds = new Set();

    for (const term of searchTerms) {
      const { data } = await sb.from('aba_memory')
        .select('*')
        .or(`content.ilike.%${term}%,source.ilike.%${term}%`)
        .order('created_at', { ascending: false })
        .limit(15);

      for (const row of (data || [])) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          allResults.push(row);
        }
      }
    }

    // Also check by dedup source pattern (email_sent_recipient_subject)
    if (subject) {
      const dedupSearch = subject.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50);
      const { data: dedupData } = await sb.from('aba_memory')
        .select('*')
        .ilike('source', `%${dedupSearch}%`)
        .limit(10);
      for (const row of (dedupData || [])) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          allResults.push(row);
        }
      }
    }

    // Categorize
    const trace = {
      dedup_markers: allResults.filter(d => d.memory_type === 'email_dedup'),
      send_logs: allResults.filter(d => d.memory_type === 'email_sent'),
      task_logs: allResults.filter(d => d.memory_type === 'email_task_processed'),
      commands: allResults.filter(d => d.memory_type === 'aba_command_executed'),
      proactive: allResults.filter(d => d.source?.includes('proactive') || d.source?.includes('think_loop') || d.source?.includes('heartbeat')),
      air_traces: allResults.filter(d => d.source?.includes('air_trace')),
      other: allResults.filter(d =>
        !['email_dedup','email_sent','email_task_processed','aba_command_executed'].includes(d.memory_type) &&
        !d.source?.includes('proactive') && !d.source?.includes('think_loop') &&
        !d.source?.includes('heartbeat') && !d.source?.includes('air_trace')
      ),
    };

    // Build plain language explanation
    let explanation = '';
    if (trace.send_logs.length > 0) explanation += 'IMAN (Intelligent Mail and Notification Agent) sent this email. ';
    if (trace.task_logs.length > 0) explanation += 'It was triggered by an inbound email that AIR processed as a task. ';
    if (trace.proactive.length > 0) explanation += 'The proactive processor (HeartbeatService/ThinkLoop) initiated this. ';
    if (trace.commands.length > 0) explanation += 'A voice command through OMI triggered this. ';
    if (trace.air_traces.length > 0) explanation += 'AIR execution trace found. ';
    if (trace.dedup_markers.length > 0) explanation += `Dedup marker exists (should not fire again). `;

    if (!explanation) {
      if (allResults.length === 0) {
        explanation = 'No trace records found in brain. This was likely sent by a human manually, or by a code path that does not log to brain.';
      } else {
        explanation = `Found ${allResults.length} related records but could not pinpoint the exact trigger. See records below.`;
      }
    }

    return NextResponse.json({
      trace,
      explanation,
      total: allResults.length,
      searchTerms,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
