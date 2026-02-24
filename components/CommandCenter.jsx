/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Command Center - Real-time WebSocket Live Feed
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PHASE 2.3 - UNICORN ROADMAP v1.2
 * 
 * Connects to REACH WebSocket at wss://aba-reach.onrender.com/command-center
 * Shows real-time activity from all ABA systems.
 * 
 * ⬡B:CCWA:COMMAND.CENTER:v1.0.0:20260224⬡
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';

const REACH_WS_URL = 'wss://aba-reach.onrender.com/command-center';
const REACH_API_URL = 'https://aba-reach.onrender.com';

export default function CommandCenter() {
  const [events, setEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [systemStatus, setSystemStatus] = useState(null);
  const [agents, setAgents] = useState([]);
  const [features, setFeatures] = useState([]);
  const wsRef = useRef(null);
  const eventsEndRef = useRef(null);

  // Connect to WebSocket on mount
  useEffect(() => {
    connectWebSocket();
    fetchPulseStatus();
    
    // Fetch pulse status every 30 seconds
    const interval = setInterval(fetchPulseStatus, 30000);

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Fetch pulse status
  const fetchPulseStatus = async () => {
    try {
      const response = await fetch(`${REACH_API_URL}/api/pulse/status`);
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('[CC] Pulse fetch error:', error);
    }
  };

  // WebSocket connection
  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(REACH_WS_URL);

      ws.onopen = () => {
        setConnectionStatus('connected');
        addEvent({
          type: 'system',
          message: 'Connected to REACH Command Center',
          color: 'green'
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          switch (data.type) {
            case 'connected':
              setAgents(data.agents || []);
              setFeatures(data.features || []);
              addEvent({
                type: 'welcome',
                message: `Service: ${data.service}`,
                agents: data.agents,
                color: 'purple'
              });
              break;
              
            case 'broadcast':
              addEvent({
                type: 'broadcast',
                message: JSON.stringify(data.data, null, 2),
                timestamp: data.timestamp,
                color: 'blue'
              });
              break;
              
            case 'escalate_result':
              addEvent({
                type: 'escalation',
                message: `Escalation: ${JSON.stringify(data.result)}`,
                color: 'yellow'
              });
              break;
              
            case 'pulse':
              addEvent({
                type: 'pulse',
                message: `Heartbeat: ${data.uptime || 'active'}`,
                color: 'green'
              });
              break;
              
            default:
              addEvent({
                type: data.type || 'unknown',
                message: JSON.stringify(data),
                color: 'gray'
              });
          }
        } catch (e) {
          console.error('[CC] Message parse error:', e);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        addEvent({
          type: 'system',
          message: 'Disconnected from REACH. Reconnecting in 5s...',
          color: 'red'
        });
        setTimeout(connectWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('[CC] WebSocket error:', error);
        setConnectionStatus('error');
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('[CC] Connection failed:', e);
      setConnectionStatus('error');
    }
  };

  // Add event to feed
  const addEvent = (event) => {
    setEvents(prev => [...prev.slice(-99), {
      ...event,
      id: Date.now(),
      timestamp: event.timestamp || new Date().toISOString()
    }]);
  };

  // Send command to REACH
  const sendCommand = (type, payload = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
      addEvent({
        type: 'outbound',
        message: `Sent: ${type}`,
        color: 'cyan'
      });
    }
  };

  // Color map for event types
  const colorMap = {
    green: 'bg-green-500/20 border-green-500/50 text-green-300',
    red: 'bg-red-500/20 border-red-500/50 text-red-300',
    blue: 'bg-blue-500/20 border-blue-500/50 text-blue-300',
    purple: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
    cyan: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300',
    gray: 'bg-gray-500/20 border-gray-500/50 text-gray-300'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-purple-400">⬡</span> Command Center
          </h1>
          <p className="text-sm text-slate-400">Real-time ABA Activity Feed</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
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
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">Live Activity Feed</h2>
              <span className="text-xs text-slate-400">{events.length} events</span>
            </div>
            <div className="h-[600px] overflow-y-auto p-4 space-y-2 font-mono text-sm">
              {events.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  Waiting for events...
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border ${colorMap[event.color] || colorMap.gray}`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="font-semibold uppercase text-xs opacity-70">
                        {event.type}
                      </span>
                      <span className="text-xs opacity-50">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="mt-1 whitespace-pre-wrap break-words text-xs">
                      {event.message}
                    </pre>
                    {event.agents && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {event.agents.map((agent, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-white/10 rounded text-xs">
                            {agent}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={eventsEndRef} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* System Status */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="font-semibold text-white mb-3">System Status</h3>
            {systemStatus ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className={systemStatus.status === 'active' ? 'text-green-400' : 'text-red-400'}>
                    {systemStatus.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Uptime</span>
                  <span className="text-white">{Math.floor(systemStatus.uptime / 60)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CC Clients</span>
                  <span className="text-white">{systemStatus.commandCenterClients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Calls/Hour</span>
                  <span className="text-white">
                    {systemStatus.callThrottle?.callsThisHour || 0} / {systemStatus.callThrottle?.maxCallsPerHour || 3}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm">Loading...</div>
            )}
          </div>

          {/* Active Agents */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="font-semibold text-white mb-3">Active Agents</h3>
            <div className="flex flex-wrap gap-1">
              {agents.length > 0 ? agents.map((agent, i) => (
                <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                  {agent}
                </span>
              )) : (
                <span className="text-slate-500 text-sm">Connecting...</span>
              )}
            </div>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="font-semibold text-white mb-3">Features</h3>
              <div className="space-y-1">
                {features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    <span className="text-slate-300">{feature.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="font-semibold text-white mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => sendCommand('status')}
                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                Request Status
              </button>
              <button
                onClick={fetchPulseStatus}
                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                Refresh Pulse
              </button>
              <button
                onClick={() => setEvents([])}
                className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
              >
                Clear Events
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-6 text-center text-xs text-slate-500">
        ⬡B:CCWA:COMMAND.CENTER:v1.0.0:20260224⬡ • Connected to: {REACH_WS_URL}
      </footer>
    </div>
  );
}
