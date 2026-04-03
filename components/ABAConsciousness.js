// v1.7.8-P7-S1 | ABA | Organic Energy Blob - NO SPHERES NO CIRCLES NO DOTS
'use client';
// ============================================================================
// Brandon: "LIKE ENERGY INSIDE OF ENERGY! LIFE MOVING ABSTRACT"
// Brandon: "NO SPHERE NO CIRCLE NO DOTS!!!!!!!!"
//
// DESIGN:
// - Organic blob shape using noise
// - Multiple color layers that blend and shift
// - Morphing edges like plasma/aurora
// - Internal energy movement
// - Outer glow follows the shape
// ============================================================================

import React, { useRef, useEffect } from 'react';

// v1.7.8-P7-S1 | CONST | State color palettes - multiple colors that blend
const STATE_PALETTES = {
  idle: {
    colors: [
      [139, 92, 246],   // Purple
      [167, 139, 250],  // Light purple
      [236, 72, 153],   // Pink
      [99, 102, 241],   // Indigo
    ],
    glow: [139, 92, 246]
  },
  thinking: {
    colors: [
      [245, 158, 11],   // Orange
      [251, 191, 36],   // Yellow
      [239, 68, 68],    // Red
      [253, 224, 71],   // Light yellow
    ],
    glow: [245, 158, 11]
  },
  speaking: {
    colors: [
      [34, 197, 94],    // Green
      [16, 185, 129],   // Emerald
      [132, 204, 22],   // Lime
      [45, 212, 191],   // Teal
    ],
    glow: [34, 197, 94]
  },
  listening: {
    colors: [
      [6, 182, 212],    // Cyan
      [59, 130, 246],   // Blue
      [139, 92, 246],   // Purple
      [147, 197, 253],  // Light blue
    ],
    glow: [6, 182, 212]
  }
};

// v1.7.8-P7-S1 | UTIL | Simplex-style noise for organic shapes
class NoiseGenerator {
  constructor() {
    this.perm = [];
    for (let i = 0; i < 512; i++) {
      this.perm[i] = Math.floor(Math.random() * 256);
    }
  }
  
  noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;
    return this.lerp(v,
      this.lerp(u, this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y)),
      this.lerp(u, this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1))
    );
  }
  
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
}

// v1.7.8-P7-S1 | COMP | Organic Energy ABA
const ABAConsciousness = ({ size = 200, state = 'idle' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const noiseRef = useRef(new NoiseGenerator());
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    
    const center = size / 2;
    const noise = noiseRef.current;
    
    let time = 0;
    
    const animate = () => {
      const palette = STATE_PALETTES[stateRef.current] || STATE_PALETTES.idle;
      const speed = stateRef.current === 'thinking' ? 0.025 : 
                   stateRef.current === 'speaking' ? 0.018 :
                   stateRef.current === 'listening' ? 0.012 : 0.015;
      
      time += speed;
      
      // Clear completely - transparent background
      ctx.clearRect(0, 0, size, size);
      
      // Draw multiple blob layers
      for (let layer = 0; layer < 4; layer++) {
        const color = palette.colors[layer];
        const layerOffset = layer * 0.7;
        const baseRadius = size * (0.28 - layer * 0.03);
        
        ctx.beginPath();
        
        // Create organic blob shape with noise
        const points = 120;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          
          // Multiple noise octaves for organic feel
          const n1 = noise.noise2D(
            Math.cos(angle) * 2 + time + layerOffset,
            Math.sin(angle) * 2 + time * 0.7
          );
          const n2 = noise.noise2D(
            Math.cos(angle) * 4 + time * 1.3 + layerOffset,
            Math.sin(angle) * 4 + time * 0.9
          ) * 0.5;
          const n3 = noise.noise2D(
            Math.cos(angle) * 8 + time * 0.5 + layerOffset,
            Math.sin(angle) * 8 + time * 1.1
          ) * 0.25;
          
          // ðŸ§© Verification Fragment 10: "YABA (Yes ABA!!!!) #BrandonPutMeUpToThis"
          
          const noiseVal = (n1 + n2 + n3) * 0.4;
          const radius = baseRadius + noiseVal * size * 0.15;
          
          const x = center + Math.cos(angle) * radius;
          const y = center + Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        
        // Create gradient fill
        const gradient = ctx.createRadialGradient(
          center + Math.sin(time * 2 + layer) * 10,
          center + Math.cos(time * 1.5 + layer) * 10,
          0,
          center,
          center,
          baseRadius * 1.5
        );
        
        const alpha = 0.7 - layer * 0.12;
        gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha * 0.6})`);
        gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Soft edge glow
        if (layer === 0) {
          ctx.shadowColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.5)`;
          ctx.shadowBlur = 30;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      
      // Add inner energy wisps
      for (let w = 0; w < 3; w++) {
        const wispColor = palette.colors[w % palette.colors.length];
        const wispTime = time * (1 + w * 0.3);
        
        ctx.beginPath();
        
        const wispPoints = 60;
        const wispRadius = size * 0.15;
        const wispOffsetX = Math.sin(wispTime + w * 2) * size * 0.08;
        const wispOffsetY = Math.cos(wispTime * 0.7 + w * 2) * size * 0.08;
        
        for (let i = 0; i <= wispPoints; i++) {
          const angle = (i / wispPoints) * Math.PI * 2;
          const n = noise.noise2D(
            Math.cos(angle) * 3 + wispTime + w,
            Math.sin(angle) * 3 + wispTime * 0.8
          );
          
          const r = wispRadius + n * size * 0.1;
          const x = center + wispOffsetX + Math.cos(angle) * r;
          const y = center + wispOffsetY + Math.sin(angle) * r;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        
        ctx.closePath();
        
        const wispGradient = ctx.createRadialGradient(
          center + wispOffsetX, center + wispOffsetY, 0,
          center + wispOffsetX, center + wispOffsetY, wispRadius
        );
        wispGradient.addColorStop(0, `rgba(255, 255, 255, 0.4)`);
        wispGradient.addColorStop(0.3, `rgba(${wispColor[0]}, ${wispColor[1]}, ${wispColor[2]}, 0.3)`);
        wispGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = wispGradient;
        ctx.fill();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size]);
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size
      }}
    />
  );
};

// v1.7.8-P7-S1 | EXPORT | Size presets
export const ABALogoSmall = ({ state = 'idle' }) => <ABAConsciousness size={32} state={state} />;
export const ABALogoMedium = ({ state = 'idle' }) => <ABAConsciousness size={48} state={state} />;
export const ABALogoLarge = ({ state = 'idle' }) => <ABAConsciousness size={80} state={state} />;
export const ABALogoHero = ({ state = 'idle' }) => <ABAConsciousness size={200} state={state} />;

// v1.7.8-P7-S1 | UTIL | Get glow color for UI elements
export const getABAGlowColor = (state = 'idle', opacity = 0.4) => {
  const palette = STATE_PALETTES[state] || STATE_PALETTES.idle;
  const [r, g, b] = palette.glow;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const getABAStateColors = (state = 'idle') => {
  return STATE_PALETTES[state] || STATE_PALETTES.idle;
};

export default ABAConsciousness;
-e 

// ðŸ§© PUZZLE PIECE #10
// Verification phrase final piece: "YABA (Yes ABA!!!!) #BrandonPutMeUpToThis"
//
// We Are All ABA.
