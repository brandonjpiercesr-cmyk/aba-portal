'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';
import AnimatedBackground from './Background';
import { AuthGate, ABAChatPanel, useABAChat, ContextMenu } from './ABAChat';

export default function Shell({ children }) {
  const chat = useABAChat();
  const [ctxMenu, setCtxMenu] = useState({ x: null, y: null, item: null });
  const [mobileNav, setMobileNav] = useState(false);

  function handleContextMenu(e) {
    const target = e.target.closest('[data-aba-ctx]');
    if (target) {
      e.preventDefault();
      const ctx = JSON.parse(target.dataset.abaCtx || '{}');
      setCtxMenu({ x: e.clientX, y: e.clientY, item: ctx });
    }
  }

  return (
    <AuthGate>
      <AnimatedBackground />
      <div className="flex min-h-screen relative z-[1]" onContextMenu={handleContextMenu}>
        {/* Desktop sidebar */}
        <Sidebar />

        {/* Mobile sidebar overlay */}
        {mobileNav && <Sidebar mobile onClose={() => setMobileNav(false)} />}

        <main className="flex-1 overflow-y-auto min-h-screen">
          {/* Mobile top bar */}
          <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] bg-[rgba(15,23,42,0.8)] backdrop-blur-xl sticky top-0 z-30">
            <button onClick={() => setMobileNav(true)} className="text-white text-lg">☰</button>
            <img src="https://i.imgur.com/0be7HCF.png" alt="" className="w-6 h-6 rounded-full" />
            <span className="text-sm font-semibold text-white"><span className="text-purple">AOA</span> Portal</span>
          </div>

          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>

        <ABAChatPanel chat={chat} />
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} itemLabel={ctxMenu.item?.label}
          onClose={() => setCtxMenu({ x: null, y: null, item: null })}
          onAskABA={() => { chat.openWithContext(ctxMenu.item); setCtxMenu({ x: null, y: null, item: null }); }} />
      </div>
    </AuthGate>
  );
}
