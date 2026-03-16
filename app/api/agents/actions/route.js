import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabase';
export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agent');
    if (!agentId) return NextResponse.json({ error: 'agent param required' }, { status: 400 });
    const tag = agentId.toLowerCase();
    const { data, error } = await sb.from('aba_memory')
      .select('id, source, memory_type, content, created_at, importance')
      .or(`tags.cs.{${tag}},source.ilike.%${tag}%,content.ilike.%${agentId}%`)
      .not('memory_type', 'in', '(aba_agents,agent_jd)')
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    return NextResponse.json({ agent: agentId, actions: data, count: data.length });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
