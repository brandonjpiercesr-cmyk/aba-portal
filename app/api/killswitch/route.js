import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

const SWITCHES = {
  mars_email: { label: 'MARS Report Emails', source: 'system_override.mars_email', description: 'Meeting After Report System emails to Brandon' },
  proactive_email: { label: 'Proactive/DAWN Emails', source: 'system_override.proactive_email', description: 'Scheduled proactive updates and AWA alerts' },
  taste_transcript: { label: 'TASTE Transcript Emails', source: 'system_override.taste_transcript', description: 'Raw transcript emails (SHOULD STAY KILLED)' },
  cook_scaffold: { label: 'COOK Scaffold Emails', source: 'system_override.cook_scaffold', description: 'Internal agent-to-agent delivery emails' },
  idealist_batch: { label: 'Idealist Job Scanner', source: 'system_override.idealist_batch', description: 'Automated Idealist email scanning ($2-4 per run)' },
  omi_mars_trigger: { label: 'OMI → MARS Pipeline', source: 'system_override.omi_mars_trigger', description: 'OMI pendant triggering MARS reports on meeting end' },
  heartbeat_cron: { label: 'Full Heartbeat Cron', source: 'system_override.heartbeat_cron', description: 'All scheduled background tasks' },
  awa_proactive: { label: 'AWA Proactive Alerts', source: 'system_override.awa_proactive', description: 'Materials ready / interview upcoming alerts' },
};

export async function GET() {
  try {
    const sb = getSupabase();
    const { data } = await sb.from('aba_memory')
      .select('source, content, created_at')
      .eq('memory_type', 'system_override')
      .order('created_at', { ascending: false });

    const overrides = {};
    for (const row of (data || [])) {
      try {
        const parsed = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        overrides[row.source] = { ...parsed, created_at: row.created_at };
      } catch {}
    }

    const switches = Object.entries(SWITCHES).map(([id, sw]) => ({
      id, ...sw,
      status: overrides[sw.source]?.disabled ? 'KILLED' : 'ACTIVE',
      killedAt: overrides[sw.source]?.disabled_at || null,
      killedBy: overrides[sw.source]?.disabled_by || null,
      reason: overrides[sw.source]?.reason || null,
    }));

    return NextResponse.json({ switches });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function POST(req) {
  try {
    const sb = getSupabase();
    const { id, action, reason } = await req.json();
    const sw = SWITCHES[id];
    if (!sw) return NextResponse.json({ error: 'Unknown switch: ' + id }, { status: 400 });

    if (action === 'kill') {
      await sb.from('aba_memory').upsert({
        source: sw.source,
        memory_type: 'system_override',
        content: JSON.stringify({
          switch: id, disabled: true,
          disabled_at: new Date().toISOString(),
          disabled_by: 'brandon_T10_via_AOA',
          reason: reason || 'Killed via AOA Portal kill switch',
        }),
        importance: 10,
        tags: ['system_override', 'kill_switch', id],
      }, { onConflict: 'source' });
      return NextResponse.json({ success: true, action: 'killed', switch: id });
    }

    if (action === 'enable') {
      await sb.from('aba_memory').upsert({
        source: sw.source,
        memory_type: 'system_override',
        content: JSON.stringify({
          switch: id, disabled: false,
          enabled_at: new Date().toISOString(),
          enabled_by: 'brandon_T10_via_AOA',
          reason: reason || 'Re-enabled via AOA Portal',
        }),
        importance: 10,
        tags: ['system_override', 'kill_switch', id],
      }, { onConflict: 'source' });
      return NextResponse.json({ success: true, action: 'enabled', switch: id });
    }

    return NextResponse.json({ error: 'action must be kill or enable' }, { status: 400 });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
