export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { RENDER_KEY, ABACIA_URL } from '../../../lib/config';

const SERVICES = {
  'abacia-services': 'srv-d67ucj3nv86c73e333e0',
  'reach-services': 'srv-d678jup4tr6s7396kki0',
};

const KEY_NAMES = [
  'ANTHROPIC_API_KEY',
  'GROQ_API_KEY',
  'GOOGLE_AI_API_KEY',
  'OPENAI_API_KEY',
  'ELEVENLABS_API_KEY',
  'NYLAS_API_KEY',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_URL',
  'OMI_API_KEY',
  'PERPLEXITY_API_KEY',
];

export async function GET() {
  try {
    const results = {};
    for (const [name, id] of Object.entries(SERVICES)) {
      const r = await fetch(`https://api.render.com/v1/services/${id}/env-vars`, {
        headers: { 'Authorization': `Bearer ${RENDER_KEY}` }
      });
      const data = await r.json();
      const vars = {};
      for (const item of (data || [])) {
        const ev = item.envVar || item;
        if (KEY_NAMES.some(k => ev.key?.includes(k) || ev.key?.includes('KEY') || ev.key?.includes('TOKEN') || ev.key?.includes('SECRET'))) {
          vars[ev.key] = {
            key: ev.key,
            hasValue: !!ev.value,
            preview: ev.value ? ev.value.slice(0, 8) + '...' + ev.value.slice(-6) : '(empty)',
            length: ev.value?.length || 0,
          };
        }
      }
      results[name] = { serviceId: id, vars };
    }

    // Health checks for each provider
    const health = {};

    // Anthropic
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': 'test', 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ok' }] }),
        signal: AbortSignal.timeout(5000)
      });
      // 401 means API is up (just bad key), 529 means overloaded
      health.anthropic = r.status === 529 ? 'overloaded' : r.status === 401 ? 'up' : r.ok ? 'up' : 'degraded';
    } catch { health.anthropic = 'down'; }

    // Groq
    try {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': 'Bearer test' },
        signal: AbortSignal.timeout(5000)
      });
      health.groq = r.status === 401 ? 'up' : r.ok ? 'up' : 'degraded';
    } catch { health.groq = 'down'; }

    // ElevenLabs
    try {
      const r = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': 'test' },
        signal: AbortSignal.timeout(5000)
      });
      health.elevenlabs = r.status === 401 ? 'up' : r.ok ? 'up' : 'degraded';
    } catch { health.elevenlabs = 'down'; }

    // ABAbase
    try {
      const r = await fetch(`${ABACIA_URL}/health`, { signal: AbortSignal.timeout(8000) });
      health.ababase = r.ok ? 'up' : 'down';
    } catch { health.ababase = 'down'; }

    return NextResponse.json({ services: results, health, ts: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { serviceId, key, value, action } = await req.json();

    if (action === 'test_anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': value, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role: 'user', content: 'ok' }] }),
        signal: AbortSignal.timeout(10000)
      });
      const data = await r.json();
      return NextResponse.json({ valid: !!data.content, status: r.status, detail: data.error?.message });
    }

    if (action === 'update') {
      if (!serviceId || !key || !value) return NextResponse.json({ error: 'serviceId, key, value required' }, { status: 400 });

      // SAFE UPDATE: Pull all vars, modify one, PUT full list back (911 RULE 3)
      const getRes = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
        headers: { 'Authorization': `Bearer ${RENDER_KEY}` }
      });
      const allVars = await getRes.json();
      const varList = (allVars || []).map(item => {
        const ev = item.envVar || item;
        return { key: ev.key, value: ev.key === key ? value : ev.value };
      });

      // Check if key exists, add if not
      if (!varList.find(v => v.key === key)) {
        varList.push({ key, value });
      }

      const putRes = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${RENDER_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(varList)
      });

      if (!putRes.ok) {
        return NextResponse.json({ error: 'Render PUT failed: ' + putRes.status }, { status: 500 });
      }

      const result = await putRes.json();
      return NextResponse.json({
        success: true,
        totalVars: result.length,
        updated: key,
        note: `Full list PUT with ${result.length} vars. No vars wiped.`
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
