'use client';
import { useEffect, useState, useRef } from 'react';

const BACKGROUNDS = [
  { name: 'blackLandscape', url: 'https://i.imgur.com/ZwVdgzN.jpeg' },
  { name: 'threeGoats', url: 'https://i.imgur.com/jNJUq4u.png' },
  { name: 'unity', url: 'https://i.imgur.com/IJAeq7t.png' },
  { name: 'mountainSnow', url: 'https://i.imgur.com/7Ffjcy2.png' },
  { name: 'earth', url: 'https://i.imgur.com/NOXQ3aM.png' },
  { name: 'motion', url: 'https://i.imgur.com/3hG18cp.jpeg' },
  { name: 'glassWindows', url: 'https://i.imgur.com/Kjjs7nt.jpeg' },
  { name: 'eventHorizon', url: 'https://i.imgur.com/A44TxCq.jpeg' },
  { name: 'nebula', url: 'https://i.imgur.com/nLBRQ82.jpeg' },
  { name: 'stormClouds', url: 'https://i.imgur.com/RRKjvgR.jpeg' },
  { name: 'particleLights', url: 'https://i.imgur.com/wLi9sGD.jpeg' },
  { name: 'wetCity', url: 'https://i.imgur.com/h8zNCw1.jpeg' },
  { name: 'beach', url: 'https://i.imgur.com/YaH4lbp.jpeg' },
  { name: 'embers', url: 'https://i.imgur.com/9HZYnlX.png' },
  { name: 'pinkSmoke', url: 'https://i.imgur.com/3RkebB2.jpeg' },
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
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setTransitioning(true);
      setNextIdx(prev => (prev + 1) % BACKGROUNDS.length);
      setTimeout(() => {
        setCurrentIdx(prev => (prev + 1) % BACKGROUNDS.length);
        setTransitioning(false);
      }, 2500);
    }, 25000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: '-10%', width: '120%', height: '120%',
        backgroundImage: `url(${BACKGROUNDS[currentIdx].url})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        animation: 'aoa-kenburns-a 25s ease-in-out infinite alternate',
        opacity: 0.7, transition: 'opacity 2.5s ease',
      }} />

      {transitioning && (
        <div style={{
          position: 'absolute', inset: '-10%', width: '120%', height: '120%',
          backgroundImage: `url(${BACKGROUNDS[nextIdx].url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          animation: 'aoa-kenburns-b 25s ease-in-out infinite alternate',
          opacity: 0.7,
        }} />
      )}

      {/* Purple radial gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(109, 40, 217, 0.08) 0%, transparent 50%)',
      }} />

      {/* Dark vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.3) 0%, rgba(15, 23, 42, 0.85) 100%)',
      }} />
    </div>
  );
}
