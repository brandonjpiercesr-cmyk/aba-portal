'use client';
import { useState, useRef, useEffect } from 'react';

// 🦄 RIGHT-CLICK TO TALK TO ABA
// This sends directly to AIR via abacia-services
export function useABAChat() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  function openWithContext(ctx) {
    setContext(ctx);
    setOpen(true);
    setMessages([{ role: 'system', text: `You are looking at: ${ctx?.type || 'item'} - ${ctx?.label || ctx?.id || 'unknown'}` }]);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const contextStr = context ? `\n\nCONTEXT: The admin is looking at ${context.type}: ${context.label || ''}. Data: ${JSON.stringify(context.data || {}).slice(0, 500)}` : '';
      const r = await fetch('/api/abacia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg + contextStr,
          user_id: 'brandon',
          channel: 'aoa_portal'
        })
      });
      const data = await r.json();
      setMessages(prev => [...prev, { role: 'aba', text: data.response || data.error || 'No response' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'aba', text: 'Error: ' + e.message }]);
    }
    setLoading(false);
  }

  return { open, setOpen, context, openWithContext, messages, input, setInput, send, loading };
}

export function ABAChatPanel({ chat }) {
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat.messages]);

  return (
    <div className={`aba-panel ${chat.open ? 'open' : ''}`}>
      <div className="p-4 border-b border-border flex justify-between items-center">
        <div>
          <h2 className="text-sm font-bold text-white">Talk to ABA</h2>
          {chat.context && <p className="text-[10px] text-dim mt-0.5">Context: {chat.context.type} - {chat.context.label}</p>}
        </div>
        <button onClick={() => chat.setOpen(false)} className="text-dim hover:text-white text-lg">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100vh - 130px)' }}>
        {chat.messages.filter(m => m.role !== 'system').map((m, i) => (
          <div key={i} className={`${m.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block max-w-[85%] px-3 py-2 rounded-lg text-xs ${
              m.role === 'user' ? 'bg-accent/20 text-white' : 'bg-white/5 text-gray-300'
            }`}>
              {m.role === 'aba' && <span className="text-accent font-semibold">ABA: </span>}
              {m.text}
            </div>
          </div>
        ))}
        {chat.loading && <div className="text-dim text-xs">ABA is thinking...</div>}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <input className="flex-1" placeholder="Ask ABA anything..." value={chat.input}
          onChange={e => chat.setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && chat.send()} />
        <button onClick={chat.send} disabled={chat.loading}
          className="px-3 py-1.5 bg-accent text-white rounded text-xs font-medium hover:bg-indigo-600 disabled:opacity-40">Send</button>
      </div>
    </div>
  );
}

// Context menu for right-click
export function ContextMenu({ x, y, onClose, onAskABA, itemLabel }) {
  if (x === null) return null;
  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div className="ctx-menu" style={{ left: x, top: y }}>
        <div className="ctx-item" onClick={onAskABA}>
          <span>🦄</span> <span>Ask ABA about this</span>
        </div>
        <div className="ctx-item text-dim" onClick={onClose}>
          <span>✕</span> <span>Close</span>
        </div>
      </div>
    </>
  );
}

// Auth gate
export function AuthGate({ children }) {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('aoa_auth') : null;
    if (stored === 'true') setAuthed(true);
    setChecking(false);
  }, []);

  function tryAuth() {
    // Simple PIN auth for now. Can upgrade to Firebase later.
    if (pin === '8116' || pin === '0316') {
      setAuthed(true);
      if (typeof window !== 'undefined') sessionStorage.setItem('aoa_auth', 'true');
    }
  }

  if (checking) return null;
  if (authed) return children;

  return (
    <div className="auth-overlay">
      <div className="glass-card p-8 w-80 text-center">
        <h1 className="text-xl font-bold text-white mb-1"><span className="text-accent">AOA</span> Portal</h1>
        <p className="text-dim text-xs mb-6">Admin Operations for ABA</p>
        <input type="password" placeholder="Enter PIN" value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tryAuth()}
          className="text-center text-lg mb-3" autoFocus />
        <button onClick={tryAuth} className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-indigo-600">Enter</button>
      </div>
    </div>
  );
}
