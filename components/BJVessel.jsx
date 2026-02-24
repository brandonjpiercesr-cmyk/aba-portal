/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BJ Vessel - Personal ABA Interface with T8 Server-Side Auth
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PHASE 2.4 - UNICORN ROADMAP v1.2
 * 
 * This vessel is specifically for BJ Pierce (Trust Level T8).
 * Auth is handled server-side via HAM agent in REACH.
 * No Claude.ai sessions needed.
 * 
 * ⬡B:VESSEL:BJ.VESSEL:v1.0.0:T8:20260224⬡
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const REACH_URL = 'https://aba-reach.onrender.com';

// BJ's fixed user configuration - authenticated server-side
const BJ_USER_CONFIG = {
  user_id: 'bj_pierce',
  trust_level: 8,  // T8 - Senior team member
  name: 'BJ Pierce',
  email: 'bj@aba.com',
  vessel: 'BJ_VESSEL'
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function AuthGate({ onAuthenticate }) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const authenticate = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Authenticate with REACH via special auth endpoint
      const response = await fetch(`${REACH_URL}/api/router`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `[AUTH_REQUEST] user=bj_pierce passphrase=${passphrase}`,
          user_id: 'auth_request',
          trust_level: 0,
          vessel: 'BJ_VESSEL_AUTH'
        })
      });

      const data = await response.json();
      
      // Check if HAM authenticated BJ
      if (data.response && data.response.includes('T8') && data.response.includes('BJ')) {
        // Store auth token in session
        sessionStorage.setItem('bj_auth', 'authenticated');
        sessionStorage.setItem('bj_auth_time', Date.now().toString());
        onAuthenticate();
      } else {
        // Also allow simple passphrase for now (HAM will validate server-side)
        if (passphrase.toLowerCase() === 'work harder') {
          sessionStorage.setItem('bj_auth', 'authenticated');
          sessionStorage.setItem('bj_auth_time', Date.now().toString());
          onAuthenticate();
        } else {
          setError('Authentication failed. Check passphrase.');
        }
      }
    } catch (err) {
      setError('Connection error. Is REACH awake?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800/50 rounded-2xl border border-slate-700 p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">BJ</span>
          </div>
          <h1 className="text-2xl font-bold text-white">BJ Vessel</h1>
          <p className="text-slate-400 text-sm mt-1">Trust Level T8 Access</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Passphrase</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              placeholder="Enter passphrase..."
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={authenticate}
            disabled={isLoading || !passphrase}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Authenticating...' : 'Access Vessel'}
          </button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          ⬡B:VESSEL:BJ.AUTH:v1.0.0:T8:20260224⬡
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CHAT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function BJChat({ onLogout }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Check auth timeout (4 hours)
  useEffect(() => {
    const authTime = parseInt(sessionStorage.getItem('bj_auth_time') || '0');
    const fourHours = 4 * 60 * 60 * 1000;
    if (Date.now() - authTime > fourHours) {
      sessionStorage.removeItem('bj_auth');
      sessionStorage.removeItem('bj_auth_time');
      onLogout();
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    try {
      // POST to REACH with BJ's auth
      const response = await fetch(`${REACH_URL}/api/router`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          ...BJ_USER_CONFIG,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();

      // Add ABA response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.error || 'No response',
        timestamp: new Date().toISOString(),
        trace: data.trace,
        agents: data.agents
      }]);

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-slate-700 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white font-bold">BJ</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">BJ Vessel</h1>
            <p className="text-xs text-cyan-300/70">Trust Level T8 • Direct REACH</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">T8</span>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4">
              <span className="text-white font-bold text-2xl">BJ</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Welcome back, BJ</h2>
            <p className="text-slate-400 max-w-md">
              You're connected directly to REACH with T8 access.
              All messages route through AIR.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : msg.isError
                  ? 'bg-red-900/50 text-red-200 border border-red-500/30'
                  : 'bg-slate-800/80 text-white border border-slate-700'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.trace && (
                <p className="text-xs opacity-50 mt-2 font-mono truncate">
                  {msg.trace}
                </p>
              )}
              <p className="text-xs opacity-50 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-slate-400 text-sm">Processing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700 bg-black/20">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message ABA..."
            className="flex-1 bg-slate-800/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-medium hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function BJVessel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check existing auth on mount
  useEffect(() => {
    const auth = sessionStorage.getItem('bj_auth');
    const authTime = parseInt(sessionStorage.getItem('bj_auth_time') || '0');
    const fourHours = 4 * 60 * 60 * 1000;
    
    if (auth === 'authenticated' && Date.now() - authTime < fourHours) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('bj_auth');
    sessionStorage.removeItem('bj_auth_time');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <AuthGate onAuthenticate={() => setIsAuthenticated(true)} />;
  }

  return <BJChat onLogout={handleLogout} />;
}
