import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';
import { Bug, BugStatus, UserProfile } from '../../types';
import { cn } from '../../lib/utils';
import BugCard from './BugCard';

interface KanbanColumnProps {
  title: string;
  tasks: Bug[];
  status: BugStatus;
  userProfiles: UserProfile[];
  onSelect: (bug: Bug) => void;
  isAdding: boolean;
  setIsAdding: (status: BugStatus | null) => void;
  newBugTitle: string;
  setNewBugTitle: (title: string) => void;
  handleAddBug: (status: BugStatus) => void;
  userId: string;
  isAdmin: boolean;
}

const KanbanColumn = React.memo(({ 
  title, tasks, status, userProfiles, onSelect, 
  isAdding, setIsAdding, newBugTitle, setNewBugTitle, 
  handleAddBug, userId, isAdmin 
}: KanbanColumnProps) => {
  return (
    <div className="flex-1 min-w-[280px] max-w-[450px] h-full flex flex-col px-1.5">
      <div className="py-2 md:py-3 flex items-center justify-between px-2 md:px-3">
        <div className="flex items-center gap-1.5">
           <div className="relative flex items-center justify-center">
              <div className={cn(
                "w-1 h-6 rounded-full relative z-10 transition-all duration-700",
                status === 'backlog' ? "bg-slate-950" :
                status === 'in-progress' ? "bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]" :
                status === 'in-review' ? "bg-brand-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" : "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
              )} />
           </div>
           <div>
              <h3 className="text-sm md:text-base font-heading font-black text-slate-950 uppercase tracking-tighter leading-none whitespace-nowrap">{title}</h3>
           </div>
        </div>
        <div className="flex items-center gap-1.5">
           <div className="px-3 py-1.5 bg-slate-950 text-white rounded-xl text-[10px] font-black font-mono shadow-xl shadow-slate-950/20">
              {tasks.length.toString().padStart(2, '0')}
           </div>
           <button 
             onClick={() => setIsAdding(isAdding ? null : status)}
             className={cn(
               "w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 bg-white text-slate-300 hover:text-slate-950 hover:bg-slate-50 transition-all duration-500 group relative overflow-hidden", 
               isAdding && "bg-slate-950 text-white border-transparent"
             )}
           >
             <Plus size={14} strokeWidth={3} className={cn("transition-transform duration-700 relative z-10", isAdding ? "rotate-45" : "group-hover:rotate-90")} />
           </button>
        </div>
      </div>

      <Droppable droppableId={status}>
        {(provided: any, snapshot: any) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={cn(
              "flex-1 overflow-y-auto no-scrollbar transition-all duration-300 bg-white/40 rounded-[2rem] p-4 border border-slate-100/50 shadow-[inset_0_-20px_40px_-20px_rgba(0,0,0,0.02)] relative",
              snapshot.isDraggingOver && "bg-slate-100/50 border-brand-200/50"
            )}
          >
            {snapshot.isDraggingOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-4 border-2 border-dashed border-brand-500/20 rounded-[1.5rem] pointer-events-none z-0"
              />
            )}
            <AnimatePresence>
              {isAdding && (
                <motion.div 
                  initial={{ opacity: 0, y: 30, scale: 0.9 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -30, scale: 0.9 }} 
                  className="p-1 bg-white border border-brand-500/20 rounded-[2.5rem] mb-8 shadow-3xl shadow-brand-500/10 overflow-hidden"
                >
                  <div className="p-8">
                    <div className="text-[10px] font-black text-brand-600 uppercase tracking-[0.3em] mb-6 font-mono flex items-center gap-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                       THIẾT LẬP MỚI
                    </div>
                    <textarea
                      autoFocus
                      rows={3}
                      className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-950 outline-none placeholder:text-slate-200 mb-8 resize-none font-sans tracking-tight italic"
                      placeholder="Nhập nội dung công việc..."
                      value={newBugTitle}
                      onChange={(e) => setNewBugTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleAddBug(status);
                        }
                        if (e.key === 'Escape') setIsAdding(null);
                      }}
                    />
                    <div className="flex gap-4">
                      <button 
                        onClick={() => handleAddBug(status)} 
                        className="flex-1 h-14 bg-slate-950 text-white rounded-[1.5rem] text-[11px] font-black hover:bg-brand-600 transition-all uppercase tracking-[0.3em] shadow-2xl shadow-slate-950/20 active:scale-95 italic"
                      >
                        Khởi tạo
                      </button>
                      <button 
                        onClick={() => setIsAdding(null)} 
                        className="h-14 px-8 text-[11px] font-black text-slate-400 hover:text-slate-950 transition-all uppercase tracking-widest font-mono italic"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="min-h-[200px] space-y-0.5 pb-20">
              {tasks.map((bug, index) => (
                <BugCard 
                  key={bug.id} 
                  bug={bug} 
                  index={index} 
                  userProfiles={userProfiles} 
                  onSelect={onSelect} 
                  userId={userId} 
                  isAdmin={isAdmin} 
                />
              ))}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
    </div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;
