'use client';
import { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
  const styleRef = useRef(null);

  useEffect(() => {
    // Inject keyframes into document head (App Router compatible)
    if (styleRef.current) return;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes aoa-drift1 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        25% { transform: translate(80px, -60px) scale(1.15); }
        50% { transform: translate(-50px, 90px) scale(0.9); }
        75% { transform: translate(70px, 30px) scale(1.08); }
      }
      @keyframes aoa-drift2 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(-80px, 60px) scale(1.12); }
        66% { transform: translate(60px, -80px) scale(0.88); }
      }
      @keyframes aoa-drift3 {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(70px, -50px) scale(1.15); }
      }
      @keyframes aoa-kenburns {
        0% { transform: scale(1) translate(0, 0); }
        25% { transform: scale(1.08) translate(-2%, 1.5%); }
        50% { transform: scale(1.12) translate(1.5%, -2%); }
        75% { transform: scale(1.05) translate(-1%, -1%); }
        100% { transform: scale(1) translate(0, 0); }
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Orb 1: Large indigo */}
      <div style={{
        position: 'absolute', width: 900, height: 900, borderRadius: '50%',
        background: 'radial-gradient(circle, #6366f1, transparent 70%)',
        opacity: 0.08, filter: 'blur(120px)',
        top: '-15%', left: '5%',
        animation: 'aoa-drift1 25s ease-in-out infinite'
      }} />
      {/* Orb 2: Purple */}
      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, #8b5cf6, transparent 70%)',
        opacity: 0.06, filter: 'blur(100px)',
        top: '35%', right: '-5%',
        animation: 'aoa-drift2 30s ease-in-out infinite'
      }} />
      {/* Orb 3: Blue */}
      <div style={{
        position: 'absolute', width: 800, height: 800, borderRadius: '50%',
        background: 'radial-gradient(circle, #3b82f6, transparent 70%)',
        opacity: 0.05, filter: 'blur(110px)',
        bottom: '-10%', left: '25%',
        animation: 'aoa-drift3 22s ease-in-out infinite'
      }} />
      {/* Orb 4: Warm accent (subtle) */}
      <div style={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, #ec4899, transparent 70%)',
        opacity: 0.025, filter: 'blur(90px)',
        top: '60%', left: '60%',
        animation: 'aoa-drift1 35s ease-in-out infinite reverse'
      }} />
      {/* Ken Burns texture layer */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.02,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='400' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '400px 400px',
        animation: 'aoa-kenburns 40s ease-in-out infinite'
      }} />
    </div>
  );
}
