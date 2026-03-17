import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const sb = getSupabase();
    const since24h = new Date(Date.now() - 86400000).toISOString();
    const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

    // Count AIR executions (each one is an Anthropic API call)
    const { count: airCalls24h } = await sb.from('aba_memory')
      .select('id', { count: 'exact', head: true })
      .or('memory_type.eq.aba_command_executed,source.ilike.%air_trace%')
      .gte('created_at', since24h);

    // Count proactive cron runs
    const { count: cronRuns24h } = await sb.from('aba_memory')
      .select('id', { count: 'exact', head: true })
      .eq('memory_type', 'think_cycle')
      .gte('created_at', since24h);

    // Count emails sent (Nylas usage)
    const { count: emailsSent24h } = await sb.from('aba_memory')
      .select('id', { count: 'exact', head: true })
      .eq('memory_type', 'email_dedup')
      .gte('created_at', since24h);

    // Count VARA calls
    const { count: varaCalls24h } = await sb.from('aba_memory')
      .select('id', { count: 'exact', head: true })
      .ilike('source', '%vara%call%')
      .gte('created_at', since24h);

    // Count brain writes (Supabase usage)
    const { count: brainWrites24h } = await sb.from('aba_memory')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h);

    // 7 day counts
    const { count: airCalls7d } = await sb.from('aba_memory')
      .select('id', { count: 'exact', head: true })
      .or('memory_type.eq.aba_command_executed,source.ilike.%air_trace%')
      .gte('created_at', since7d);

    // Estimate costs
    const estimates = {
      anthropic: {
        daily_calls: airCalls24h || 0,
        weekly_calls: airCalls7d || 0,
        est_daily_cost: `$${((airCalls24h || 0) * 0.015).toFixed(2)}`,
        est_weekly_cost: `$${((airCalls7d || 0) * 0.015).toFixed(2)}`,
        note: 'Estimate: ~$0.015/call avg (Sonnet for chat, Gemini free for background)',
        model_split: {
          primary: 'Claude Sonnet 4.6 (direct chat + tool use)',
          background: 'Gemini Flash (FREE - heartbeat, proactive, ERICA)',
          voice: 'Gemini Flash via ElevenLabs (included in EL plan)'
        }
      },
      elevenlabs: {
        vara_calls_24h: varaCalls24h || 0,
        note: 'Billed by ElevenLabs plan, not per-call'
      },
      nylas: {
        emails_24h: emailsSent24h || 0,
        note: 'Sandbox key (free tier)'
      },
      supabase: {
        writes_24h: brainWrites24h || 0,
        note: 'Free tier up to 500MB'
      },
      cron: {
        runs_24h: cronRuns24h || 0,
        note: 'Uses Gemini Flash (free) per 911 cost fix'
      }
    };

    return NextResponse.json(estimates);
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
