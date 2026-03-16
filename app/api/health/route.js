import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ status: 'operational', service: 'aba-portal', version: '1.0.0', ts: new Date().toISOString() });
}
