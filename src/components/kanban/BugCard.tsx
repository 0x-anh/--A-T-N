import React, { useMemo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { Bug, UserProfile, PRIORITY_CONFIG, STATUS_COLUMNS, canUserMoveTo } from '../../types';
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
  const assignee = userProfiles.find(u => u.userId === bug.assigneeId);
  const currentUser = userProfiles.find(u => u.userId === userId);
  
  const canMove = useMemo(() => {
    if (isAdmin) return true;
    if (!currentUser?.roles) return false;
    return STATUS_COLUMNS.some(col => col.id !== bug.status && canUserMoveTo(currentUser.roles, col.id));
  }, [currentUser?.roles, bug.status, isAdmin]);

  const isOverdue = useMemo(() => {
    if (bug.status === 'done' || !bug.dueDate) return false;
    return new Date(bug.dueDate) < currentTime;
  }, [bug.status, bug.dueDate, currentTime]);

  return (
    <DraggableAny key={bug.id} draggableId={bug.id} index={index} isDragDisabled={!canMove}>
      {(provided: any, snapshot: any) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "mb-4 outline-none",
            snapshot.isDragging ? "z-[300]" : ""
          )}
          style={{ ...provided.draggableProps.style }}
        >
          <motion.div 
            onClick={() => !snapshot.isDragging && onSelect(bug)}
            className={cn(
               "relative overflow-hidden group p-5 rounded-[2rem] border transition-all duration-500",
               snapshot.isDragging 
                ? "border-brand-500 bg-white shadow-2xl ring-4 ring-brand-500/10" 
                : "bg-white/70 backdrop-blur-xl border-white/60 hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1",
               isOverdue && !snapshot.isDragging && "border-rose-200 bg-rose-50/50"
            )}
          >
            {/* Hover Glow Effect */}
            <div className="absolute -inset-full bg-gradient-to-tr from-brand-500/0 via-brand-500/5 to-brand-500/0 rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            
            <div className="relative space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isOverdue ? "bg-rose-500 animate-pulse" :
                      bug.priority === 'critical' ? "bg-rose-500" : 
                      bug.priority === 'high' ? "bg-amber-400" : "bg-emerald-400"
                    )} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
                      {bug.id.split('-').pop()}
                    </span>
                 </div>
                 
                 {bug.assigneeId && (
                    <div className="flex -space-x-2">
                       <img 
                         src={assignee?.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${bug.assigneeId}`} 
                         className="w-8 h-8 rounded-full border-2 border-white shadow-sm ring-2 ring-slate-100 group-hover:ring-brand-500/30 transition-all" 
                         alt=""
                       />
                    </div>
                 )}
              </div>
  
              <h4 className="text-sm font-bold text-slate-800 leading-snug tracking-tight group-hover:text-slate-900 transition-colors line-clamp-2 min-h-[2.5rem]">
                {bug.title}
              </h4>
  
              <div className="flex items-center justify-between pt-3 border-t border-slate-100/50">
                  <div className="px-3 py-1 rounded-full bg-slate-100/50 text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono border border-slate-200/50">
                     {PRIORITY_CONFIG[bug.priority].label}
                  </div>
 
                  {bug.dueDate && (
                    <div className={cn(
                      "flex items-center gap-1.5 text-[10px] font-bold font-mono",
                      isOverdue ? "text-rose-500" : "text-slate-400"
                    )}>
                      <Clock size={12} strokeWidth={2.5} />
                      <span>{new Date(bug.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                  )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </DraggableAny>
  );
});

BugCard.displayName = 'BugCard';

export default BugCard;
