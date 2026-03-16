import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (id) {
      const { data, error } = await sb.from('aba_agent_jds').select('*').eq('id', id).single();
      if (error) throw error;
      return NextResponse.json(data);
    }
    const { data, error } = await sb.from('aba_agent_jds').select('*').order('agent_name', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ agents: data, count: data.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { id, ...updates } = body;
    const { data, error } = await sb.from('aba_agent_jds').update(updates).eq('id', id).select();
    if (error) throw error;
    return NextResponse.json({ data: data[0] });
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
