// ⬡B:aoa.layered_dashboard:CREATE:api_route:20260425⬡
// AOA LAYERED dashboard backend.
// Aggregates layered_assessment.{email}.day{N} rows + layered_profile.{email} +
// gmg_progress rows into per-student dashboards. Read-only — admin view of how
// each GMG-U student is scoring across the LAYERED behavioral framework.
//
// Endpoints:
//   GET /api/layered?action=roster        → list of students with summary stats
//   GET /api/layered?action=student&email=<e>  → full per-student assessment detail
//   GET /api/layered?action=overview      → cohort-wide LAYERED averages
//
// Source patterns scanned:
//   gmg_progress (memory_type)       — completedDays + xp + cohort
//   layered_assessment (memory_type) — per-day grading JSON
//   layered_profile.{email} (source) — cumulative profile JSON

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { getSupabase } from '../../../lib/supabase';

// ⬡B:aoa.layered.helpers:UTIL:safe_json_parse:20260425⬡
function safeJson(content) {
  if (content == null) return {};
  if (typeof content === 'object') return content;
  try { return JSON.parse(content); } catch { return {}; }
}

// Compute a single composite score from a layered assessment.
// LAYERED has 7 layers (each scored 1-10): identity, awareness, yielding,
// engagement, resilience, ethics, devotion. We average them.
function compositeScore(assessment) {
  if (!assessment || typeof assessment !== 'object') return null;
  const layers = assessment.layers || assessment.layer_scores || {};
  const vals = Object.values(layers).filter(v => typeof v === 'number');
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export async function GET(req) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'roster';

    if (action === 'roster') {
      // Pull every gmg_progress row + every layered_profile row.
      // Combine by email.
      const [progressRes, profileRes, assessRes] = await Promise.all([
        sb.from('aba_memory')
          .select('source,user_id,content,created_at')
          .eq('memory_type', 'gmg_progress')
          .limit(500),
        sb.from('aba_memory')
          .select('source,user_id,content,created_at')
          .like('source', 'layered_profile.%')
          .limit(500),
        sb.from('aba_memory')
          .select('source,user_id,content,created_at')
          .eq('memory_type', 'layered_assessment')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      const byEmail = {};
      for (const row of (progressRes.data || [])) {
        const email = (row.user_id || '').toLowerCase();
        if (!email) continue;
        const c = safeJson(row.content);
        byEmail[email] = byEmail[email] || { email };
        byEmail[email].name = c.name || byEmail[email].name;
        byEmail[email].cohort_type = c.cohort_type || byEmail[email].cohort_type;
        byEmail[email].gmg_track = c.gmg_track || byEmail[email].gmg_track;
        byEmail[email].role = c.role || byEmail[email].role;
        byEmail[email].xp = c.xp || 0;
        byEmail[email].completedDays = (c.completedDays || []).length;
        byEmail[email].lastActivity = c.lastActivity || row.created_at;
      }

      for (const row of (profileRes.data || [])) {
        const email = (row.source || '').replace('layered_profile.', '').toLowerCase();
        const c = safeJson(row.content);
        byEmail[email] = byEmail[email] || { email };
        byEmail[email].profileScore = compositeScore(c);
        byEmail[email].layerScores = c.layers || c.layer_scores || null;
        byEmail[email].profileUpdatedAt = row.created_at;
      }

      // Count layered_assessment rows per student
      const assessCount = {};
      const latestAssess = {};
      for (const row of (assessRes.data || [])) {
        const email = (row.user_id || '').toLowerCase();
        if (!email) continue;
        assessCount[email] = (assessCount[email] || 0) + 1;
        if (!latestAssess[email]) latestAssess[email] = row.created_at;
      }
      for (const email in assessCount) {
        byEmail[email] = byEmail[email] || { email };
        byEmail[email].assessmentCount = assessCount[email];
        byEmail[email].lastAssessmentAt = latestAssess[email];
      }

      const roster = Object.values(byEmail).sort((a, b) => {
        const ax = a.lastActivity || a.lastAssessmentAt || '';
        const bx = b.lastActivity || b.lastAssessmentAt || '';
        return bx.localeCompare(ax);
      });
      return NextResponse.json({ roster, total: roster.length });
    }

    if (action === 'student') {
      const email = (searchParams.get('email') || '').toLowerCase().trim();
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

      const [progRes, profRes, assessRes] = await Promise.all([
        sb.from('aba_memory')
          .select('content,created_at')
          .eq('source', 'gmg.university.progress.' + email)
          .limit(1),
        sb.from('aba_memory')
          .select('content,created_at')
          .eq('source', 'layered_profile.' + email)
          .limit(1),
        sb.from('aba_memory')
          .select('source,content,created_at')
          .eq('memory_type', 'layered_assessment')
          .eq('user_id', email)
          .order('created_at', { ascending: true })
          .limit(100),
      ]);

      const progress = (progRes.data && progRes.data[0]) ? safeJson(progRes.data[0].content) : {};
      const profile = (profRes.data && profRes.data[0]) ? safeJson(profRes.data[0].content) : {};
      const assessments = (assessRes.data || []).map(r => {
        const a = safeJson(r.content);
        return {
          source: r.source,
          day: a.day || (r.source.match(/\.day(\d+)$/) || [])[1] || null,
          createdAt: r.created_at,
          composite: compositeScore(a),
          layers: a.layers || a.layer_scores || {},
          signals: a.core_signals || a.signals || {},
          summary: a.summary || a.assessment_summary || '',
          conversation_id: a.conversation_id || null,
        };
      });

      return NextResponse.json({
        email,
        progress: {
          completedDays: progress.completedDays || [],
          xp: progress.xp || 0,
          cohort_type: progress.cohort_type || null,
          gmg_track: progress.gmg_track || null,
          role: progress.role || null,
          name: progress.name || null,
          lastActivity: progress.lastActivity || null,
        },
        profile: {
          composite: compositeScore(profile),
          layers: profile.layers || profile.layer_scores || {},
          updatedAt: (profRes.data && profRes.data[0]) ? profRes.data[0].created_at : null,
        },
        assessments,
        assessmentCount: assessments.length,
      });
    }

    if (action === 'overview') {
      // Cohort-wide averages across all layered_profile rows.
      const { data } = await sb.from('aba_memory')
        .select('content')
        .like('source', 'layered_profile.%')
        .limit(500);

      const layerSums = {};
      const layerCounts = {};
      let composites = [];
      for (const row of (data || [])) {
        const c = safeJson(row.content);
        const layers = c.layers || c.layer_scores || {};
        for (const [k, v] of Object.entries(layers)) {
          if (typeof v !== 'number') continue;
          layerSums[k] = (layerSums[k] || 0) + v;
          layerCounts[k] = (layerCounts[k] || 0) + 1;
        }
        const comp = compositeScore(c);
        if (comp != null) composites.push(comp);
      }

      const layerAverages = {};
      for (const k in layerSums) {
        layerAverages[k] = Math.round((layerSums[k] / layerCounts[k]) * 10) / 10;
      }
      const cohortComposite = composites.length > 0
        ? Math.round((composites.reduce((a, b) => a + b, 0) / composites.length) * 10) / 10
        : null;

      return NextResponse.json({
        cohortComposite,
        studentsWithProfile: composites.length,
        layerAverages,
      });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
