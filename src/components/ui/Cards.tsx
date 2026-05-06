import React from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export const StatsCard = ({ label, value, icon, trend }: { label: string, value: string | number, icon: React.ReactNode, trend: string }) => (
  <div className="tech-corners bg-white/20 backdrop-blur-3xl p-6 rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_40px_rgba(99,102,241,0.08)] transition-all duration-700 group relative overflow-hidden">
    {/* Decorative Elements */}
    <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-all group-hover:scale-125 group-hover:rotate-12 duration-700">
       {React.cloneElement(icon as React.ReactElement, { size: 100 })}
    </div>
    <div className="absolute top-0 left-0 w-8 h-[1px] bg-brand-500/30 group-hover:w-16 transition-all duration-700" />
    <div className="absolute top-0 left-0 w-[1px] h-8 bg-brand-500/30 group-hover:h-16 transition-all duration-700" />

    <div className="flex items-center gap-4 mb-6">
      <div className="w-11 h-11 rounded-xl bg-white/40 flex items-center justify-center text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all duration-500 shadow-sm border border-white/60">
        {React.cloneElement(icon as React.ReactElement, { size: 18, strokeWidth: 2.5 })}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.4em] font-mono opacity-60">{label}</span>
        <div className="w-8 h-[1px] bg-brand-500/20 group-hover:w-12 transition-all duration-500" />
      </div>
    </div>
    
    <div className="flex items-end justify-between relative z-10">
      <div className="flex flex-col gap-1">
        <h4 className="text-4xl font-heading font-black text-slate-950 tracking-tighter leading-none">{value}</h4>
        <div className="flex items-center gap-1.5 pt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest font-mono">{trend}</span>
        </div>
      </div>
      <div className="w-12 h-12 opacity-10 group-hover:opacity-30 transition-opacity">
        <svg viewBox="0 0 100 100" className="w-full h-full text-brand-500">
          <path d="M10,90 Q40,40 90,10" fill="none" stroke="currentColor" strokeWidth="4" />
          <circle cx="90" cy="10" r="8" fill="currentColor" />
        </svg>
      </div>
    </div>
  </div>
);

export const QuickAction = ({ title, desc, icon, onClick }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="tech-corners group p-8 bg-white/20 backdrop-blur-3xl border border-white/60 rounded-2xl text-left hover:border-brand-500/40 hover:shadow-[0_20px_50px_rgba(99,102,241,0.1)] transition-all duration-700 relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000 blur-3xl" />
    <div className="absolute bottom-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700 group-hover:rotate-[-12deg]">
       {React.cloneElement(icon as React.ReactElement, { size: 60 })}
    </div>

    <div className="w-14 h-14 bg-slate-950 text-white rounded-xl flex items-center justify-center mb-8 shadow-2xl shadow-slate-950/20 group-hover:bg-brand-600 group-hover:scale-110 transition-all duration-500 relative z-10">
      {React.cloneElement(icon as React.ReactElement, { size: 22, strokeWidth: 2.5 })}
    </div>
    <div className="relative z-10">
      <h3 className="text-[13px] font-black text-slate-950 uppercase tracking-[0.2em] mb-2 font-heading">{title}</h3>
      <p className="text-[11px] text-slate-500 font-medium leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">{desc}</p>
    </div>
    
    <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-brand-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-[-10px] group-hover:translate-x-0">
      Execute Action <Plus size={12} />
    </div>
  </button>
);
