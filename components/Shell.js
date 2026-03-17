'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';
import AnimatedBackground from './Background';
import AlertBanner from './AlertBanner';
import { AuthGate, ABAChatPanel, useABAChat, ContextMenu } from './ABAChat';

export default function Shell({ children }) {
  const chat = useABAChat();
  const [ctxMenu, setCtxMenu] = useState({ x: null, y: null, item: null });

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
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-5 min-h-screen">
          <AlertBanner />
          {children}
        </main>
        <ABAChatPanel chat={chat} />
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} itemLabel={ctxMenu.item?.label}
          onClose={() => setCtxMenu({ x: null, y: null, item: null })}
          onAskABA={() => { chat.openWithContext(ctxMenu.item); setCtxMenu({ x: null, y: null, item: null }); }} />
      </div>
    </AuthGate>
  );
}
