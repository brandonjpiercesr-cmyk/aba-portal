'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag } from '../../components/UI';

export default function CostPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() { setLoading(true); const d = await fetch('/api/cost').then(r => r.json()); setData(d); setLoading(false); }
  useEffect(() => { load(); }, []);

  if (loading || !data) return <Loading />;

  return (<div>
    <PageTitle right={<Btn onClick={load}>Refresh</Btn>}>Cost Dashboard</PageTitle>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-5">
      <Stat value={data.anthropic?.est_daily_cost || '$0'} label="Anthropic Est/Day" tooltip={`${data.anthropic?.daily_calls || 0} AIR calls today`} />
      <Stat value={data.anthropic?.est_weekly_cost || '$0'} label="Anthropic Est/Week" tooltip={`${data.anthropic?.weekly_calls || 0} AIR calls this week`} />
      <Stat value={data.elevenlabs?.vara_calls_24h || 0} label="VARA Calls 24h" tooltip="ElevenLabs voice calls" />
      <Stat value={data.nylas?.emails_24h || 0} label="Emails Sent 24h" tooltip="Nylas email sends" />
    </div>

    <Card title="Anthropic (Biggest Cost)">
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="text-dim mb-1">Daily AIR Calls</div>
          <div className="text-white text-2xl font-bold">{(data.anthropic?.daily_calls || 0).toLocaleString()}</div>
          <div className="text-dim mt-1">Est: {data.anthropic?.est_daily_cost}</div>
        </div>
        <div>
          <div className="text-dim mb-1">Weekly AIR Calls</div>
          <div className="text-white text-2xl font-bold">{(data.anthropic?.weekly_calls || 0).toLocaleString()}</div>
          <div className="text-dim mt-1">Est: {data.anthropic?.est_weekly_cost}</div>
        </div>
      </div>
      <div className="mt-4 glass-card p-3">
        <div className="text-xs font-semibold text-white mb-2">911 Cost Fix Model Split</div>
        <table><thead><tr><th>Use Case</th><th>Model</th><th>Cost</th></tr></thead>
        <tbody>
          <tr><td>Direct ABA chat + tool use</td><td className="text-white">Claude Sonnet 4.6</td><td className="text-yellow-400">Paid</td></tr>
          <tr><td>Background loops (heartbeat, proactive, ERICA)</td><td className="text-white">Gemini Flash</td><td className="text-green-400">FREE</td></tr>
          <tr><td>Voice (VARA via ElevenLabs)</td><td className="text-white">Gemini Flash</td><td className="text-green-400">Included</td></tr>
          <tr><td>Backup chat (if Anthropic down)</td><td className="text-white">Groq</td><td className="text-yellow-400">Cheap</td></tr>
          <tr><td>Web research</td><td className="text-white">Perplexity</td><td className="text-yellow-400">Paid</td></tr>
        </tbody></table>
      </div>
    </Card>

    <div className="grid grid-cols-2 gap-4">
      <Card title="Supabase (Brain)">
        <div className="text-xs"><span className="text-white text-lg font-bold">{(data.supabase?.writes_24h || 0).toLocaleString()}</span> writes in 24h</div>
        <div className="text-dim text-xs mt-1">{data.supabase?.note}</div>
      </Card>
      <Card title="Proactive Cron">
        <div className="text-xs"><span className="text-white text-lg font-bold">{data.cron?.runs_24h || 0}</span> cron runs in 24h</div>
        <div className="text-dim text-xs mt-1">{data.cron?.note}</div>
      </Card>
    </div>
  </div>);
}
