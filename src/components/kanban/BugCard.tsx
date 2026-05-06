import React, { useMemo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { motion } from 'motion/react';
import { Clock, Hash, AlertCircle, Zap, Shield } from 'lucide-react';
import { Bug, UserProfile, STATUS_COLUMNS, canUserMoveTo, PRIORITY_CONFIG } from '../../types';
import { cn } from '../../lib/utils';

const DraggableAny = Draggable as any;

interface BugCardProps {
  bug: Bug;
  index: number;
  userProfiles: UserProfile[];
  onSelect: (bug: Bug) => void;
  userId: string;
  isAdmin: boolean;
  currentTime: Date;
}

const BugCard = React.memo(({ bug, index, userProfiles, onSelect, userId, isAdmin, currentTime }: BugCardProps) => {
  const currentUser = userProfiles.find(u => u.userId === userId);
  
  const members = useMemo(() => {
    const ids = bug.members || (bug.assigneeId ? [bug.assigneeId] : []);
    return userProfiles.filter(u => ids.includes(u.userId));
  }, [bug.members, bug.assigneeId, userProfiles]);

  const canMove = useMemo(() => {
    if (isAdmin) return true;
    if (!currentUser?.roles) return false;
    return STATUS_COLUMNS.some(col => col.id !== bug.status && canUserMoveTo(currentUser.roles, col.id));
  }, [currentUser?.roles, bug.status, isAdmin]);

  const isOverdue = useMemo(() => {
    if (bug.status === 'done' || !bug.dueDate) return false;
    return new Date(bug.dueDate) < currentTime;
  }, [bug.status, bug.dueDate, currentTime]);

  const priorityMeta = useMemo(() => {
    const cfg = PRIORITY_CONFIG[bug.priority];
    switch(bug.priority) {
      case 'critical': return { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', icon: <cfg.icon size={10} />, label: cfg.label };
      case 'high': return { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', icon: <cfg.icon size={10} />, label: cfg.label };
      default: return { color: 'text-brand-400', bg: 'bg-brand-500/10', border: 'border-brand-500/30', icon: <cfg.icon size={10} />, label: cfg.label };
    }
  }, [bug.priority]);

  const hasFooter = !!(bug.dueDate || (bug.members && bug.members.length > 0));

  return (
    <DraggableAny key={bug.id} draggableId={bug.id} index={index} isDragDisabled={!canMove}>
      {(provided: any, snapshot: any) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "mb-3 outline-none transition-all",
            snapshot.isDragging ? "z-[300]" : ""
          )}
          style={{ ...provided.draggableProps.style }}
        >
          <motion.div 
            onClick={() => !snapshot.isDragging && onSelect(bug)}
            className={cn(
               "relative overflow-hidden group p-3.5 rounded-xl border transition-all duration-300",
               snapshot.isDragging 
                ? "border-brand-500/50 bg-slate-900 shadow-2xl scale-[1.05] ring-1 ring-brand-500/40" 
                : "bg-slate-950 border-white/5 hover:border-brand-500/40 hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-0.5",
               isOverdue && !snapshot.isDragging && "border-rose-500/60 bg-slate-950 shadow-[0_0_20px_rgba(244,63,94,0.2)] animate-pulse-slow"
            )}
          >
            {/* Clean Background */}

            {/* Status Accent Line (Glowing) */}
            <div className={cn(
              "absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5",
              isOverdue ? "bg-rose-500 shadow-[2px_0_15px_rgba(244,63,94,0.4)]" :
              bug.priority === 'critical' ? "bg-violet-500 shadow-[2px_0_15px_rgba(139,92,246,0.4)]" : 
              bug.priority === 'high' ? "bg-amber-400 shadow-[2px_0_15px_rgba(251,191,36,0.4)]" : "bg-brand-500 shadow-[2px_0_15px_rgba(99,102,241,0.4)]"
            )} />

            <div className="relative pl-1.5 space-y-2.5">
              {/* Top Row: Basic Meta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-white/5 rounded text-[8px] font-bold text-slate-500 font-mono border border-white/5 uppercase tracking-widest">
                  <Hash size={8} />
                  <span>{bug.id.split('-').pop()?.substring(0, 6)}</span>
                </div>
                
                {/* Priority Indicator */}
                <div className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] font-black tracking-widest font-mono uppercase",
                  priorityMeta.bg, priorityMeta.color, priorityMeta.border
                )}>
                  {priorityMeta.icon}
                  {priorityMeta.label}
                </div>
              </div>

              {/* Alert Row: Dedicated space for critical status markers */}
              {(isOverdue || bug.status === 'in-review') && (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {isOverdue && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500/10 border border-rose-500/30 rounded-md">
                      <div className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-[7px] font-black text-rose-500 tracking-[0.1em] uppercase">OVERDUE_SIGNAL</span>
                    </div>
                  )}
                  {bug.status === 'in-review' && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-md">
                      <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse shadow-[0_0_5px_rgba(245,158,11,0.5)]" />
                      <span className="text-[7px] font-black text-amber-600 tracking-[0.1em] uppercase">NEEDS_REVIEW</span>
                    </div>
                  )}
                </div>
              )}

              {/* Task Title (High Contrast) */}
              <h4 className="text-sm font-bold text-slate-200 leading-[1.3] group-hover:text-white transition-colors line-clamp-3 tracking-tight pt-1">
                {bug.title}
              </h4>

              {/* Bottom Row: Date & Assignee Stack */}
              {hasFooter && (
                <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                  <div className="flex items-center gap-3">
                     {bug.dueDate && (
                      <div className={cn(
                        "flex items-center gap-1.5 text-[9px] font-bold font-mono tracking-tighter px-1.5 py-0.5 rounded border",
                        isOverdue ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-white/5 text-slate-500 border-white/5"
                      )}>
                        <Clock size={10} />
                        <span>{new Date(bug.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                      </div>
                    )}
                  </div>

                  {/* Avatar Stack */}
                  <div className="flex -space-x-2 overflow-hidden">
                    {members.slice(0, 3).map((m, i) => (
                      <div key={m.userId} className="relative group/avatar" style={{ zIndex: 10 - i }}>
                         <img 
                            src={m.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${m.userId}`} 
                            className="w-6 h-6 rounded-lg border-2 border-slate-950 shadow-sm transition-transform group-hover/avatar:scale-125 group-hover/avatar:z-50" 
                            alt={m.displayName}
                         />
                      </div>
                    ))}
                    {members.length > 3 && (
                      <div className="w-6 h-6 rounded-lg border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[8px] font-black text-white relative z-0">
                        +{members.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </DraggableAny>
  );
});

BugCard.displayName = 'BugCard';

export default BugCard;
