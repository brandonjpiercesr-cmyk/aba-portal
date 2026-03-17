'use client';
import { useState, useRef, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, ADMIN_EMAILS } from '../lib/firebase';

// ═══════════════════════════════════════════════════════════
// FIREBASE AUTH GATE
// ═══════════════════════════════════════════════════════════
export function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && ADMIN_EMAILS.includes(u.email?.toLowerCase())) {
        setUser(u);
      } else if (u) {
        setError('Access denied. ' + u.email + ' is not an authorized admin.');
        signOut(auth);
        setUser(null);
      } else {
        setUser(null);
      }
      setChecking(false);
    });
    return () => unsub();
  }, []);

  async function handleSignIn() {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!ADMIN_EMAILS.includes(result.user.email?.toLowerCase())) {
        setError('Access denied. ' + result.user.email + ' is not an authorized admin.');
        await signOut(auth);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  if (checking) return null;
  if (user) return <>{children}</>;

  return (
    <div className="auth-overlay">
      <div className="glass-card p-8 w-96 text-center">
        <h1 className="text-xl font-bold text-white mb-1"><span className="text-accent">AOA</span> Portal</h1>
        <p className="text-dim text-xs mb-6">Admin Operations for ABA</p>
        <button onClick={handleSignIn}
          className="w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium border border-white/10 transition-all flex items-center justify-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Sign in with Google
        </button>
        {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
        <p className="text-dim text-[10px] mt-6">Restricted to authorized admins only</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🦄 RIGHT-CLICK TO TALK TO ABA
// ═══════════════════════════════════════════════════════════
export function useABAChat() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  function openWithContext(ctx) {
    setContext(ctx);
    setOpen(true);
    setMessages([{ role: 'system', text: `Looking at: ${ctx?.type || 'item'} - ${ctx?.label || ''}` }]);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const contextStr = context ? `\n\nCONTEXT: Admin is looking at ${context.type}: ${context.label || ''}. Data: ${JSON.stringify(context.data || {}).slice(0, 500)}` : '';
      const r = await fetch('/api/abacia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg + contextStr, user_id: 'brandon', channel: 'aoa_portal' })
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
          <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
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
export function ContextMenu({ x, y, onClose, onAskABA }) {
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
