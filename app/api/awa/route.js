import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table') || 'jobs';
    const id = searchParams.get('id');

    // Single job drill-down
    if (id) {
      const { data, error } = await sb.from('aba_memory').select('*').eq('id', id).single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    if (table === 'applications') {
      const { data, error } = await sb.from('aba_memory')
        .select('*').eq('memory_type', 'awa_application_sent')
        .order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return NextResponse.json({ data: data || [], count: (data || []).length });
    }

    // Jobs from aba_memory
    const { data, error } = await sb.from('aba_memory')
      .select('id, content, created_at, importance, tags')
      .eq('memory_type', 'awa_job')
      .order('created_at', { ascending: false }).limit(200);
    if (error) throw error;

    const jobs = (data || []).map(item => {
      const c = typeof item.content === 'string' ? JSON.parse(item.content) : item.content;
      return { id: item.id, ...c, created_at: item.created_at, tags: item.tags };
    });

    return NextResponse.json({ data: jobs, count: jobs.length });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function DELETE(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { error } = await sb.from('aba_memory').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ deleted: true, id });
  } catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
