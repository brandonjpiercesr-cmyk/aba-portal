/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OneABA3 - Standalone Vessel for ABA
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PHASE 2.1 - UNICORN ROADMAP v1.2
 * 
 * This vessel sends all messages directly to REACH router at:
 * https://aba-reach.onrender.com/api/router
 * 
 * No Claude.ai dependency. Full AIR routing.
 * 
 * ⬡B:VESSEL:ONEABA3:v3.0.0:20260224⬡
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════
const REACH_URL = 'https://aba-reach.onrender.com';
const SUPABASE_URL = 'https://htlxjkbrstpwwtzsbyvb.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0bHhqa2Jyc3Rwd3d0enNieXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1MzI4MjEsImV4cCI6MjA4NjEwODgyMX0.MOgNYkezWpgxTO3ZHd0omZ0WLJOOR-tL7hONXWG9eBw';

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function OneABA3() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState('');
  const [trustLevel, setTrustLevel] = useState(10);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastTrace, setLastTrace] = useState('');
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);

  // Initialize user and WebSocket on mount
  useEffect(() => {
    // Get or create user ID
    const storedUserId = localStorage.getItem('oneaba3_user_id');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const newUserId = 'oneaba3_' + Date.now();
      localStorage.setItem('oneaba3_user_id', newUserId);
      setUserId(newUserId);
    }

    // Connect to Command Center WebSocket for real-time updates
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket connection to Command Center
  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(`wss://aba-reach.onrender.com/command-center`);
      
      ws.onopen = () => {
        setConnectionStatus('connected');
        console.log('[OneABA3] Connected to Command Center');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'broadcast') {
            // Handle broadcast messages from REACH
            console.log('[OneABA3] Broadcast:', data);
          }
        } catch (e) {
          console.error('[OneABA3] WebSocket message error:', e);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        // Reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('[OneABA3] WebSocket error:', error);
        setConnectionStatus('error');
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('[OneABA3] WebSocket connection failed:', e);
      setConnectionStatus('error');
    }
  };

  // Send message to REACH router
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }]);

    try {
      // POST to REACH router - THE CORE OF PHASE 2.1
      const response = await fetch(`${REACH_URL}/api/router`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          user_id: userId,
          trust_level: trustLevel,
          vessel: 'OneABA3',
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();

      // Extract response and trace
      const abaResponse = data.response || data.error || 'No response from AIR';
      const trace = data.trace || '';
      setLastTrace(trace);

      // Add ABA response to chat
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: abaResponse,
        timestamp: new Date().toISOString(),
        trace: trace,
        agents: data.agents || [],
        missionNumber: data.missionNumber || ''
      }]);

    } catch (error) {
      console.error('[OneABA3] Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Connection error: ${error.message}. REACH may be sleeping - try again.`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-purple-500/30 bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">OneABA<span className="text-purple-400">3</span></h1>
            <p className="text-xs text-purple-300/70">Direct to REACH • No Claude.ai</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
            connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
            connectionStatus === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
              connectionStatus === 'error' ? 'bg-red-400' :
              'bg-yellow-400 animate-pulse'
            }`} />
            {connectionStatus}
          </div>
          <div className="text-xs text-purple-300/50">
            T{trustLevel}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-4">
              <span className="text-white font-bold text-3xl">A</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to OneABA3</h2>
            <p className="text-purple-300/70 max-w-md">
              This vessel connects directly to ABA's brain via REACH. 
              No Claude.ai sessions needed. Full AIR routing.
            </p>
            <p className="text-xs text-purple-400/50 mt-4">
              ⬡B:VESSEL:ONEABA3:v3.0.0:20260224⬡
            </p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-purple-600 text-white' 
                : msg.isError
                  ? 'bg-red-900/50 text-red-200 border border-red-500/30'
                  : 'bg-slate-800/80 text-white border border-purple-500/20'
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.trace && (
                <div className="mt-2 pt-2 border-t border-purple-500/20">
                  <p className="text-xs text-purple-300/50 font-mono truncate">
                    Trace: {msg.trace}
                  </p>
                  {msg.agents && msg.agents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {msg.agents.slice(0, 8).map((agent, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                          {agent}
                        </span>
                      ))}
                      {msg.agents.length > 8 && (
                        <span className="text-purple-400/50 text-xs">+{msg.agents.length - 8} more</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs opacity-50 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 text-white border border-purple-500/20 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-purple-300/70 text-sm">AIR is processing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-purple-500/30 bg-black/20">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message ABA..."
            className="flex-1 bg-slate-800/50 border border-purple-500/30 rounded-xl px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500 resize-none"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Send
          </button>
        </div>
        {lastTrace && (
          <p className="text-xs text-purple-300/30 mt-2 font-mono truncate">
            Last trace: {lastTrace}
          </p>
        )}
      </div>
    </div>
  );
}
