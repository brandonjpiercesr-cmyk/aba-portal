import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');
    const emailId = searchParams.get('id');

    if (!subject && !emailId) return NextResponse.json({ error: 'subject or id required' }, { status: 400 });

    const searchTerm = subject || emailId;
    const { data, error } = await sb.from('aba_memory')
      .select('*')
      .or(`content.ilike.%${searchTerm}%,source.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;

    // Categorize trace results
    const trace = {
      dedup_markers: data.filter(d => d.memory_type === 'email_dedup'),
      send_logs: data.filter(d => d.memory_type === 'email_sent'),
      task_logs: data.filter(d => d.memory_type === 'email_task_processed'),
      commands: data.filter(d => d.memory_type === 'aba_command_executed'),
      proactive: data.filter(d => d.source?.includes('proactive') || d.source?.includes('think_loop')),
      other: data.filter(d => !['email_dedup','email_sent','email_task_processed','aba_command_executed'].includes(d.memory_type) && !d.source?.includes('proactive')),
    };

    // Build plain language explanation
    let explanation = '';
    if (trace.send_logs.length > 0) explanation += 'This email was sent by IMAN (Intelligent Mail and Notification Agent). ';
    if (trace.task_logs.length > 0) explanation += 'It was triggered by an inbound email that AIR processed as a task. ';
    if (trace.proactive.length > 0) explanation += 'It came from the proactive processor (ThinkLoop/HeartbeatService). ';
    if (trace.commands.length > 0) explanation += 'It was triggered by a voice command through OMI. ';
    if (trace.dedup_markers.length > 0) explanation += `Dedup marker exists (should not fire again). `;
    if (!explanation) explanation = 'Could not determine the trigger source. This may have been sent by a code path that does not log to brain.';

    return NextResponse.json({ trace, explanation, total: data.length, searchTerm });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
