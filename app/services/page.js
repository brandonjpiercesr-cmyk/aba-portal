'use client';
import { useState, useEffect } from 'react';
import { Card, Stat, PageTitle, Loading, Btn, Tag, Empty, friendlyDate } from '../../components/UI';

export default function ServicesPage() {
  const [render, setRender] = useState([]);
  const [vercel, setVercel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/render').then(r => r.json()).catch(() => ({ services: [] })),
      fetch('/api/vercel').then(r => r.json()).catch(() => ({ projects: [] })),
    ]).then(([r, v]) => {
      setRender(r.services || r || []);
      setVercel(v.projects || v || []);
      setLoading(false);
    });
  }, []);

  const deploy = async (serviceId) => {
    setDeploying(serviceId);
    try {
      await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, action: 'deploy' })
      });
    } catch {}
    setTimeout(() => setDeploying(null), 3000);
  };

  if (loading) return <Loading text="Loading services..." />;

  const renderServices = Array.isArray(render) ? render : [];
  const vercelProjects = Array.isArray(vercel) ? vercel : [];

  return (
    <div className="fade-in">
      <PageTitle sub="Live status from Render and Vercel APIs">Services</PageTitle>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat value={renderServices.length} label="Render Services" color="text-cyan-400" />
        <Stat value={vercelProjects.length} label="Vercel Projects" color="text-white" />
        <Stat value={renderServices.filter(s => (s.service || s).suspended === 'not_suspended').length} label="Active" color="text-green-400" />
        <Stat value={renderServices.filter(s => (s.service || s).suspended !== 'not_suspended').length} label="Suspended" color="text-yellow-400" />
      </div>

      <Card title={`Render Services (${renderServices.length})`}>
        {renderServices.length === 0 ? <Empty text="No Render services found" /> : (
          <div className="space-y-0">
            {renderServices.map((item, i) => {
              const svc = item.service || item;
              const details = svc.serviceDetails || {};
              const url = details.url || svc.url || '';
              const isActive = svc.suspended === 'not_suspended';
              return (
                <div key={svc.id || i} className="border-b border-white/[0.03] last:border-0 py-3 px-1">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-green-400' : 'bg-yellow-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">{svc.name}</div>
                      {url && <a href={url} target="_blank" rel="noopener" className="text-[10px] text-purple hover:underline">{url}</a>}
                    </div>
                    <Tag variant={isActive ? 'ok' : 'warn'}>{isActive ? 'Active' : 'Suspended'}</Tag>
                    <Btn size="sm" onClick={() => deploy(svc.id)} disabled={deploying === svc.id}>
                      {deploying === svc.id ? 'Deploying...' : 'Deploy'}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {vercelProjects.length > 0 && (
        <Card title={`Vercel Projects (${vercelProjects.length})`}>
          <div className="space-y-0">
            {vercelProjects.slice(0, 30).map((proj, i) => {
              const p = proj.project || proj;
              return (
                <div key={p.id || i} className="border-b border-white/[0.03] last:border-0 py-2.5 px-1">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-white flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs text-white">{p.name}</span>
                      {p.link?.type && <span className="text-[10px] text-dim ml-2">{p.framework || ''}</span>}
                    </div>
                    <span className="text-[10px] text-dim">{p.updatedAt ? friendlyDate(p.updatedAt) : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
