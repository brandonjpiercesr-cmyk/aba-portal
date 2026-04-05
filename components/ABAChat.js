'use client';
import { useState, useRef, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, ADMIN_EMAILS } from '../lib/firebase';
import { ABACIA_URL } from '../lib/config';
import { ABALogoMedium, ABALogoLarge } from './ABAConsciousness';

// ═══════════════════════════════════════════════════════════
// T10 WARM AUTH GATE
// ═══════════════════════════════════════════════════════════
export function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);
  const [authCode, setAuthCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeError, setCodeError] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aoa_t10') : null;
    if (saved === 'verified') setCodeVerified(true);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && ADMIN_EMAILS.includes(u.email?.toLowerCase())) {
        setUser(u);
      } else if (u) {
        setError(u.email);
        signOut(auth);
        setUser(null);
      } else {
        setUser(null);
      }
      setChecking(false);
    });
    return unsub;
  }, []);

  // ⬡B:aoa.audit_fix:FIX:H9_iframe_auth_fallback:20260404⬡
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleSignIn = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      // If popup blocked (common in iframes), offer new tab fallback
      if (isIframe && (e.code === 'auth/popup-blocked' || e.code === 'auth/cancelled-popup-request' || e.message?.includes('popup'))) {
        setError('popup_blocked');
      } else {
        setError(e.message);
      }
    }
  };

  const verifyCode = async () => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode })
      });
      const data = await res.json();
      if (data.valid) {
        setCodeVerified(true);
        setCodeError(false);
        if (typeof window !== 'undefined') localStorage.setItem('aoa_t10', 'verified');
      } else {
        setCodeError(true);
      }
    } catch {
      setCodeError(true);
    }
  };

  if (checking) {
    return (
      <div className="auth-overlay">
        <div className="text-center">
          <div className="mx-auto mb-4 flex justify-center"><ABALogoMedium state="thinking" /></div>
          <p className="text-dim text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Step 1: Firebase sign-in
  if (!user) {
    return (
      <div className="auth-overlay">
        <div className="glass-card p-8 max-w-sm w-full mx-4 text-center glow-purple">
          <div className="mx-auto mb-5 flex justify-center"><ABALogoLarge state="idle" /></div>
          <h2 className="text-lg font-bold text-white mb-1">AOA Portal</h2>
          <p className="text-dim text-xs mb-6">Anatomy of ABA — Operator Command Center</p>
          <button onClick={handleSignIn}
            className="w-full py-2.5 rounded-lg bg-purple hover:bg-purple-deep text-white text-sm font-medium transition-all">
            Sign in with Google
          </button>
          {error === 'popup_blocked' && (
            <div className="mt-4">
              <p className="text-xs text-yellow-400/80 mb-2">Sign-in popup was blocked inside this window.</p>
              <a href="https://aba-portal.onrender.com" target="_blank" rel="noopener noreferrer"
                className="block w-full py-2.5 rounded-lg border border-purple/40 text-purple text-sm font-medium text-center hover:bg-purple/10 transition-all">
                Open AOA Portal in New Tab
              </a>
            </div>
          )}
          {error && error !== 'popup_blocked' && (
            <p className="mt-4 text-xs text-yellow-400/80">
              Hey, {error} — this area requires operator access. If you think you should have access, reach out to the team.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Step 2: T10 authorization code
  if (!codeVerified) {
    return (
      <div className="auth-overlay">
        <div className="glass-card p-8 max-w-sm w-full mx-4 text-center glow-purple">
          <div className="mx-auto mb-4 flex justify-center"><ABALogoMedium state="listening" /></div>
          <h2 className="text-base font-bold text-white mb-1">Hey {user.displayName?.split(' ')[0] || 'there'}</h2>
          <p className="text-dim text-xs mb-5">This area requires your authorization code.</p>
          <input
            type="password" placeholder="Enter code"
            value={authCode} onChange={e => { setAuthCode(e.target.value); setCodeError(false); }}
            onKeyDown={e => e.key === 'Enter' && verifyCode()}
            className="text-center mb-3 text-lg tracking-[0.3em]"
          />
          <button onClick={verifyCode}
            className="w-full py-2.5 rounded-lg bg-purple hover:bg-purple-deep text-white text-sm font-medium transition-all">
            Verify
          </button>
          {codeError && <p className="mt-3 text-xs text-red-400/80">That code is not right. Try again.</p>}
          <button onClick={() => { signOut(auth); setUser(null); }}
            className="mt-4 text-[10px] text-dim hover:text-white">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return children;
}

// ═══════════════════════════════════════════════════════════
// ABA CHAT PANEL (talks to real AIR)
// ═══════════════════════════════════════════════════════════
export function useABAChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text) => {
    if (!text?.trim()) return;
    const userMsg = { role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${ABACIA_URL}/api/air/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          // ⬡B:aoa.audit_fix:FIX:M15_chat_user_id:20260404⬡ Use authenticated user, not hardcoded
          user_id: auth.currentUser?.email || 'aoa_portal_user',
          channel: 'aoa_portal',
          context: { source: 'aoa_portal', admin: true }
        })
      });
      const data = await res.json();
      const abaMsg = { role: 'assistant', content: data.response || data.message || 'No response', ts: Date.now(), trace: data };
      setMessages(prev => [...prev, abaMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection issue: ${err.message}`, ts: Date.now() }]);
    }
    setLoading(false);
  };

  const openWithContext = (ctx) => {
    setOpen(true);
    if (ctx?.label) setInput(`Tell me about ${ctx.label}`);
  };

  return { open, setOpen, messages, input, setInput, loading, send, openWithContext };
}

export function ABAChatPanel({ chat }) {
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [chat.messages]);

  return (
    <>
      {/* Floating ABA button */}
      <button onClick={() => chat.setOpen(!chat.open)}
        className="fixed bottom-5 right-5 z-[80] w-12 h-12 rounded-full bg-purple hover:bg-purple-deep transition-all shadow-lg shadow-purple/20 flex items-center justify-center">
        <img src="https://i.imgur.com/0be7HCF.png" alt="ABA" className="w-7 h-7 rounded-full" />
      </button>

      {/* Panel */}
      <div className={`aba-panel ${chat.open ? 'open' : ''}`}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <img src="https://i.imgur.com/0be7HCF.png" alt="" className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <span className="text-sm font-semibold text-white">ABA</span>
            <span className="text-[9px] text-dim ml-2">via AIR</span>
          </div>
          <button onClick={() => chat.setOpen(false)} className="text-dim hover:text-white text-lg">&times;</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ height: 'calc(100vh - 120px)' }}>
          {chat.messages.length === 0 && (
            <div className="text-center text-dim text-xs py-12">
              <p className="mb-2">This is the real ABA, routed through AIR.</p>
              <p>Ask anything — costs, traces, agents, brain entries.</p>
            </div>
          )}
          {chat.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-purple/20 text-white'
                  : 'glass-subtle text-gray-200'
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
            </div>
          ))}
          {chat.loading && (
            <div className="flex justify-start">
              <div className="glass-subtle px-3 py-2 rounded-xl text-xs text-dim">ABA is thinking...</div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/[0.04] flex gap-2">
          <input value={chat.input} onChange={e => chat.setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && chat.send(chat.input)}
            placeholder="Ask ABA anything..." className="flex-1 text-sm" />
          <button onClick={() => chat.send(chat.input)} disabled={chat.loading || !chat.input?.trim()}
            className="px-3 py-1.5 rounded-lg bg-purple hover:bg-purple-deep text-white text-xs font-medium disabled:opacity-40 transition-all">
            Send
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// CONTEXT MENU
// ═══════════════════════════════════════════════════════════
export function ContextMenu({ x, y, itemLabel, onClose, onAskABA }) {
  if (x === null) return null;
  return (
    <>
      <div className="fixed inset-0 z-[99]" onClick={onClose} />
      <div className="ctx-menu" style={{ left: Math.min(x, window.innerWidth - 220), top: Math.min(y, window.innerHeight - 100) }}>
        <div className="ctx-item" onClick={onAskABA}>
          <span className="text-purple">⬡</span> Ask ABA about {itemLabel || 'this'}
        </div>
        <div className="ctx-item" onClick={() => { navigator.clipboard.writeText(itemLabel || ''); onClose(); }}>
          <span className="text-dim">◫</span> Copy
        </div>
      </div>
    </>
  );
}
