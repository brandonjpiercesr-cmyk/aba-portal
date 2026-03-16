import { NextResponse } from 'next/server';
import { ABACIA_URL, RENDER_KEY } from '../../../lib/config';
import { getSupabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const sb = getSupabase();
    const checks = {};

    // 1. ABAbase health
    try {
      const r = await fetch(`${ABACIA_URL}/api/health`, { signal: AbortSignal.timeout(8000) });
      checks.ababase = { status: r.ok ? 'up' : 'down', code: r.status };
    } catch { checks.ababase = { status: 'down', code: 0 }; }

    // 2. Supabase health
    try {
      const { count } = await sb.from('aba_memory').select('id', { count: 'exact', head: true }).limit(1);
      checks.supabase = { status: 'up', entries: count };
    } catch (e) { checks.supabase = { status: 'down', error: e.message }; }

    // 3. Render services health
    try {
      const r = await fetch('https://api.render.com/v1/services?limit=20', { headers: { 'Authorization': `Bearer ${RENDER_KEY}` } });
      const data = await r.json();
      const svcs = (data || []).map(i => i.service || i);
      checks.render = {
        status: 'up',
        total: svcs.length,
        active: svcs.filter(s => s.suspended !== 'suspended').length,
        suspended: svcs.filter(s => s.suspended === 'suspended').length
      };
    } catch (e) { checks.render = { status: 'down', error: e.message }; }

    // 4. API keys status from env vars
    try {
      const { data } = await sb.from('aba_memory')
        .select('content')
        .eq('source', 'session_credentials')
        .order('created_at', { ascending: false })
        .limit(1);
      if (data?.[0]) {
        const creds = data[0].content;
        checks.api_keys = {
          anthropic: creds.includes('ANTHROPIC') || creds.includes('sk-ant') ? 'configured' : 'missing',
          gemini: creds.includes('AIzaSy') ? 'configured' : 'missing',
          elevenlabs: creds.includes('sk_e0b') ? 'configured' : 'missing',
          nylas: creds.includes('nyk_') ? 'configured' : 'missing',
          github: creds.includes('ghp_') ? 'configured' : 'missing',
          groq: creds.includes('gsk_') ? 'configured' : 'missing',
          perplexity: creds.includes('pplx-') ? 'configured' : 'missing',
        };
      }
    } catch { checks.api_keys = { status: 'unknown' }; }

    // 5. Model routing (which models are primary vs backup)
    checks.model_routing = {
      primary_chat: 'Claude Sonnet 4.6 (direct ABA chat, tool use)',
      background_loops: 'Gemini Flash (free - heartbeat, proactive, ERICA)',
      voice: 'Gemini Flash via ElevenLabs Custom LLM',
      backup_chat: 'Groq (if Anthropic down)',
      web_research: 'Perplexity (if web search needed)',
      note: '911 COST FIX: background loops must stay on Gemini Flash'
    };

    // Overall status
    const allUp = checks.ababase?.status === 'up' && checks.supabase?.status === 'up' && checks.render?.status === 'up';
    checks.overall = allUp ? 'operational' : 'degraded';

    return NextResponse.json(checks);
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
