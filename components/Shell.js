'use client';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import AnimatedBackground, { BgProvider, BackgroundPicker } from './Background';
import AlertBanner from './AlertBanner';
import { AuthGate, ABAChatPanel, useABAChat, ContextMenu } from './ABAChat';
import { ABACIA_URL } from '../lib/config';

export default function Shell({ children }) {
  const chat = useABAChat();
  const [ctxMenu, setCtxMenu] = useState({ x: null, y: null, item: null });
  const [mobileNav, setMobileNav] = useState(false);

  // ⬡B:aoa.audit_fix:FIX:L14_shell_keepalive:20260404⬡
  // Keep-alive ping — hits ABAbase every 4 minutes while portal is open
  useEffect(() => {
    const ping = () => fetch(`${ABACIA_URL}/health`, { mode: 'no-cors' }).catch(() => {});
    ping(); // immediate
    const iv = setInterval(ping, 4 * 60 * 1000); // every 4 minutes
    return () => clearInterval(iv);
  }, []);

  function handleContextMenu(e) {
    const target = e.target.closest('[data-aba-ctx]');
    if (target) {
      e.preventDefault();
      // ⬡B:aoa.audit_fix:FIX:L15_json_parse_guard:20260404⬡
      try {
        const ctx = JSON.parse(target.dataset.abaCtx || '{}');
        setCtxMenu({ x: e.clientX, y: e.clientY, item: ctx });
      } catch { /* malformed context data, ignore */ }
    }
  }

  return (
    <AuthGate>
      <BgProvider>
        <AnimatedBackground />
        <BackgroundPicker />
        <div className="flex min-h-screen relative z-[1]" onContextMenu={handleContextMenu}>
          <Sidebar />
          {mobileNav && <Sidebar mobile onClose={() => setMobileNav(false)} />}
          <main className="flex-1 overflow-y-auto min-h-screen">
            <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] bg-[rgba(15,23,42,0.8)] backdrop-blur-xl sticky top-0 z-30">
              <button onClick={() => setMobileNav(true)} className="text-white text-lg">☰</button>
              <img src="https://i.imgur.com/0be7HCF.png" alt="" className="w-6 h-6 rounded-full" />
              <span className="text-sm font-semibold text-white"><span className="text-purple">AOA</span> Portal</span>
            </div>
            <div className="p-4 md:p-6">
              <AlertBanner />
              {children}
            </div>
          </main>
          <ABAChatPanel chat={chat} />
          <ContextMenu x={ctxMenu.x} y={ctxMenu.y} itemLabel={ctxMenu.item?.label}
            onClose={() => setCtxMenu({ x: null, y: null, item: null })}
            onAskABA={() => { chat.openWithContext(ctxMenu.item); setCtxMenu({ x: null, y: null, item: null }); }} />
        </div>
      </BgProvider>
    </AuthGate>
  );
}
