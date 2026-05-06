import React from 'react';
import { motion } from 'motion/react';
import { X, Zap, Plus, Clock } from 'lucide-react';
import { BugPriority, PRIORITY_CONFIG } from '../../types';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

interface QuickAddModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  setTitle: (val: string) => void;
  priority: BugPriority;
  setPriority: (val: BugPriority) => void;
  dueDate: string;
  setDueDate: (val: string) => void;
  onSubmit: () => void;
}

const QuickAddModal = ({
  show,
  onClose,
  title,
  setTitle,
  priority,
  setPriority,
  dueDate,
  setDueDate,
  onSubmit
}: QuickAddModalProps) => {
  const { t } = useTranslation();

  if (!show) return null;

  const priorityLabels: Record<BugPriority, string> = {
    'low': t('kanban.priority_low'),
    'medium': t('kanban.priority_medium'),
    'high': t('kanban.priority_high'),
    'critical': t('kanban.priority_critical')
  };

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
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('kanban.deploy_task')}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60 font-mono">System Protocol</p>
                  </div>
               </div>
               <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 transition-all">
                  <X size={20} className="text-slate-300" />
               </button>
            </div>

            <div className="space-y-8">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block font-mono">{t('kanban.node_identity')}</label>
                  <textarea 
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('kanban.node_title_placeholder')}
                    className="w-full bg-slate-50 border-none rounded-3xl p-6 text-sm font-bold text-slate-900 placeholder:text-slate-200 focus:ring-4 focus:ring-slate-950/5 transition-all outline-none min-h-[100px] resize-none"
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block font-mono">{t('kanban.priority')}</label>
                    <div className="flex gap-2">
                      {(['low', 'high', 'critical'] as BugPriority[]).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={cn(
                              "flex-1 py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap",
                              priority === p 
                                ? "bg-brand-500 border-transparent text-white shadow-lg shadow-brand-500/20" 
                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            {priorityLabels[p]}
                          </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 block font-mono flex items-center gap-2">
                      <Clock size={10} />
                      {t('kanban.due_date')}
                    </label>
                    <input 
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 text-[10px] font-black text-slate-900 outline-none focus:ring-4 focus:ring-slate-950/5 transition-all uppercase font-mono"
                    />
                  </div>
               </div>
            </div>

            <button 
              onClick={onSubmit}
              className="w-full h-16 bg-slate-950 text-white rounded-[1.5rem] mt-12 text-[11px] font-black uppercase tracking-[0.4em] hover:bg-brand-500 transition-all shadow-2xl shadow-slate-950/20 flex items-center justify-center gap-3 active:scale-95"
            >
               <Plus size={16} strokeWidth={3} />
               {t('kanban.deploy_task')}
            </button>
         </div>
      </motion.div>
    </div>
  );
};

export default QuickAddModal;
