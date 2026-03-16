import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const type = searchParams.get('type');
    const source = searchParams.get('source');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const since = searchParams.get('since');
    const action = searchParams.get('action');

    // Types listing
    if (action === 'types') {
      const { data } = await sb.from('aba_memory').select('memory_type').limit(1000);
      const types = [...new Set((data || []).map(r => r.memory_type).filter(Boolean))].sort();
      return NextResponse.json({ types });
    }

    // Stats
    if (action === 'stats') {
      const { count: total } = await sb.from('aba_memory').select('id', { count: 'exact', head: true });
      const s24 = new Date(Date.now() - 86400000).toISOString();
      const { count: last24h } = await sb.from('aba_memory').select('id', { count: 'exact', head: true }).gte('created_at', s24);
      return NextResponse.json({ total, last24h });
    }

    // Search
    let query = sb.from('aba_memory').select('*', { count: 'exact' });
    if (q) query = query.or(`content.ilike.%${q}%,source.ilike.%${q}%`);
    if (type) query = query.eq('memory_type', type);
    if (source) query = query.ilike('source', `%${source}%`);
    if (since) query = query.gte('created_at', since);
    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data, total: count, limit, offset });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const sb = getSupabase();
    const body = await req.json();
    const { id, ...updates } = body;
    const { data, error } = await sb.from('aba_memory').update(updates).eq('id', id).select();
    if (error) throw error;
    return NextResponse.json({ data: data[0] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const { error } = await sb.from('aba_memory').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
