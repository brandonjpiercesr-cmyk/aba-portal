import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { NYLAS_KEY, NYLAS_GRANTS } from '../../../lib/config';

export async function GET() {
  try {
    const sb = getSupabase();
    // Load pending approvals from brain
    const { data, error } = await sb.from('aba_memory')
      .select('*')
      .eq('memory_type', 'approval_queue')
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;

    // Also load AWA jobs with MATERIALS_READY status (ready to apply)
    const { data: readyJobs } = await sb.from('aba_memory')
      .select('id, content, created_at')
      .eq('memory_type', 'awa_job')
      .order('created_at', { ascending: false })
      .limit(200);

    const pendingApps = (readyJobs || []).filter(j => {
      try {
        const c = typeof j.content === 'string' ? JSON.parse(j.content) : j.content;
        return c.status === 'MATERIALS_READY' && (c.assignees || []).includes('brandon');
      } catch { return false; }
    }).map(j => {
      const c = typeof j.content === 'string' ? JSON.parse(j.content) : j.content;
      return { id: j.id, type: 'job_application', title: c.job_title, org: c.organization, url: c.url, status: c.status, created_at: j.created_at, data: c };
    });

    return NextResponse.json({
      queue: data || [],
      readyToApply: pendingApps,
      totalPending: (data || []).length + pendingApps.length
    });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function POST(req) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { action, id, type } = body;

    if (action === 'approve_application') {
      // Mark job as APPLIED
      const { data: jobRow } = await sb.from('aba_memory').select('content').eq('id', id).single();
      if (!jobRow) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      const job = typeof jobRow.content === 'string' ? JSON.parse(jobRow.content) : jobRow.content;
      job.status = 'APPLIED';
      job.applied_at = new Date().toISOString();
      job.approved_via = 'aoa_portal';
      await sb.from('aba_memory').update({ content: JSON.stringify(job) }).eq('id', id);

      // Log the application
      await sb.from('aba_memory').insert({
        source: `aoa_approval_${Date.now()}`,
        memory_type: 'awa_application_sent',
        content: JSON.stringify({ job_title: job.job_title, organization: job.organization, approved_via: 'aoa_portal', approved_at: new Date().toISOString() }),
        importance: 7, tags: ['awa', 'approved', 'aoa_portal', 'T10_HAM_manual']
      });

      return NextResponse.json({ success: true, action: 'approved', job: job.job_title });
    }

    if (action === 'dismiss') {
      await sb.from('aba_memory').update({
        content: JSON.stringify({ ...(typeof body.data === 'string' ? JSON.parse(body.data) : (body.data || {})), status: 'DISMISSED', dismissed_at: new Date().toISOString(), dismissed_via: 'aoa_portal' })
      }).eq('id', id);
      return NextResponse.json({ success: true, action: 'dismissed' });
    }

    if (action === 'dismiss_approval') {
      await sb.from('aba_memory').delete().eq('id', id);
      return NextResponse.json({ success: true, action: 'dismissed_approval' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
