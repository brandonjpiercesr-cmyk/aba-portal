'use client';
import { useState, useRef, useEffect } from 'react';
import { PageTitle, Loading, Btn, Tag } from '../../components/UI';
import { ABACIA_URL } from '../../lib/config';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: text, ts: Date.now() }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${ABACIA_URL}/api/air/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user_id: 'brandon',
          channel: 'aoa_portal',
          context: { source: 'aoa_portal_chat_page', admin: true, t10: true }
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.message || 'No response',
        ts: Date.now(),
        meta: {
          agents: data.agents_used || data.agents || [],
          tools: data.tools_used || data.tools || [],
          model: data.model,
          tokens: data.total_tokens || data.tokens,
          duration: data.duration_ms || data.duration,
        }
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Connection error: ${err.message}`, ts: Date.now() }]);
    }
    setLoading(false);
  };

  return (
    <div className="fade-in flex flex-col" style={{ height: 'calc(100vh - 100px)' }}>
      <PageTitle sub="The real ABA, routed through AIR. Admin commands enabled.">ABA Chat</PageTitle>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <img src="https://i.imgur.com/0be7HCF.png" alt="" className="w-20 h-20 mx-auto mb-4 rounded-full opacity-60" />
            <p className="text-dim text-sm mb-2">This is the real ABA.</p>
            <p className="text-dim/60 text-xs">Same ABA that answers calls and processes emails. In this context, she knows she is in the AOA Portal and can execute admin commands.</p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {['What did ABA cost today?', 'Show recent errors', 'Which agents are audited?', 'Check kill switch status'].map(q => (
                <button key={q} onClick={() => { setInput(q); }} className="glass-subtle px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:border-purple/30 transition-all cursor-pointer">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${msg.role === 'user' ? '' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <img src="https://i.imgur.com/0be7HCF.png" alt="" className="w-5 h-5 rounded-full" />
                  <span className="text-[10px] text-purple font-semibold">ABA</span>
                </div>
              )}
              <div className={`px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-purple/20 text-white rounded-br-sm'
                  : 'glass-card text-gray-200 rounded-bl-sm'
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
              {msg.meta && (msg.meta.agents?.length > 0 || msg.meta.tools?.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-1 px-1">
                  {msg.meta.agents?.map((a, j) => <Tag key={j} variant="info">{a}</Tag>)}
                  {msg.meta.tools?.map((t, j) => <Tag key={j} variant="dim">{t}</Tag>)}
                  {msg.meta.tokens && <span className="text-[9px] text-dim">{msg.meta.tokens.toLocaleString()} tokens</span>}
                  {msg.meta.duration && <span className="text-[9px] text-dim">{(msg.meta.duration / 1000).toFixed(1)}s</span>}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2">
              <img src="https://i.imgur.com/0be7HCF.png" alt="" className="w-5 h-5 rounded-full" />
              <div className="glass-subtle px-4 py-2 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-purple rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-3 border-t border-white/[0.04]">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask ABA anything — costs, traces, agents, admin commands..."
          className="flex-1 text-sm py-3" />
        <Btn variant="primary" size="md" onClick={send} disabled={loading || !input.trim()}>Send</Btn>
      </div>
    </div>
  );
}
