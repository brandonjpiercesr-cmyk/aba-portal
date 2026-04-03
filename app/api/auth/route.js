export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function POST(req) {
  try {
    const { code } = await req.json();
    if (!code) return NextResponse.json({ valid: false });

    const sb = getSupabase();
    const { data } = await sb.from('aba_memory')
      .select('content')
      .eq('source', 'config.aoa_portal.t10_auth_codes')
      .limit(1)
      .single();

    if (!data) return NextResponse.json({ valid: false });

    const config = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
    const valid = (config.codes || []).includes(code);
    return NextResponse.json({ valid });
  } catch (err) {
    return NextResponse.json({ valid: false, error: err.message }, { status: 500 });
  }
}
