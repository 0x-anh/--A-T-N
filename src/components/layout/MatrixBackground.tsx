import React, { useEffect, useRef } from 'react';
import { motion } from "motion/react";

const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = "01ABCDEF<>[]{}$%&#@*+=-";
    const fontSize = 12;
    const columns = canvas.width / fontSize;
    const drops: number[] = Array(Math.ceil(columns)).fill(0);

    const draw = () => {
      ctx.fillStyle = "rgba(253, 254, 255, 0.08)"; // Trail effect in white
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px "JetBrains Mono"`;
      
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        // Silver-Indigo tech color
        ctx.fillStyle = i % 10 === 0 ? "#6366f1" : "#cbd5e1"; 
        ctx.globalAlpha = i % 10 === 0 ? 0.4 : 0.15;
        
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.985) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 40);
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0 bg-[#fdfeff]">
      {/* 🔮 3D PERSPECTIVE GRID */}
      <div className="absolute inset-0 opacity-[0.2]" 
           style={{ 
             perspective: '1000px',
             transformStyle: 'preserve-3d'
           }}>
        <div className="absolute inset-0" 
             style={{ 
               backgroundImage: `
                 linear-gradient(to right, #94a3b8 1px, transparent 1px),
                 linear-gradient(to bottom, #94a3b8 1px, transparent 1px)
               `,
               backgroundSize: '60px 60px',
               transform: 'translateY(-200px)',
               maskImage: 'linear-gradient(to bottom, black, transparent)'
             }} 
        />
      </div>

      {/* 🧪 MATRIX FALLING CHARACTERS (Canvas) */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-[0.6] mix-blend-multiply" />

      {/* ⚙️ HEXAGON TECH PATTERN */}
      <div className="absolute inset-0 opacity-[0.05]" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h2v7.5L28 15v15l-12.98 7.5V49h-2v-11.5L0 30V15z' fill='%236366f1' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
             backgroundSize: '100px'
           }} 
      />

      {/* 📡 HUD OVERLAYS & COORDINATES */}
      <div className="absolute top-10 left-10 flex flex-col gap-1 opacity-20">
        <div className="w-12 h-[1px] bg-brand-500" />
        <div className="w-8 h-[1px] bg-brand-500" />
        <span className="text-[8px] font-mono text-brand-600 font-bold mt-2 tracking-tighter">SEC_PROTOCOL_V4.0</span>
      </div>

      <div className="absolute bottom-10 right-10 flex flex-col items-end gap-1 opacity-20">
        <span className="text-[8px] font-mono text-brand-600 font-bold mb-2 tracking-tighter">COORDINATES: 42.109 - 18.002</span>
        <div className="w-20 h-[1px] bg-brand-500" />
        <div className="w-12 h-[1px] bg-brand-500" />
      </div>

      {/* 🌀 RADAR CIRCLES */}
      <div className="absolute -top-[10%] -right-[5%] w-[400px] h-[400px] opacity-[0.03]">
        <div className="absolute inset-0 border-[0.5px] border-brand-500 rounded-full animate-ping" />
        <div className="absolute inset-4 border-[0.5px] border-brand-500 rounded-full" />
        <div className="absolute inset-12 border-[0.5px] border-brand-500 rounded-full opacity-50" />
      </div>

      {/* 🛡️ SCANNING LINE */}
      <motion.div 
        animate={{ y: ["-100%", "200%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 h-[40vh] bg-gradient-to-b from-transparent via-brand-500/[0.08] to-transparent pointer-events-none"
      />

      <div className="absolute inset-0 noise-overlay opacity-[0.03] pointer-events-none" />
    </div>
  );
};

export default MatrixBackground;
