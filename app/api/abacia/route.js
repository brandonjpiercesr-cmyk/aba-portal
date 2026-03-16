import { NextResponse } from 'next/server';
import { ABACIA_URL } from '../../../lib/config';
export async function POST(req) {
  try {
    const body = await req.json();
    const r = await fetch(`${ABACIA_URL}/api/air/process`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: body.message, user_id: body.user_id || 'brandon', channel: body.channel || 'aoa_portal' })
    });
    const data = await r.json();
    return NextResponse.json(data);
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
