import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
import { ABACIA_URL } from '../../../lib/config';

export async function GET() {
  try {
    const sb = getSupabase();
    const since24h = new Date(Date.now() - 86400000).toISOString();
    const since1h = new Date(Date.now() - 3600000).toISOString();

    const [brainTotal, brain24h, brain1h, errors24h, emails24h, agents, tasteBatches, trainingNotes, omiTranscripts] = await Promise.all([
      sb.from('aba_memory').select('id', { count: 'exact', head: true }),
      sb.from('aba_memory').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
      sb.from('aba_memory').select('id', { count: 'exact', head: true }).gte('created_at', since1h),
      sb.from('aba_memory').select('id', { count: 'exact', head: true }).or('memory_type.ilike.%error%,source.ilike.%error%').gte('created_at', since24h),
      sb.from('aba_memory').select('id', { count: 'exact', head: true }).eq('memory_type', 'email_dedup').gte('created_at', since24h),
      sb.from('aba_agent_jds').select('id', { count: 'exact', head: true }),
      sb.from('aba_memory').select('id', { count: 'exact', head: true }).eq('memory_type', 'taste_batch_summary').gte('created_at', since24h),
      sb.from('aba_memory').select('id', { count: 'exact', head: true }).eq('memory_type', 'ccwa_training_note'),
      sb.from('aba_memory').select('id', { count: 'exact', head: true }).eq('memory_type', 'omi_transcript').gte('created_at', since24h),
    ]);

    let ababaseHealth = 'unknown';
    try {
      const r = await fetch(`${ABACIA_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
      ababaseHealth = r.ok ? 'up' : 'down';
    } catch { ababaseHealth = 'down'; }

    return NextResponse.json({
      brain: { total: brainTotal.count, last24h: brain24h.count, lastHour: brain1h.count },
      errors: { last24h: errors24h.count },
      emails: { last24h: emails24h.count },
      agents: { total: agents.count },
      taste: { batchesLast24h: tasteBatches.count },
      training: { totalNotes: trainingNotes.count },
      omi: { transcriptsLast24h: omiTranscripts.count },
      ababase: { status: ababaseHealth },
      ts: new Date().toISOString()
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
