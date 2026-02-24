/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ABA PORTAL - Main Page
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⬡B:VESSEL:ABA.PORTAL:PAGE:v1.0.0:20260224⬡
 */

import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

const CONFIG = {
  REACH_URL: 'https://aba-reach.onrender.com',
  REACH_WS: 'wss://aba-reach.onrender.com/command-center',
};

const BRANDON_PROFILE = {
  user_id: 'brandon_sr',
  trust_level: 10,
  name: 'Brandon Pierce Sr.',
  vessel: 'ABA_PORTAL'
};

function useVoiceInput(onResult) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [onResult]);

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { isListening, startListening, stopListening, supported: !!recognitionRef.current };
}

function useCommandCenter() {
  const [status, setStatus] = useState('disconnected');
  const [events, setEvents] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(CONFIG.REACH_WS);
        ws.onopen = () => setStatus('connected');
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setEvents(prev => [...prev.slice(-50), { ...data, id: Date.now(), receivedAt: new Date().toISOString() }]);
          } catch (e) {}
        };
        ws.onclose = () => { setStatus('disconnected'); setTimeout(connect, 5000); };
        ws.onerror = () => setStatus('error');
        wsRef.current = ws;
      } catch (e) { setStatus('error'); }
    };
    connect();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  return { status, events };
}

export default function ABAPortal() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCC, setShowCC] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);
  const messagesEndRef = useRef(null);
  
  const { status: ccStatus, events: ccEvents } = useCommandCenter();
  const handleVoiceResult = (transcript) => setInput(prev => prev + ' ' + transcript);
  const voice = useVoiceInput(handleVoiceResult);

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch(`${CONFIG.REACH_URL}/api/pulse/status`);
      const data = await response.json();
      setSystemStatus(data);
    } catch (e) {}
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: userMessage, timestamp: new Date().toISOString() }]);

    try {
      const response = await fetch(`${CONFIG.REACH_URL}/api/router`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, ...BRANDON_PROFILE, timestamp: new Date().toISOString() })
      });
      const data = await response.json();
      setMessages(prev => [...prev, {
        id: Date.now(), role: 'assistant', content: data.response || data.error || 'No response from AIR',
        timestamp: new Date().toISOString(), trace: data.trace, agents: data.agents || [], missionNumber: data.missionNumber, source: data.source
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: `Connection error: ${error.message}. REACH may need wake-up.`, timestamp: new Date().toISOString(), isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const quickActions = [
    { label: '📊 Status', action: () => setInput('What is the status of all ABA systems?') },
    { label: '📧 Emails', action: () => setInput('Check my unread emails and summarize') },
    { label: '📅 Calendar', action: () => setInput("What's on my calendar today?") },
    { label: '🧠 Brain', action: () => setInput('Search brain for recent conversations') },
    { label: '📞 Call', action: () => setInput('Can you call Brandon?') }
  ];

  return (
    <>
      <Head>
        <title>ABA Portal</title>
        <meta name="description" content="ABA Portal - Direct REACH Vessel" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
        <div className={`flex flex-col ${showCC ? 'flex-1' : 'w-full'}`}>
          <header className="flex items-center justify-between p-4 border-b border-purple-500/30 bg-black/30 backdrop-blur">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-white font-bold text-xl">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ABA <span className="text-purple-400">Portal</span></h1>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-purple-300/70">T10 • Direct to REACH</span>
                  <span className={`px-1.5 py-0.5 rounded ${ccStatus === 'connected' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{ccStatus}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {systemStatus && <div className="text-xs text-purple-300/50">⬡ {Math.floor(systemStatus.uptime / 60)}m uptime</div>}
              <button onClick={() => setShowCC(!showCC)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${showCC ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                {showCC ? 'Hide CC' : 'Show CC'}
              </button>
            </div>
          </header>

          <div className="flex gap-2 p-3 border-b border-purple-500/20 bg-black/20 overflow-x-auto">
            {quickActions.map((action, i) => (
              <button key={i} onClick={action.action} className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg text-sm whitespace-nowrap transition-colors">{action.label}</button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/30">
                  <span className="text-white font-bold text-4xl">A</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-3">Welcome to ABA Portal</h2>
                <p className="text-purple-300/70 max-w-lg mb-6">You're connected directly to ABA's intelligence via REACH. No Claude.ai sessions. Full AIR routing. 79 agents at your service.</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />REACH Online</div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 text-purple-400 rounded-full"><span>⬡</span>T10 Access</div>
                </div>
                <p className="text-xs text-purple-400/40 mt-8">⬡B:VESSEL:ABA.PORTAL:v1.0.0:T10:20260224⬡</p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-5 py-4 ${msg.role === 'user' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : msg.isError ? 'bg-red-900/50 text-red-200 border border-red-500/30' : 'bg-slate-800/80 text-white border border-purple-500/20'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.trace && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs opacity-50 font-mono mb-2 truncate">{msg.trace}</p>
                      {msg.agents && msg.agents.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {msg.agents.slice(0, 10).map((agent, i) => <span key={i} className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded">{agent}</span>)}
                          {msg.agents.length > 10 && <span className="text-white/40 text-xs">+{msg.agents.length - 10}</span>}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs opacity-40 mt-2">{new Date(msg.timestamp).toLocaleTimeString()}{msg.missionNumber && ` • ${msg.missionNumber}`}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 border border-purple-500/20 rounded-2xl px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-purple-300/70 text-sm">AIR is processing your request...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-purple-500/30 bg-black/30 backdrop-blur">
            <div className="flex gap-3 items-end">
              {voice.supported && (
                <button onClick={voice.isListening ? voice.stopListening : voice.startListening} className={`p-3 rounded-xl transition-all ${voice.isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>🎤</button>
              )}
              <div className="flex-1 relative">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Message ABA..." className="w-full bg-slate-800/70 border border-purple-500/30 rounded-xl px-5 py-4 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500 resize-none" rows={1} disabled={isLoading} />
              </div>
              <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30">Send</button>
            </div>
          </div>
        </div>

        {showCC && (
          <div className="w-96 border-l border-purple-500/30 bg-black/20 flex flex-col">
            <div className="p-4 border-b border-purple-500/30">
              <h3 className="font-semibold text-white">Command Center</h3>
              <p className="text-xs text-purple-300/50">Live activity feed</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {ccEvents.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-8">Waiting for events...</div>
              ) : (
                ccEvents.map((event) => (
                  <div key={event.id} className="p-2 bg-slate-800/50 rounded-lg text-xs">
                    <div className="flex justify-between text-purple-300/50 mb-1">
                      <span className="uppercase font-semibold">{event.type}</span>
                      <span>{new Date(event.receivedAt).toLocaleTimeString()}</span>
                    </div>
                    <pre className="text-slate-300 whitespace-pre-wrap break-words">
                      {typeof event.data === 'object' ? JSON.stringify(event.data, null, 2).substring(0, 200) : String(event.data || event.service || '').substring(0, 200)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
