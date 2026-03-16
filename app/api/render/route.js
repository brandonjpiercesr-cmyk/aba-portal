import { NextResponse } from 'next/server';
import { RENDER_KEY, RENDER_SERVICES } from '../../../lib/config';
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const service = searchParams.get('service');
    const serviceId = RENDER_SERVICES[service] || service;
    if (action === 'deploys' && serviceId) {
      const r = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=10`, { headers: { 'Authorization': `Bearer ${RENDER_KEY}` } });
      return NextResponse.json({ deploys: await r.json() });
    }
    const results = [];
    for (const [name, id] of Object.entries(RENDER_SERVICES)) {
      try {
        const r = await fetch(`https://api.render.com/v1/services/${id}`, { headers: { 'Authorization': `Bearer ${RENDER_KEY}` } });
        const data = await r.json();
        results.push({ name, id, status: data.suspended === 'suspended' ? 'suspended' : 'active', type: data.type, url: data.serviceDetails?.url || null, updatedAt: data.updatedAt });
      } catch (e) { results.push({ name, id, error: e.message }); }
    }
    return NextResponse.json({ services: results });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
export async function POST(req) {
  try {
    const body = await req.json();
    const serviceId = RENDER_SERVICES[body.service] || body.service;
    const r = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${RENDER_KEY}`, 'Content-Type': 'application/json' }, body: '{}'
    });
    return NextResponse.json({ triggered: r.status === 201 || r.status === 202 });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
