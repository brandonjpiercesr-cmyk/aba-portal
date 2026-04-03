export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

const FAILOVER_SOURCE = 'system_override.primary_llm_provider';

export async function GET() {
  try {
    const sb = getSupabase();
    const { data } = await sb.from('aba_memory')
      .select('content, created_at')
      .eq('source', FAILOVER_SOURCE)
      .eq('memory_type', 'system_override')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const config = typeof data[0].content === 'string' ? JSON.parse(data[0].content) : data[0].content;
      return NextResponse.json({ active: true, ...config, updated_at: data[0].created_at });
    }
    return NextResponse.json({ active: false, provider: 'anthropic', mode: 'normal' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const sb = getSupabase();
    const { provider, reason } = await req.json();
    const VALID = ['anthropic', 'gemini', 'openai', 'groq'];
    if (!VALID.includes(provider)) return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });

    const isNormal = provider === 'anthropic';
    const content = {
      provider,
      mode: isNormal ? 'normal' : 'failover',
      reason: isNormal ? 'Restored to normal operation' : (reason || `Manual failover to ${provider}`),
      activated_at: new Date().toISOString(),
      activated_by: 'brandon_T10_via_AOA_Portal',
      model_mapping: isNormal ? null : {
        'claude-sonnet-4-6': provider === 'gemini' ? 'gemini-2.5-flash' : provider === 'openai' ? 'gpt-4.1' : 'llama-3.1-70b-versatile',
        'claude-haiku-4-5-20251001': provider === 'gemini' ? 'gemini-2.5-flash' : provider === 'openai' ? 'gpt-4.1-mini' : 'llama-3.1-8b-instant',
      }
    };

    await sb.from('aba_memory').upsert({
      source: FAILOVER_SOURCE,
      memory_type: 'system_override',
      content: JSON.stringify(content),
      user_id: 'brandon',
      importance: 10,
      tags: ['system_override', 'failover', 'T10'],
      abcd_tag: 'BOTH',
      is_system: true,
      air_processed: true,
    }, { onConflict: 'source' });

    return NextResponse.json({ success: true, ...content });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
