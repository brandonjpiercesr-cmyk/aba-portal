export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agent');
    if (!agentId) return NextResponse.json({ error: 'agent param required' }, { status: 400 });
    const tag = agentId.toLowerCase();
    // ⬡B:aoa.audit_fix:FIX:H2_actions_tags_only:20260404⬡
    // Was: source.ilike + content.ilike caused false matches (AIR matches repair, FIND matches finding).
    // Now: tags.cs only — agents stamp their work with tags, that's the reliable signal.
    const { data, error } = await sb.from('aba_memory')
      .select('id, source, memory_type, content, created_at, importance')
      .contains('tags', [tag])
      .not('memory_type', 'in', '(aba_agents,agent_jd)')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return NextResponse.json({ agent: agentId, actions: data, count: data.length });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
