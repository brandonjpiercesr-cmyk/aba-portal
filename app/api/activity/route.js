import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const minutes = parseInt(searchParams.get('minutes') || '30');
    const limit = parseInt(searchParams.get('limit') || '100');
    const since = new Date(Date.now() - minutes * 60000).toISOString();
    const { data, error } = await sb.from('aba_memory')
      .select('id, source, memory_type, content, created_at, importance, tags')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return NextResponse.json({ activity: data, count: data.length, since });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
