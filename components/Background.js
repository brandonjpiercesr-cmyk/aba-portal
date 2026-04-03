'use client';
import { useEffect, useState, useRef, createContext, useContext } from 'react';

const BACKGROUNDS = [
  { name: 'Black Landscape', url: 'https://i.imgur.com/ZwVdgzN.jpeg' },
  { name: '3 GOATS', url: 'https://i.imgur.com/jNJUq4u.png' },
  { name: 'Unity', url: 'https://i.imgur.com/IJAeq7t.png' },
  { name: 'Mountain Snow', url: 'https://i.imgur.com/7Ffjcy2.png' },
  { name: 'Earth', url: 'https://i.imgur.com/NOXQ3aM.png' },
  { name: 'Motion', url: 'https://i.imgur.com/3hG18cp.jpeg' },
  { name: 'Glass Windows', url: 'https://i.imgur.com/Kjjs7nt.jpeg' },
  { name: 'Event Horizon', url: 'https://i.imgur.com/A44TxCq.jpeg' },
  { name: 'Nebula', url: 'https://i.imgur.com/nLBRQ82.jpeg' },
  { name: 'Storm Clouds', url: 'https://i.imgur.com/RRKjvgR.jpeg' },
  { name: 'Particle Lights', url: 'https://i.imgur.com/wLi9sGD.jpeg' },
  { name: 'Wet City', url: 'https://i.imgur.com/h8zNCw1.jpeg' },
  { name: 'Beach', url: 'https://i.imgur.com/YaH4lbp.jpeg' },
  { name: 'Embers', url: 'https://i.imgur.com/9HZYnlX.png' },
  { name: 'Pink Smoke', url: 'https://i.imgur.com/3RkebB2.jpeg' },
];

export { BACKGROUNDS };

const BgContext = createContext({ bgIdx: 0, setBgIdx: () => {}, pickerOpen: false, setPickerOpen: () => {} });
export const useBgPicker = () => useContext(BgContext);

export function BgProvider({ children }) {
  const [bgIdx, setBgIdx] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('aoa_bg') : null;
    if (saved !== null) setBgIdx(Number(saved));
  }, []);

  const setAndSave = (idx) => {
    setBgIdx(idx);
    if (typeof window !== 'undefined') localStorage.setItem('aoa_bg', String(idx));
  };

  return (
    <BgContext.Provider value={{ bgIdx, setBgIdx: setAndSave, pickerOpen, setPickerOpen }}>
      {children}
    </BgContext.Provider>
  );
}

export default function AnimatedBackground() {
  const { bgIdx } = useBgPicker();
  const [currentIdx, setCurrentIdx] = useState(bgIdx);
  const [nextIdx, setNextIdx] = useState((bgIdx + 1) % BACKGROUNDS.length);
  const [transitioning, setTransitioning] = useState(false);
  const styleRef = useRef(false);

  useEffect(() => {
    setCurrentIdx(bgIdx);
    setNextIdx((bgIdx + 1) % BACKGROUNDS.length);
  }, [bgIdx]);

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
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(109, 40, 217, 0.08) 0%, transparent 50%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.3) 0%, rgba(15, 23, 42, 0.85) 100%)',
      }} />
    </div>
  );
}

export function BackgroundPicker() {
  const { bgIdx, setBgIdx, pickerOpen, setPickerOpen } = useBgPicker();

  if (!pickerOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={() => setPickerOpen(false)}>
      <div className="glass-card p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto glow-purple" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-white">Choose Background</h2>
          <button onClick={() => setPickerOpen(false)} className="text-dim hover:text-white text-lg">&times;</button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {BACKGROUNDS.map((bg, i) => (
            <button key={i} onClick={() => { setBgIdx(i); setPickerOpen(false); }}
              className={`relative rounded-lg overflow-hidden aspect-video border-2 transition-all ${
                i === bgIdx ? 'border-purple shadow-lg shadow-purple/30' : 'border-transparent hover:border-white/20'
              }`}>
              <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-1 left-1 text-[8px] text-white/80">{bg.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
