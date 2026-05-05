import React from 'react';
import { motion } from "motion/react";

const MatrixBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#eef2f6]">
      {/* 🏁 TECHNICAL GRID SYSTEM - Blurry & Subtle */}
      <div 
        className="absolute inset-0 opacity-[0.1] blur-[0.5px]" 
        style={{ 
          backgroundImage: `
            linear-gradient(to right, #cbd5e1 1px, transparent 1px),
            linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px' 
        }} 
      />

      {/* ⚡ CIRCUIT BOARD PATTERNS - Blurred Silver */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.1] blur-[1px]" xmlns="http://www.w3.org/2000/svg">
        <pattern id="circuit" width="400" height="400" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 100 100 L 0 100 M 100 100 L 150 150 L 300 150 M 300 150 L 300 300 L 400 300" stroke="#cbd5e1" strokeWidth="1" fill="none" />
          <circle cx="100" cy="100" r="2.5" fill="#cbd5e1" />
          <circle cx="300" cy="150" r="2.5" fill="#cbd5e1" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      {/* 🌟 AMBIENT GLOWS */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-400/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] bg-slate-200/30 blur-[150px] rounded-full" />

      {/* 📡 FLOATING DATA NODES */}
      <div className="absolute inset-0 overflow-hidden blur-[0.5px]">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: 0.05
            }}
            animate={{ 
              y: [null, (Math.random() * 100) + "%"],
              opacity: [0.05, 0.15, 0.05]
            }}
            transition={{ 
              duration: 25, 
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute w-1 h-1 bg-slate-300 rounded-full"
          />
        ))}
      </div>

      {/* 🛠️ HUD DECORATIONS */}
      <div className="absolute top-8 left-8 border-l border-t border-slate-200/30 w-20 h-20 opacity-20 blur-[0.5px]" />
      <div className="absolute bottom-8 right-8 border-r border-b border-slate-200/30 w-20 h-20 opacity-20 blur-[0.5px]" />

      <div className="absolute inset-0 noise-overlay opacity-[0.01] pointer-events-none" />
    </div>
  );
};

export default MatrixBackground;
