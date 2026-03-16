import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table') || 'jobs';
    const tbl = table === 'applications' ? 'awa_applications' : 'awa_jobs';
    const { data, error } = await sb.from(tbl).select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ data: data || [], count: (data || []).length });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
