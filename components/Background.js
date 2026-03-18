'use client';
import { useEffect, useState, useRef } from 'react';

const BACKGROUNDS = [
  { name: 'pinkSmoke', url: 'https://i.imgur.com/3RkebB2.jpeg' },
  { name: 'wetCity', url: 'https://i.imgur.com/h8zNCw1.jpeg' },
  { name: 'eventHorizon', url: 'https://i.imgur.com/A44TxCq.jpeg' },
  { name: 'nebula', url: 'https://i.imgur.com/nLBRQ82.jpeg' },
  { name: 'stormClouds', url: 'https://i.imgur.com/RRKjvgR.jpeg' },
  { name: 'particleLights', url: 'https://i.imgur.com/wLi9sGD.jpeg' },
  { name: 'embers', url: 'https://i.imgur.com/9HZYnlX.png' },
  { name: 'motion', url: 'https://i.imgur.com/3hG18cp.jpeg' },
  { name: 'glassWindows', url: 'https://i.imgur.com/Kjjs7nt.jpeg' },
  { name: 'blackLandscape', url: 'https://i.imgur.com/ZwVdgzN.jpeg' },
  { name: 'earth', url: 'https://i.imgur.com/NOXQ3aM.png' },
  { name: 'mountainSnow', url: 'https://i.imgur.com/7Ffjcy2.png' },
];

export default function AnimatedBackground() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1);
  const [transitioning, setTransitioning] = useState(false);
  const styleRef = useRef(false);

  useEffect(() => {
    if (styleRef.current) return;
    styleRef.current = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes aoa-kenburns-a {
        0% { transform: scale(1) translate(0, 0); }
        50% { transform: scale(1.12) translate(-2%, 1.5%); }
        100% { transform: scale(1.05) translate(1%, -1%); }
      }
      @keyframes aoa-kenburns-b {
        0% { transform: scale(1.05) translate(1%, -1%); }
        50% { transform: scale(1.15) translate(-1%, -2%); }
        100% { transform: scale(1) translate(0, 0); }
      }
      @keyframes aoa-fadein { from { opacity: 0; } to { opacity: 1; } }
    `;
    document.head.appendChild(style);
  }, []);

  // Rotate backgrounds every 30 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      setTransitioning(true);
      setNextIdx(prev => (prev + 1) % BACKGROUNDS.length);
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % BACKGROUNDS.length);
        setTransitioning(false);
      }, 2000);
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
      {/* Current background with Ken Burns */}
      <div style={{
        position: 'absolute', inset: '-10%', width: '120%', height: '120%',
        backgroundImage: `url(${BACKGROUNDS[currentIdx].url})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        animation: 'aoa-kenburns-a 30s ease-in-out infinite alternate',
        opacity: 0.5,
        transition: 'opacity 2s ease',
      }} />

      {/* Next background fading in during transition */}
      {transitioning && (
        <div style={{
          position: 'absolute', inset: '-10%', width: '120%', height: '120%',
          backgroundImage: `url(${BACKGROUNDS[nextIdx].url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          animation: 'aoa-kenburns-b 30s ease-in-out infinite alternate, aoa-fadein 2s ease forwards',
          opacity: 0.5,
        }} />
      )}

      {/* Dark overlay for readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(6,6,16,0.55) 0%, rgba(6,6,16,0.65) 50%, rgba(6,6,16,0.55) 100%)',
      }} />

      {/* Subtle purple accent glow */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)',
        top: '10%', left: '20%', filter: 'blur(80px)', pointerEvents: 'none',
      }} />
    </div>
  );
}
