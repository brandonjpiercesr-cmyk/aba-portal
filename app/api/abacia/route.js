import { NextResponse } from 'next/server';
import { ABACIA_URL, RENDER_KEY } from '../../../lib/config';
import { getSupabase } from '../../../lib/supabase';

export async function POST(req) {
  try {
    const body = await req.json();
    const action = body.action;

    // EXECUTE actions directly (not just chat)
    if (action === 'deploy') {
      const serviceId = body.serviceId;
      const r = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${RENDER_KEY}`, 'Content-Type': 'application/json' }, body: '{}'
      });
      return NextResponse.json({ success: r.status === 201 || r.status === 202, action: 'deploy_triggered' });
    }

    if (action === 'update_env') {
      const { serviceId, key, value } = body;
      const r = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars/${key}`, {
        method: 'PUT', headers: { 'Authorization': `Bearer ${RENDER_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });
      return NextResponse.json({ success: r.status === 200, action: 'env_updated', key });
    }

    if (action === 'write_brain') {
      const sb = getSupabase();
      const { data, error } = await sb.from('aba_memory').insert({
        source: body.source || `aoa_aba_action_${Date.now()}`,
        memory_type: body.memory_type || 'aba_portal_action',
        content: body.content,
        importance: body.importance || 7,
        tags: body.tags || ['aoa_portal', 'aba_executed']
      }).select();
      if (error) throw error;
      return NextResponse.json({ success: true, action: 'brain_written', id: data[0]?.id });
    }

    if (action === 'disable_proactive') {
      const sb = getSupabase();
      await sb.from('aba_memory').insert({
        source: 'aoa_disable_proactive_' + Date.now(),
        memory_type: 'system_override',
        content: JSON.stringify({ override: 'disable_proactive', reason: body.reason || 'Disabled via AOA Portal', disabled_at: new Date().toISOString(), disabled_by: 'brandon_T10' }),
        importance: 10, tags: ['system', 'override', 'proactive_disabled']
      });
      return NextResponse.json({ success: true, action: 'proactive_disabled' });
    }

    // Default: route through AIR for conversational commands
    const r = await fetch(`${ABACIA_URL}/api/air/process`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: body.message,
        user_id: body.user_id || 'brandon',
        channel: 'aoa_portal',
        context: { aoa_admin: true, trust_level: 'T10', can_execute: true }
      })
    });
    const data = await r.json();
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
