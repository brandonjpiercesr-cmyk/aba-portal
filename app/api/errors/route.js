import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const since = new Date(Date.now() - hours * 3600000).toISOString();
    const { data, error } = await sb.from('aba_memory').select('*')
      .or('memory_type.ilike.%error%,source.ilike.%error%,content.ilike.%failed%')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ errors: data, count: data.length });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
