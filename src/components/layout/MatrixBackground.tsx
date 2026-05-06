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
      ctx.fillStyle = "rgba(253, 254, 255, 0.15)"; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "JetBrains Mono"`;

      drops.forEach((y, i) => {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        
        // Tạo sự biến thiên màu sắc cho các cột để có chiều sâu
        const opacity = Math.random() > 0.9 ? 0.3 : 0.15;
        ctx.fillStyle = `rgba(15, 23, 42, ${opacity})`; 
        ctx.fillText(text, x, y * fontSize);

        if (y * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      });
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
      <div className="absolute inset-0 opacity-[0.20]" 
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
               backgroundSize: '80px 80px',
               transform: 'translateY(-200px)',
               maskImage: 'linear-gradient(to bottom, black, transparent)'
             }} 
        />
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 opacity-[0.7] mix-blend-multiply" />

      {/* ⚙️ HEXAGON TECH PATTERN */}
      <div className="absolute inset-0 opacity-[0.05]" 
           style={{ 
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='28' height='49' viewBox='0 0 28 49' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h2v7.5L28 15v15l-12.98 7.5V49h-2v-11.5L0 30V15z' fill='%236366f1' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
             backgroundSize: '120px'
           }} 
      />

      {/* 📡 MINIMALIST TECH LINES */}
      <div className="absolute top-10 left-10 right-10 flex justify-between opacity-30 pointer-events-none">
        <div className="flex gap-4 items-center">
          <div className="w-2 h-2 rounded-full border border-slate-400" />
          <div className="w-32 h-[1px] bg-gradient-to-r from-slate-400 to-transparent" />
          <span className="text-[7px] font-mono tracking-[0.5em] text-slate-400">LN_DR_01</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[7px] font-mono tracking-[0.5em] text-slate-400">RT_SYS_SYNC</span>
          <div className="w-32 h-[1px] bg-gradient-to-l from-slate-400 to-transparent" />
          <div className="w-2 h-2 rounded-full border border-slate-400" />
        </div>
      </div>

      {/* 🛡️ SCANNING LINE */}
      <motion.div 
        animate={{ y: ["-100%", "200%"] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        className="absolute inset-x-0 h-[10vh] bg-gradient-to-b from-transparent via-brand-500/[0.045] to-transparent pointer-events-none"
      />

      <div className="absolute inset-0 noise-overlay opacity-[0.03] pointer-events-none" />
    </div>
  );
};

export default MatrixBackground;
