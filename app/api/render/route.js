import { NextResponse } from 'next/server';
import { RENDER_KEY } from '../../../lib/config';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const serviceId = searchParams.get('service');

    if (action === 'deploys' && serviceId) {
      const r = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys?limit=10`, {
        headers: { 'Authorization': `Bearer ${RENDER_KEY}` }
      });
      return NextResponse.json({ deploys: await r.json() });
    }

    if (action === 'env' && serviceId) {
      const r = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
        headers: { 'Authorization': `Bearer ${RENDER_KEY}` }
      });
      const data = await r.json();
      const masked = (data || []).map(e => {
        const ev = e.envVar || e;
        return { key: ev.key, value: ev.value ? ev.value.slice(0, 6) + '****' : '(empty)' };
      });
      return NextResponse.json({ env: masked });
    }

    // Pull ALL services dynamically from Render API
    const r = await fetch('https://api.render.com/v1/services?limit=50', {
      headers: { 'Authorization': `Bearer ${RENDER_KEY}` }
    });
    const raw = await r.json();
    const services = (raw || []).map(item => {
      const s = item.service || item;
      return {
        name: s.name, id: s.id, type: s.type,
        status: s.suspended === 'suspended' ? 'suspended' : 'active',
        url: s.serviceDetails?.url || null,
        repo: s.repo || null, branch: s.branch || null,
        updatedAt: s.updatedAt,
        createdAt: s.createdAt
      };
    });
    return NextResponse.json({ services, count: services.length, source: 'render_api_dynamic' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const serviceId = body.service;
    if (!serviceId) return NextResponse.json({ error: 'service ID required' }, { status: 400 });
    const r = await fetch(`https://api.render.com/v1/services/${serviceId}/deploys`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${RENDER_KEY}`, 'Content-Type': 'application/json' }, body: '{}'
    });
    return NextResponse.json({ triggered: r.status === 201 || r.status === 202 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
