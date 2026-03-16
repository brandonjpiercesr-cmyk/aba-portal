import { NextResponse } from 'next/server';
import { RENDER_KEY } from '../../../lib/config';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('service');
    if (!serviceId) return NextResponse.json({ error: 'service ID required' }, { status: 400 });
    const r = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
      headers: { 'Authorization': `Bearer ${RENDER_KEY}` }
    });
    const data = await r.json();
    const masked = (data || []).map(e => {
      const ev = e.envVar || e;
      return { key: ev.key, value: ev.value ? ev.value.slice(0, 6) + '****' : '(empty)' };
    });
    return NextResponse.json({ env: masked });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { serviceId, key, value } = body;
    const r = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars/${key}`, {
      method: 'PUT', headers: { 'Authorization': `Bearer ${RENDER_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
    return NextResponse.json({ updated: r.status === 200, key });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
