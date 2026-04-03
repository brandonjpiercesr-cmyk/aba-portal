export const dynamic = "force-dynamic";
export const revalidate = 0;
import { NextResponse } from 'next/server';
import { ABACIA_URL } from '../../../lib/config';

// External cron services (cron-job.org, UptimeRobot) can hit this every 5 minutes
// to keep both the portal AND ABAbase warm on Render's starter plan.
export async function GET() {
  const results = {};
  const targets = [
    { name: 'abacia-services', url: `${ABACIA_URL}/api/health` },
    { name: 'reach-services', url: 'https://aba-reach.onrender.com/api/health' },
  ];

  for (const target of targets) {
    try {
      const start = Date.now();
      const r = await fetch(target.url, { signal: AbortSignal.timeout(30000) });
      results[target.name] = { status: r.ok ? 'up' : 'down', ms: Date.now() - start, http: r.status };
    } catch (e) {
      results[target.name] = { status: 'down', error: e.message };
    }
  }

  return NextResponse.json({ keepalive: true, ts: new Date().toISOString(), services: results });
}
