export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const sb = getSupabase();
    const now = new Date();
    // ⬡B:aoa.audit_fix:FIX:H7_timezone_eastern:20260404⬡
    // "Today" must be Eastern midnight, not UTC midnight. Brandon is in NC (UTC-4 EDT).
    const easternOffsetMs = 4 * 3600000;
    const easternNow = new Date(now.getTime() - easternOffsetMs);
    const todayStart = new Date(Date.UTC(easternNow.getUTCFullYear(), easternNow.getUTCMonth(), easternNow.getUTCDate()) + easternOffsetMs).toISOString();
    const weekStart = new Date(now - 7 * 86400000).toISOString();
    const hourAgo = new Date(now - 3600000).toISOString();

    // Real cost tracking data from brain
    const { data: todayData, error: todayError } = await sb.from('aba_memory')
      .select('content, created_at')
      .eq('memory_type', 'cost_tracking')
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false })
      .limit(500);


    const { data: weekData } = await sb.from('aba_memory')
      .select('content, created_at')
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

        // ⬡B:aoa.audit_fix:FIX:L2_model_date_regex:20260404⬡
        const model = (e.model || 'unknown').replace('claude-', '').replace(/-\d{8}$/, '');
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
        // ⬡B:aoa.audit_fix:FIX:M1_weekly_both_cost_fields:20260404⬡
        // Per-call entries have cost_usd. Daily aggregates have total_usd. Check both.
        const cost = e.cost_usd || e.total_usd || 0;
        weekTotal += cost;
        weekCalls++;
        // ⬡B:aoa.audit_fix:FIX:L3_weekly_day_both_fields:20260404⬡
        const day = (e.timestamp || e.date || row.created_at || '').split('T')[0] || 'unknown';
        weekByDay[day] = (weekByDay[day] || 0) + cost;
      } catch (pe) {}
    }

    // ⬡B:aoa.audit_fix:FIX:M2_cache_hit_rate:20260404⬡
    // Anthropic: input_tokens excludes cache. Total = input + cache_read + cache_create.
    const totalRealInput = todayInput + todayCacheRead + todayCacheCreate;
    const cacheHitRate = totalRealInput > 0
      ? Math.round(todayCacheRead / totalRealInput * 100) : 0;

    const sortObj = (obj) => Object.entries(obj).sort((a,b) => b[1] - a[1]).map(([k,v]) => ({ name: k, cost: Math.round(v * 10000) / 10000 }));
    // ⬡B:aoa.audit_fix:FIX:H7b_projection_eastern:20260404⬡ Use Eastern hour for projection
    const easternHour = (now.getUTCHours() - 4 + 24) % 24;
    const hourOfDay = easternHour || 1;

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
