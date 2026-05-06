import React from 'react';
import { motion } from 'motion/react';
import { Terminal, X, Activity } from 'lucide-react';

interface DocsModalProps {
  show: boolean;
  onClose: () => void;
}

const DocsModal = ({ show, onClose }: DocsModalProps) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative z-[710] bg-white border border-slate-200 shadow-6xl rounded-[3rem]"
      >
        <div className="px-14 py-12 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-brand-600 text-white flex items-center justify-center rounded-[1.5rem] shadow-2xl shadow-brand-500/20">
              <Terminal size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-950 tracking-[-0.05em] uppercase leading-none">System_Core v4.2</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono mt-2">Internal_Reference_Protocol</p>
            </div>
          </div>
          <button onClick={onClose} className="w-14 h-14 rounded-2xl hover:bg-white hover:shadow-xl transition-all flex items-center justify-center text-slate-400 hover:text-slate-950 border border-transparent hover:border-slate-100">
            <X size={28} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-14 pb-20 space-y-16 custom-scrollbar bg-white">
          <div className="prose prose-slate max-w-none space-y-16">
            <section className="space-y-6">
              <h4 className="text-lg font-black text-slate-950 uppercase tracking-widest font-mono flex items-center gap-4">
                <span className="w-10 h-0.5 bg-brand-500" />
                Tổng quan Giao thức
              </h4>
              <p className="text-base text-slate-500 leading-relaxed font-medium border-l-[6px] border-slate-50 pl-10">Zenith is an automated workspace orchestration layer. Every interaction is synchronized via telemetry relays to Firestore for real-time consistency across all connected elite personnel nodes.</p>
            </section>

            <section className="space-y-6">
              <h4 className="text-lg font-black text-slate-950 uppercase tracking-widest font-mono flex items-center gap-4">
                <span className="w-10 h-0.5 bg-brand-500" />
                Ma trận Công việc
              </h4>
              <p className="text-base text-slate-500 leading-relaxed font-medium border-l-[6px] border-slate-50 pl-10">Utilize the Task Matrix to manage node entries (issues). Drag and drop between columns for instant network-wide state transitions.</p>
            </section>

            <section className="space-y-8 p-12 bg-slate-950 rounded-[2.5rem] text-white">
               <div className="flex items-center gap-4 text-brand-400 font-mono text-xs font-black uppercase tracking-[0.5em]">
                  <Activity size={14} className="animate-pulse" /> Live_Telemetry_Active
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                   <div className="space-y-1">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Uptime_Ratio</div>
                     <div className="text-2xl font-black tracking-tighter">99.998<span className="text-brand-500">%</span></div>
                   </div>
                   <div className="space-y-1">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Sync_Latency</div>
                     <div className="text-2xl font-black tracking-tighter">12<span className="text-brand-500">ms</span></div>
                   </div>
                   <div className="space-y-1">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Health_Check</div>
                     <div className="text-2xl font-black tracking-tighter text-emerald-400">PASS</div>
                   </div>
                   <div className="space-y-1">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Network_Status</div>
                      <div className="text-2xl font-black tracking-tighter text-indigo-400">READY</div>
                   </div>
                </div>
             </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DocsModal;
