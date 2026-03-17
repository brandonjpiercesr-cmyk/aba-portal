import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { ABACIA_URL } from '../../../lib/config';

export async function GET() {
  try {
    const sb = getSupabase();
    const alerts = [];
    const now = Date.now();
    const since1h = new Date(now - 3600000).toISOString();
    const since15m = new Date(now - 900000).toISOString();

    // 1. Check ABAbase health
    let ababaseUp = false;
    try {
      const r = await fetch(`${ABACIA_URL}/api/omi/manifest`, { signal: AbortSignal.timeout(6000) });
      ababaseUp = r.ok;
    } catch {}
    if (!ababaseUp) alerts.push({ level: 'critical', msg: 'ABAbase is DOWN (abacia-services not responding)', source: 'health_check' });

    // 2. Check for LAEB error emails in last hour
    const { data: errorEmails } = await sb.from('aba_memory')
      .select('id').ilike('content', '%ABA Error%').gte('created_at', since1h);
    if ((errorEmails || []).length > 0) alerts.push({ level: 'error', msg: `${errorEmails.length} ABA Error email(s) sent in last hour (LAEB false positives?)`, source: 'email_errors' });

    // 3. Check for stale proactive alerts (MATERIALS_READY sent after APPLIED)
    const { data: staleAlerts } = await sb.from('aba_memory')
      .select('id').ilike('content', '%materials are ready%').gte('created_at', since1h)
      .eq('memory_type', 'email_sent');
    if ((staleAlerts || []).length > 0) alerts.push({ level: 'warn', msg: `${staleAlerts.length} "materials ready" email(s) in last hour (may be stale)`, source: 'proactive_stale' });

    // 4. Check for emails sent to Eric proactively
    const { data: ericEmails } = await sb.from('aba_memory')
      .select('id, content').ilike('content', '%eric@globalmajoritygroup.com%')
      .gte('created_at', since1h).eq('memory_type', 'email_dedup');
    if ((ericEmails || []).length > 0) alerts.push({ level: 'error', msg: `${ericEmails.length} automated email(s) sent to Eric in last hour (PRE-ALPHA: Brandon only!)`, source: 'eric_emails' });

    // 5. Check brain write rate (if > 500/15min, something might be looping)
    const { count: recentWrites } = await sb.from('aba_memory')
      .select('id', { count: 'exact', head: true }).gte('created_at', since15m);
    if (recentWrites > 500) alerts.push({ level: 'warn', msg: `${recentWrites} brain writes in 15 min (possible loop)`, source: 'write_rate' });

    // 6. Check for ownerUserId errors (LAEB bug indicator)
    const { data: ownerErrors } = await sb.from('aba_memory')
      .select('id').ilike('content', '%ownerUserId is not defined%').gte('created_at', since1h);
    if ((ownerErrors || []).length > 0) alerts.push({ level: 'critical', msg: `LAEB scope bug still firing! ${ownerErrors.length} ownerUserId errors in last hour`, source: 'laeb_bug' });

    const status = alerts.some(a => a.level === 'critical') ? 'critical' :
                   alerts.some(a => a.level === 'error') ? 'error' :
                   alerts.length > 0 ? 'warn' : 'healthy';

    return NextResponse.json({ status, alerts, count: alerts.length, checkedAt: new Date().toISOString() });
  } catch (err) { return NextResponse.json({ error: err.message, status: 'error', alerts: [{ level: 'critical', msg: 'Monitor check failed: ' + err.message }] }, { status: 500 }); }
}
