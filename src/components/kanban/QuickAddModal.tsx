import React from 'react';
import { motion } from 'motion/react';
import { X, Zap, Cpu, Terminal, ShieldAlert, Plus } from 'lucide-react';
import { BugPriority, PRIORITY_CONFIG } from '../../types';
import { cn } from '../../lib/utils';

interface QuickAddModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  setTitle: (val: string) => void;
  priority: BugPriority;
  setPriority: (val: BugPriority) => void;
  onSubmit: () => void;
}

const QuickAddModal = ({
  show,
  onClose,
  title,
  setTitle,
  priority,
  setPriority,
  onSubmit
}: QuickAddModalProps) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-5xl border border-white/20 overflow-hidden"
      >
         <div className="p-10 md:p-14">
            <div className="flex items-center justify-between mb-12">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-white shadow-2xl shadow-slate-950/20">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Khởi tạo nhanh</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60 font-mono">System Protocol v4.2</p>
                  </div>
               </div>
               <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-all">
                  <X size={20} className="text-slate-300" />
               </button>
            </div>

            <div className="space-y-10">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block font-mono">Nội dung công việc</label>
                  <textarea 
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Mô tả ngắn gọn mục tiêu..."
                    className="w-full bg-slate-50 border-none rounded-3xl p-6 text-sm font-bold text-slate-900 placeholder:text-slate-200 focus:ring-4 focus:ring-slate-950/5 transition-all outline-none min-h-[120px] resize-none"
                  />
               </div>

               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block font-mono">Độ ưu tiên</label>
                  <div className="grid grid-cols-3 gap-3">
                     {(['low', 'high', 'critical'] as BugPriority[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPriority(p)}
                          className={cn(
                            "py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                            priority === p 
                              ? "bg-slate-950 border-transparent text-white shadow-xl shadow-slate-950/20" 
                              : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                           {PRIORITY_CONFIG[p].label}
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            <button 
              onClick={onSubmit}
              className="w-full h-16 bg-slate-950 text-white rounded-[1.5rem] mt-12 text-[11px] font-black uppercase tracking-[0.4em] hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-950/20 flex items-center justify-center gap-3 active:scale-95 italic"
            >
               <Plus size={16} strokeWidth={3} />
               Triển khai giao thức
            </button>
         </div>
      </motion.div>
    </div>
  );
};

export default QuickAddModal;
