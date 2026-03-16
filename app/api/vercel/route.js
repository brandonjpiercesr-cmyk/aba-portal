import { NextResponse } from 'next/server';
import { VERCEL_TOKEN } from '../../../lib/config';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const projectId = searchParams.get('project');

    if (action === 'deployments' && projectId) {
      const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5`, {
        headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
      });
      const data = await r.json();
      return NextResponse.json({ deployments: data.deployments || [] });
    }

    // Pull ALL Vercel projects
    const r = await fetch('https://api.vercel.com/v9/projects?limit=50', {
      headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
    });
    const data = await r.json();
    const projects = (data.projects || []).map(p => {
      const targets = p.targets || {};
      const prod = targets.production || {};
      const alias = prod.alias || [];
      return {
        name: p.name, id: p.id,
        url: alias[0] || prod.url || null,
        framework: p.framework || null,
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      };
    });
    return NextResponse.json({ projects, count: projects.length, source: 'vercel_api_dynamic' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
