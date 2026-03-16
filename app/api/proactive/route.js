import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
export async function GET() {
  try {
    const sb = getSupabase();
    const { data, error } = await sb.from('aba_memory').select('*')
      .or('memory_type.eq.omi_proactive_context,memory_type.eq.omi_proactive_execution')
      .order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return NextResponse.json({ proactive: data, count: data.length });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
