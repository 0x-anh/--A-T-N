import React from 'react';
import { motion } from "motion/react";

const MatrixBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0 bg-gradient-to-br from-[#f8fafc] via-[#eff6ff] to-[#f1f5f9]">
      {/* 🏁 TECHNICAL GRID SYSTEM - Enhanced Visibility */}
      <div 
        className="absolute inset-0 opacity-[0.25]" 
        style={{ 
          backgroundImage: `
            linear-gradient(to right, #e2e8f0 1.5px, transparent 1.5px),
            linear-gradient(to bottom, #e2e8f0 1.5px, transparent 1.5px)
          `,
          backgroundSize: '50px 50px' 
        }} 
      />
      <div 
        className="absolute inset-0 opacity-[0.12]" 
        style={{ 
          backgroundImage: `
            linear-gradient(to right, #cbd5e1 1px, transparent 1px),
            linear-gradient(to bottom, #cbd5e1 1px, transparent 1px)
          `,
          backgroundSize: '250px 250px',
          border: '1px solid rgba(148, 163, 184, 0.15)'
        }} 
      />

      {/* ⚡ CIRCUIT BOARD PATTERNS - Darker Slate */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.35]" xmlns="http://www.w3.org/2000/svg">
        <pattern id="circuit" width="400" height="400" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 100 100 L 0 100 M 100 100 L 150 150 L 300 150 M 300 150 L 300 300 L 400 300" stroke="#64748b" strokeWidth="1.5" fill="none" />
          <circle cx="100" cy="100" r="4" fill="#475569" />
          <circle cx="300" cy="150" r="4" fill="#475569" />
          <path d="M 0 300 L 100 300 L 150 250 L 150 100" stroke="#64748b" strokeWidth="1.5" fill="none" />
          <circle cx="150" cy="250" r="4" fill="#64748b" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#circuit)" />
      </svg>

      {/* 🌟 AMBIENT GLOWS - Stronger contrast */}
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-100/40 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[50%] h-[50%] bg-slate-100/60 blur-[120px] rounded-full" />

      {/* 🚀 ANIMATED SCAN LINES */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ duration: 3 }}
        className="absolute inset-0"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-slate-400 to-transparent animate-[scan_12s_linear_infinite]" />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-300 to-transparent animate-[scan_20s_linear_infinite] [animation-delay:5s]" />
      </motion.div>

      {/* 📡 FLOATING DATA NODES */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: 0.3
            }}
            animate={{ 
              y: [null, (Math.random() * 100) + "%"],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 12 + Math.random() * 15, 
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute w-2 h-2 bg-slate-300 rounded-full shadow-[0_0_12px_rgba(148,163,184,0.4)] border border-white"
          />
        ))}
      </div>

      {/* HUD DECORATIONS */}
      <div className="absolute top-12 left-12 border-l-2 border-t-2 border-slate-200 w-32 h-32 opacity-40" />
      <div className="absolute top-12 right-12 border-r-2 border-t-2 border-slate-200 w-32 h-32 opacity-40" />
      <div className="absolute bottom-12 left-12 border-l-2 border-b-2 border-slate-200 w-32 h-32 opacity-40" />
      <div className="absolute bottom-12 right-12 border-r-2 border-b-2 border-slate-200 w-32 h-32 opacity-40" />

      <div className="absolute inset-0 noise-overlay opacity-[0.02] pointer-events-none" />
    </div>
  );
};

export default MatrixBackground;
