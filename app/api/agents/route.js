import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const source = searchParams.get('source'); // 'table', 'memory', or 'all' (default)

    // Single agent by ID (from aba_agent_jds table)
    if (id) {
      const { data, error } = await sb.from('aba_agent_jds').select('*').eq('id', id).single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    const results = { table_agents: [], memory_agents: [], count: 0 };

    // Pull from aba_agent_jds table (structured JDs)
    if (source !== 'memory') {
      const { data, error } = await sb.from('aba_agent_jds').select('*').order('agent_id', { ascending: true });
      if (!error && data) results.table_agents = data;
    }

    // Pull from aba_memory where memory_type=aba_agents (full JDs stored in brain)
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

    // Edit in aba_agent_jds table
    if (target === 'table' || !target) {
      const { data, error } = await sb.from('aba_agent_jds').update(updates).eq('id', id).select();
      if (error) throw error;
      return NextResponse.json({ data: data[0], target: 'aba_agent_jds' });
    }

    // Edit in aba_memory (update content field)
    if (target === 'memory') {
      const { data, error } = await sb.from('aba_memory').update({ content: updates.content }).eq('id', id).select();
      if (error) throw error;
      return NextResponse.json({ data: data[0], target: 'aba_memory' });
    }

    return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { data, error } = await sb.from('aba_agent_jds').insert(body).select();
    if (error) throw error;
    return NextResponse.json({ data: data[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
