'use client';
// ⬡B:aoa.layered_dashboard:CREATE:page_component:20260425⬡
// AOA LAYERED Dashboard — admin view of GMG University LAYERED behavioral assessment.
// Shows the cohort roster (each student's composite score, layer breakdown, completed
// days, last activity) plus a per-student detail modal with day-by-day grading history.
//
// Reads from /api/layered (this portal's route, which queries Supabase aba_memory).
// Read-only view. No writes from this surface — grading happens via the GMG-U
// /api/gmg-university/analyze backend pipeline triggered by voice transcripts.
//
// Data sources (per legacy bootstrap GMG-U section):
//   gmg_progress (memory_type)       — completedDays, xp, cohort, track, role
//   layered_assessment (memory_type) — per-day grading JSON (composite + 7 layer scores)
//   layered_profile.{email}          — cumulative profile (composite + layer averages)

import { useState, useEffect, useCallback } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Modal, Empty, friendlyDate, timeAgo } from '../../components/UI';

// LAYERED's 7 layers, in canonical order (per We Are Layered to the Core master v2)
const LAYER_ORDER = ['identity', 'awareness', 'yielding', 'engagement', 'resilience', 'ethics', 'devotion'];
// ⬡B:aoa.layered_dashboard:FIX:core_signals_quadrants:20260425⬡
// LAYERED's 4 core signal quadrants from the actual grading engine output
// (verified via live data 2026-04-25). Each scored 1-10.
const CORE_SIGNAL_ORDER = ['controller', 'operator', 'regulator', 'enforcer'];

function scoreColor(s) {
  if (s == null) return 'dim';
  if (s >= 8) return 'ok';
  if (s >= 6) return 'info';
  if (s >= 4) return 'warn';
  return 'err';
}

