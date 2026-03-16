import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
export async function GET() {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('aba_memory').select('*')
      .or('memory_type.eq.taste_batch_summary,memory_type.eq.taste_batch_result')
      .order('created_at', { ascending: false }).limit(30);
    if (error) throw error;
    return NextResponse.json({ batches: data, count: data.length });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
