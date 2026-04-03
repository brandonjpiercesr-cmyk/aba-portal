export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const sb = getSupabase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now - 7 * 86400000).toISOString();
    const hourAgo = new Date(now - 3600000).toISOString();

    // Real cost tracking data from brain
    const { data: todayData, error: todayError } = await sb.from('aba_memory')
      .select('content, created_at')
      .eq('memory_type', 'cost_tracking')
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false })
      .limit(500);
    
    console.log('[COST DEBUG] todayStart:', todayStart, 'now:', now.toISOString(), 'rows:', todayData?.length, 'error:', todayError?.message);

    const { data: weekData } = await sb.from('aba_memory')
      .select('content')
      .eq('memory_type', 'cost_tracking')
      .gte('created_at', weekStart)
      .limit(2000);

    // Aggregate
    let todayTotal = 0, todayCalls = 0, todayByModel = {}, todayByChannel = {}, todayByType = {};
    let lastHourTotal = 0, lastHourCalls = 0;
    let todayInput = 0, todayOutput = 0, todayCacheRead = 0, todayCacheCreate = 0;
    let recentCalls = [];

    for (const row of (todayData || [])) {
      try {
        const e = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        const cost = e.cost_usd || 0;
        todayTotal += cost;
        todayCalls++;
        todayInput += e.input_tokens || 0;
        todayOutput += e.output_tokens || 0;
        todayCacheRead += e.cache_read_input_tokens || 0;
        todayCacheCreate += e.cache_creation_input_tokens || 0;

        const model = (e.model || 'unknown').replace('claude-', '').replace('-20260217', '');
        todayByModel[model] = (todayByModel[model] || 0) + cost;
        const ch = e.channel || 'unknown';
        todayByChannel[ch] = (todayByChannel[ch] || 0) + cost;
        const ct = e.call_type || 'unknown';
        todayByType[ct] = (todayByType[ct] || 0) + cost;

        if (new Date(row.created_at) >= new Date(hourAgo)) {
          lastHourTotal += cost;
          lastHourCalls++;
        }

        if (recentCalls.length < 20) {
          recentCalls.push({
            time: row.created_at,
            model,
            channel: ch,
            type: ct,
            cost: Math.round(cost * 10000) / 10000,
            input: e.input_tokens || 0,
            output: e.output_tokens || 0,
            cache_hit: e.cache_hit_rate || 0
          });
        }
      } catch (pe) {}
    }

    let weekTotal = 0, weekCalls = 0, weekByDay = {};
    for (const row of (weekData || [])) {
      try {
        const e = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        const cost = e.cost_usd || 0;
        weekTotal += cost;
        weekCalls++;
        const day = (e.timestamp || '').split('T')[0] || 'unknown';
        weekByDay[day] = (weekByDay[day] || 0) + cost;
      } catch (pe) {}
    }

    const cacheHitRate = (todayCacheRead + todayCacheCreate) > 0
      ? Math.round(todayCacheRead / (todayCacheRead + todayCacheCreate) * 100) : 0;

    const sortObj = (obj) => Object.entries(obj).sort((a,b) => b[1] - a[1]).map(([k,v]) => ({ name: k, cost: Math.round(v * 10000) / 10000 }));
    const hourOfDay = now.getUTCHours() || 1;

    return NextResponse.json({
      realtime: true,
      generated_at: now.toISOString(),
      today: {
        total_cost: Math.round(todayTotal * 100) / 100,
        total_calls: todayCalls,
        input_tokens: todayInput,
        output_tokens: todayOutput,
        cache_read: todayCacheRead,
        cache_create: todayCacheCreate,
        cache_hit_rate: cacheHitRate,
        projected_daily: Math.round(todayTotal / hourOfDay * 24 * 100) / 100,
        by_model: sortObj(todayByModel),
        by_channel: sortObj(todayByChannel),
        by_type: sortObj(todayByType)
      },
      last_hour: {
        cost: Math.round(lastHourTotal * 100) / 100,
        calls: lastHourCalls
      },
      week: {
        total_cost: Math.round(weekTotal * 100) / 100,
        total_calls: weekCalls,
        avg_daily: Math.round(weekTotal / 7 * 100) / 100,
        by_day: Object.entries(weekByDay).sort().map(([d,c]) => ({ date: d, cost: Math.round(c * 100) / 100 }))
      },
      recent_calls: recentCalls
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