function LayerBar({ name, score, max = 10 }) {
  if (score == null) {
    return (
      <div className="flex items-center gap-2 text-xs text-dim">
        <span className="w-20 capitalize">{name}</span>
        <span className="italic">no data</span>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  const color = scoreColor(score);
  const colorClass = {
    ok: 'bg-emerald-500',
    info: 'bg-blue-500',
    warn: 'bg-amber-500',
    err: 'bg-rose-500',
    dim: 'bg-gray-500',
  }[color];
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 capitalize text-gray-300">{name}</span>
      <div className="flex-1 h-2 bg-white/[0.06] rounded overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: pct + '%' }} />
      </div>
      <span className={`w-10 text-right font-mono`}>
        <Tag variant={color}>{score.toFixed ? score.toFixed(1) : score}</Tag>
      </span>
    </div>
  );
}

export default function LayeredPage() {
  const [roster, setRoster] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, o] = await Promise.all([
        fetch('/api/layered?action=roster').then(res => res.json()),
        fetch('/api/layered?action=overview').then(res => res.json()),
      ]);
      setRoster(r.roster || []);
      setOverview(o || null);
    } catch (e) {
      console.error('[AOA LAYERED] load error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openStudent = async (email) => {
    setSelected(email);
    setDetailLoading(true);
    setStudentDetail(null);
    try {
      const r = await fetch('/api/layered?action=student&email=' + encodeURIComponent(email));
      const d = await r.json();
      setStudentDetail(d);
    } catch (e) {
      console.error('[AOA LAYERED] student detail error:', e);
    }
    setDetailLoading(false);
  };

  const closeStudent = () => {
    setSelected(null);
    setStudentDetail(null);
  };

  const filtered = roster.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.email || '').toLowerCase().includes(q)
      || (s.name || '').toLowerCase().includes(q)
      || (s.gmg_track || '').toLowerCase().includes(q)
      || (s.cohort_type || '').toLowerCase().includes(q);
  });

  return (
    <div>
      <PageTitle right={<>
        <Btn onClick={load}>Refresh</Btn>
        <span className="text-dim text-xs">{roster.length} students</span>
      </>} sub="Behavioral assessment grading from GMG University voice conversations">
        LAYERED Dashboard
      </PageTitle>

      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Stat
            value={overview.cohortComposite != null ? overview.cohortComposite.toFixed(1) : '—'}
            label="Cohort Composite"
            color={scoreColor(overview.cohortComposite)}
            sub={(overview.studentsWithProfile || 0) + ' graded'}
          />
          <Stat
            value={roster.length}
            label="Active Students"
            color="info"
          />
          <Stat
            value={roster.reduce((acc, s) => acc + (s.assessmentCount || 0), 0)}
            label="Total Assessments"
            color="info"
          />
          <Stat
            value={roster.reduce((acc, s) => acc + (s.completedDays || 0), 0)}
            label="Days Completed"
            color="info"
          />
        </div>
      )}

      {overview && (overview.signalAverages || overview.layerAverages) && (
        Object.keys(overview.signalAverages || {}).length > 0 ? (
          <Card title="Cohort Core Signal Averages (Controller / Operator / Regulator / Enforcer)" className="mb-4">
            <div className="space-y-1.5">
              {CORE_SIGNAL_ORDER.filter(l => l in overview.signalAverages).map(l =>
                <LayerBar key={l} name={l} score={overview.signalAverages[l]} />
              )}
            </div>
          </Card>
        ) : Object.keys(overview.layerAverages || {}).length > 0 ? (
          <Card title="Cohort Layer Averages" className="mb-4">
            <div className="space-y-1.5">
              {LAYER_ORDER.filter(l => l in overview.layerAverages).map(l =>
                <LayerBar key={l} name={l} score={overview.layerAverages[l]} />
              )}
            </div>
          </Card>
        ) : null
      )}

      <div className="flex gap-2 mb-3">
        <input
          className="flex-1"
          placeholder="Search by email, name, track, or cohort..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card title={`Student Roster (${filtered.length})`}>
        {loading ? <Loading /> : filtered.length === 0 ? <Empty text="No students found" /> : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Cohort</th>
                  <th>Track</th>
                  <th>Composite</th>
                  <th>Days</th>
                  <th>XP</th>
                  <th>Assessments</th>
                  <th>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr
                    key={s.email}
                    className="cursor-pointer hover:bg-white/[0.03]"
                    onClick={() => openStudent(s.email)}
                    data-aba-ctx={JSON.stringify({
                      type: 'layered_student',
                      label: (s.name || s.email) + ' LAYERED',
                      data: { email: s.email, composite: s.profileScore, days: s.completedDays }
                    })}
                  >
                    <td className="font-mono text-xs max-w-[200px] truncate text-white">{s.email}</td>
                    <td className="text-gray-300">{s.name || '—'}</td>
                    <td>{s.cohort_type ? <Tag variant="info">{s.cohort_type}</Tag> : <span className="text-dim">—</span>}</td>
                    <td>{s.gmg_track ? <Tag variant="dim">{s.gmg_track}</Tag> : <span className="text-dim">—</span>}</td>
                    <td>
                      {s.profileScore != null
                        ? <Tag variant={scoreColor(s.profileScore)}>{s.profileScore.toFixed(1)}</Tag>
                        : <span className="text-dim">—</span>}
                    </td>
                    <td className="font-mono text-xs">{s.completedDays || 0}</td>
                    <td className="font-mono text-xs">{s.xp || 0}</td>
                    <td className="font-mono text-xs">{s.assessmentCount || 0}</td>
                    <td className="text-xs text-dim">{s.lastActivity ? timeAgo(s.lastActivity) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={closeStudent} title={selected ? `LAYERED Profile — ${selected}` : ''} wide>
        {detailLoading ? <Loading /> : !studentDetail ? <Empty text="No data" /> : (
          <div className="space-y-4">
            {/* Profile Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat
                value={studentDetail.profile.composite != null ? studentDetail.profile.composite.toFixed(1) : '—'}
                label="Composite Score"
                color={scoreColor(studentDetail.profile.composite)}
              />
              <Stat
                value={studentDetail.progress.completedDays.length}
                label="Days Completed"
                color="info"
              />
              <Stat
                value={studentDetail.progress.xp || 0}
                label="XP"
                color="info"
              />
              <Stat
                value={studentDetail.assessmentCount}
                label="Assessments"
                color="info"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div><span className="text-dim">Cohort:</span> <span className="text-gray-200">{studentDetail.progress.cohort_type || '—'}</span></div>
              <div><span className="text-dim">Track:</span> <span className="text-gray-200">{studentDetail.progress.gmg_track || '—'}</span></div>
              <div><span className="text-dim">Role:</span> <span className="text-gray-200">{studentDetail.progress.role || '—'}</span></div>
              <div><span className="text-dim">Last Activity:</span> <span className="text-gray-200">{studentDetail.progress.lastActivity ? friendlyDate(studentDetail.progress.lastActivity) : '—'}</span></div>
            </div>

            {/* Cumulative Profile — show core_signals (current shape), fall back to layers */}
            {studentDetail.profile.signals && Object.keys(studentDetail.profile.signals).length > 0 && (
              <Card title="Cumulative Core Signals">
                <div className="space-y-1.5">
                  {CORE_SIGNAL_ORDER.filter(l => l in studentDetail.profile.signals).map(l =>
                    <LayerBar key={l} name={l} score={studentDetail.profile.signals[l]} />
                  )}
                </div>
                {studentDetail.profile.updatedAt && (
                  <div className="text-[10px] text-dim mt-2">Updated {timeAgo(studentDetail.profile.updatedAt)}</div>
                )}
              </Card>
            )}
            {studentDetail.profile.layers && Object.keys(studentDetail.profile.layers).length > 0 && (
              <Card title="Cumulative Layer Profile">
                <div className="space-y-1.5">
                  {LAYER_ORDER.filter(l => l in studentDetail.profile.layers).map(l =>
                    <LayerBar key={l} name={l} score={studentDetail.profile.layers[l]} />
                  )}
                </div>
              </Card>
            )}

            {/* Day-by-Day Assessments */}
            <Card title={`Day-by-Day Assessments (${studentDetail.assessments.length})`}>
              {studentDetail.assessments.length === 0 ? (
                <div className="text-dim text-xs py-2">No assessments yet. Grading runs after each LAYERED voice conversation.</div>
              ) : (
                <div className="space-y-2">
                  {studentDetail.assessments.map((a, idx) => (
                    <div key={a.source} className="border border-white/[0.06] rounded p-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="text-sm font-semibold text-white">Day {a.day || '?'}</div>
                          <div className="text-[10px] text-dim">{friendlyDate(a.createdAt)}</div>
                        </div>
                        <div>
                          {a.composite != null ? (
                            <Tag variant={scoreColor(a.composite)}>{a.composite.toFixed(1)}</Tag>
                          ) : (
                            <Tag variant="dim">—</Tag>
                          )}
                        </div>
                      </div>
                      {a.summary && (
                        <div className="text-xs text-gray-300 mb-2 italic">{a.summary}</div>
                      )}
                      {a.signals && Object.keys(a.signals).length > 0 && (
                        <div className="space-y-1 mb-2">
                          <div className="text-[10px] uppercase tracking-wider text-dim mb-1">Core Signals</div>
                          {CORE_SIGNAL_ORDER.filter(l => l in a.signals).map(l =>
                            <LayerBar key={l} name={l} score={a.signals[l]} />
                          )}
                        </div>
                      )}
                      {a.layers && Object.keys(a.layers).length > 0 && (
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-dim mb-1">Layers</div>
                          {LAYER_ORDER.filter(l => l in a.layers).map(l =>
                            <LayerBar key={l} name={l} score={a.layers[l]} />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
}
