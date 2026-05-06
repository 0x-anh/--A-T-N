import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const StatsCard = ({ label, value, icon, trend }: { label: string, value: string | number, icon: React.ReactNode, trend: string }) => (
  <div className="bg-white/10 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/40 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group relative overflow-hidden">
    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity group-hover:scale-110 duration-700">
       {React.cloneElement(icon as React.ReactElement, { size: 80 })}
    </div>
    <div className="flex items-center gap-4 mb-5">
      <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500 shadow-inner border border-white/20">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">{label}</span>
    </div>
    <div className="flex items-baseline gap-3">
       <h4 className="text-3xl font-heading font-black text-slate-950 tracking-tighter">{value}</h4>
       <span className="text-[9px] font-black text-emerald-500 bg-emerald-50/30 px-2 py-0.5 rounded-md uppercase tracking-widest border border-emerald-100/20">{trend}</span>
    </div>
  </div>
);

export const QuickAction = ({ title, desc, icon, onClick }: { title: string, desc: string, icon: React.ReactNode, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="group p-8 bg-white/10 backdrop-blur-3xl border border-white/40 rounded-[2rem] text-left hover:border-brand-500/30 hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-500 relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
    <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-slate-950/20 group-hover:scale-110 group-hover:bg-brand-600 transition-all duration-500 relative z-10">
      {React.cloneElement(icon as React.ReactElement, { size: 20, strokeWidth: 2.5 })}
    </div>
    <div className="relative z-10">
      <h3 className="text-sm font-black text-slate-950 uppercase tracking-widest mb-2">{title}</h3>
      <p className="text-xs text-slate-400 font-medium leading-relaxed">{desc}</p>
    </div>
  </button>
);
