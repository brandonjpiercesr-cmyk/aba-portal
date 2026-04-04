// ⬡B:SHADOW:APP:api_route:aoa_portal:20260404⬡
export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const sb = getSupabase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now - 7 * 86400000).toISOString();

    // 1. Recent shadow_audit entries (last 50)
    const { data: audits } = await sb.from('aba_memory')
      .select('source, user_id, content, created_at')
      .eq('memory_type', 'shadow_audit')
      .order('created_at', { ascending: false })
      .limit(50);

    // 2. Today's audit count
    const { data: todayAudits } = await sb.from('aba_memory')
      .select('content')
      .eq('memory_type', 'shadow_audit')
      .gte('created_at', todayStart)
      .limit(500);

    // 3. Active SHADOW flags in CeeCee queue
    const { data: flags } = await sb.from('aba_memory')
      .select('id, source, content, importance, created_at, tags')
      .eq('memory_type', 'command_center_activity')
      .ilike('source', 'shadow.flag.%')
      .order('created_at', { ascending: false })
      .limit(20);

    // 4. This week's flags
    const { data: weekFlags } = await sb.from('aba_memory')
      .select('content')
      .eq('memory_type', 'command_center_activity')
      .ilike('source', 'shadow.flag.%')
      .gte('created_at', weekStart)
      .limit(100);

    // Aggregate today's data
    let todayTokens = 0, todayMaxTokens = 0, todayCostSpikes = 0, todayToolErrors = 0, todayReviewFails = 0;
    const channelCounts = {};
    const hamCounts = {};

    for (const row of (todayAudits || [])) {
      try {
        const e = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        const tokens = e.tokens || 0;
        todayTokens += tokens;
        if (tokens > todayMaxTokens) todayMaxTokens = tokens;
        if (tokens > 100000) todayCostSpikes++;
        const ch = e.channel || 'unknown';
        channelCounts[ch] = (channelCounts[ch] || 0) + 1;
        const ham = e.ham_id || 'unknown';
        hamCounts[ham] = (hamCounts[ham] || 0) + 1;
      } catch {}
    }

    // Parse recent audits for display
    const recentAudits = (audits || []).slice(0, 20).map(row => {
      try {
        const e = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        return {
          timestamp: e.timestamp,
          ham_id: e.ham_id || row.user_id || 'unknown',
          channel: e.channel || 'unknown',
          tokens: e.tokens || 0,
          tool_count: e.tool_count || 0,
          tools_used: e.tools_used || [],
          review_passed: e.review_passed,
          duration_ms: e.duration_ms || 0,
          message_preview: (e.message_preview || '').substring(0, 60)
        };
      } catch { return null; }
    }).filter(Boolean);

    // Parse flags for display
    const activeFlags = (flags || []).map(row => {
      try {
        const c = typeof row.content === 'string' ? JSON.parse(row.content) : row.content;
        return {
          id: row.id,
          type: c.title || c.type || 'SHADOW Flag',
          body: c.body || c.summary || row.content,
          urgency: c.urgency || 'medium',
          category: c.category || 'shadow',
          created_at: row.created_at,
          importance: row.importance
        };
      } catch {
        return {
          id: row.id,
          type: 'SHADOW Flag',
          body: typeof row.content === 'string' ? row.content.substring(0, 200) : 'Unknown',
          urgency: 'medium',
          category: 'shadow',
          created_at: row.created_at,
          importance: row.importance
        };
      }
    });

    // Channel breakdown
    const channels = Object.entries(channelCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // HAM breakdown
    const hams = Object.entries(hamCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      stats: {
        today_audits: (todayAudits || []).length,
        today_tokens: todayTokens,
        today_avg_tokens: (todayAudits || []).length > 0 ? Math.round(todayTokens / todayAudits.length) : 0,
        today_max_tokens: todayMaxTokens,
        today_cost_spikes: todayCostSpikes,
        today_tool_errors: todayToolErrors,
        today_review_fails: todayReviewFails,
        week_flags: (weekFlags || []).length,
        active_flags: activeFlags.length
      },
      channels,
      hams,
      recent_audits: recentAudits,
      active_flags: activeFlags,
      config: {
        user_threshold: 100000,
        background_threshold: 200000,
        background_channels: ['cook_executor', 'cook_test', 'test', 'batch', 'proactive', 'cron', 'heartbeat', 'incuaba', 'taste']
      }
    });
  } catch (err) {
    console.error('[SHADOW API]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
