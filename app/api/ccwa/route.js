import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';
export async function GET() {
  try {
    const sb = getSupabase();
    const { data, count, error } = await sb.from('aba_memory').select('*', { count: 'exact' })
      .eq('memory_type', 'ccwa_training_note').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return NextResponse.json({ notes: data, total: count });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
