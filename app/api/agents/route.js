import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const source = searchParams.get('source');

    if (id) {
      const { data, error } = await sb.from('aba_agent_jds').select('*').eq('id', id).single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    const results = { table_agents: [], memory_agents: [], count: 0 };

    if (source !== 'memory') {
      const { data, error } = await sb.from('aba_agent_jds').select('*').order('agent_id', { ascending: true });
      if (!error && data) {
        // Auto-load last 5 actions for EVERY agent
        for (const agent of data) {
          const tag = agent.agent_id.toLowerCase();
          try {
            const { data: actions } = await sb.from('aba_memory')
              .select('id, source, memory_type, content, created_at')
              .or(`tags.cs.{${tag}},source.ilike.%${tag}%`)
              .not('memory_type', 'in', '(aba_agents,agent_jd)')
              .order('created_at', { ascending: false })
              .limit(5);
            agent.recent_actions = actions || [];
          } catch { agent.recent_actions = []; }
        }
        results.table_agents = data;
      }
    }

    if (source !== 'table') {
      const { data, error } = await sb.from('aba_memory')
        .select('id, source, memory_type, content, created_at, importance, tags')
        .eq('memory_type', 'aba_agents')
        .order('source', { ascending: true });
      if (!error && data) results.memory_agents = data;
    }

    results.count = results.table_agents.length + results.memory_agents.length;
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { id, target, ...updates } = body;
    if (target === 'memory') {
      const { data, error } = await sb.from('aba_memory').update({ content: updates.content }).eq('id', id).select();
      if (error) throw error;
      return NextResponse.json({ data: data[0], target: 'aba_memory' });
    }
    const { data, error } = await sb.from('aba_agent_jds').update(updates).eq('id', id).select();
    if (error) throw error;
    return NextResponse.json({ data: data[0], target: 'aba_agent_jds' });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function POST(req) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { data, error } = await sb.from('aba_agent_jds').insert(body).select();
    if (error) throw error;
    return NextResponse.json({ data: data[0] });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
