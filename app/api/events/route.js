import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const trigger = searchParams.get('trigger');
    const channel = searchParams.get('channel');
    const result = searchParams.get('result');
    const since = searchParams.get('since') || new Date(Date.now() - 24 * 3600000).toISOString();
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    let query = sb.from('aba_memory')
      .select('content, created_at, source, tags')
      .eq('memory_type', 'aba_event')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let events = (data || []).map(row => {
      try {
        const e = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        e._created = row.created_at;
        return e;
      } catch { return null; }
    }).filter(Boolean);

    // Client-side filters (Supabase JSON filtering is unreliable)
    if (trigger) events = events.filter(e => e.trigger === trigger);
    if (channel) events = events.filter(e => e.channel === channel);
    if (result) events = events.filter(e => e.result === result);

    // Summary stats
    const triggers = {};
    const channels = {};
    const results = {};
    let totalCost = 0;
    for (const e of events) {
      triggers[e.trigger] = (triggers[e.trigger] || 0) + 1;
      channels[e.channel] = (channels[e.channel] || 0) + 1;
      results[e.result] = (results[e.result] || 0) + 1;
      totalCost += e.cost_usd || 0;
    }

    return NextResponse.json({
      total: events.length,
      total_cost: Math.round(totalCost * 100) / 100,
      summary: {
        by_trigger: Object.entries(triggers).sort((a,b) => b[1] - a[1]),
        by_channel: Object.entries(channels).sort((a,b) => b[1] - a[1]),
        by_result: Object.entries(results).sort((a,b) => b[1] - a[1])
      },
      events
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
