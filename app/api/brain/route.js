import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');

    if (action === 'types') {
      const { data } = await sb.from('aba_memory').select('memory_type').limit(1000);
      const types = [...new Set((data || []).map(r => r.memory_type).filter(Boolean))].sort();
      return NextResponse.json({ types });
    }

    let query = sb.from('aba_memory').select('*', { count: 'exact' });
    if (q) query = query.or(`content.ilike.%${q}%,source.ilike.%${q}%`);
    if (type) query = query.eq('memory_type', type);
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data, total: count, limit, offset });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function POST(req) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { data, error } = await sb.from('aba_memory').insert({
      source: body.source || `aoa_manual_${Date.now()}`,
      memory_type: body.memory_type || 'manual_entry',
      content: body.content,
      importance: body.importance || 5,
      tags: body.tags || ['aoa_portal', 'T10_HAM_manual'],
    }).select();
    if (error) throw error;
    return NextResponse.json({ data: data[0] });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function PUT(req) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { id, ...updates } = body;
    const { data, error } = await sb.from('aba_memory').update(updates).eq('id', id).select();
    if (error) throw error;
    return NextResponse.json({ data: data[0] });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function DELETE(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { error } = await sb.from('aba_memory').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
