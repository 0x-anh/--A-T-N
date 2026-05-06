import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Terminal } from 'lucide-react';
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
  isOwner: boolean;
  currentTime: Date;
  projectMemberIds: string[];
}

const KanbanColumn = React.memo(({ 
  title, tasks, status, userProfiles, onSelect, 
  isAdding, setIsAdding, newBugTitle, setNewBugTitle, 
  handleAddBug, userId, isAdmin, isOwner, currentTime, projectMemberIds
}: KanbanColumnProps) => {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = React.useState(false);

  React.useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        // Hiển thị hint nếu chưa cuộn xuống hết và có thể cuộn
        setShowScrollHint(scrollHeight > clientHeight + 10 && scrollTop + clientHeight < scrollHeight - 20);
      }
    };

    const currentRef = scrollRef.current;
    if (currentRef) {
      currentRef.addEventListener('scroll', checkScroll);
      // Kiểm tra lần đầu và sau khi render tasks
      setTimeout(checkScroll, 100);
    }
    return () => currentRef?.removeEventListener('scroll', checkScroll);
  }, [tasks, isAdding]);

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col px-1 relative">
      {/* Column Header */}
      <div className="py-1.5 flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
           <div className={cn(
               "w-1 h-4 rounded-full shadow-sm",
               status === 'backlog' ? "bg-slate-400" :
               status === 'in-progress' ? "bg-amber-500" :
               status === 'in-review' ? "bg-brand-600" : "bg-emerald-600"
             )} />
            <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.15em] font-mono">
              {title}
            </h3>
        </div>
        <div className="flex items-center gap-2">
           <div className="px-2 py-0.5 bg-slate-950/5 border border-slate-200 text-slate-500 rounded text-[10px] font-mono font-bold">
              {tasks.length}
           </div>
        </div>
      </div>

      <Droppable droppableId={status}>
        {(provided: any, snapshot: any) => (
          <div
            {...provided.droppableProps}
            ref={(el) => {
              provided.innerRef(el);
              (scrollRef as any).current = el;
            }}
            className={cn(
              "flex-1 overflow-y-auto no-scrollbar transition-all duration-300 bg-transparent rounded-2xl p-1 relative",
              snapshot.isDraggingOver && "bg-brand-500/[0.04] rounded-2xl"
            )}
          >
            <AnimatePresence>
              {isAdding && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.95 }} 
                  className="p-1 bg-slate-900 border border-brand-500/20 rounded-xl mb-4 shadow-2xl overflow-hidden"
                >
                  <div className="p-4">
                    <div className="text-[9px] font-black text-brand-400 uppercase tracking-widest mb-4 font-mono flex items-center gap-2">
                       <Terminal size={10} />
                       NEW_TASK_INIT
                    </div>
                    <textarea
                      autoFocus
                      rows={2}
                      className="w-full bg-transparent border-none p-0 text-sm font-bold text-white outline-none placeholder:text-slate-600 mb-6 resize-none font-sans tracking-tight"
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
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAddBug(status)} 
                        className="flex-1 h-10 bg-brand-500 text-white rounded-lg text-[10px] font-black hover:bg-brand-600 transition-all uppercase tracking-widest active:scale-95 shadow-lg shadow-brand-500/20"
                      >
                        Khởi tạo
                      </button>
                      <button 
                        onClick={() => setIsAdding(null)} 
                        className="h-10 px-4 text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest font-mono"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="min-h-[200px] space-y-0.5 pb-4 relative z-10">
              {tasks.map((bug, index) => (
                <BugCard 
                  key={bug.id} 
                  bug={bug} 
                  index={index} 
                  userProfiles={userProfiles} 
                  onSelect={onSelect} 
                  userId={userId} 
                  isAdmin={isAdmin} 
                  isOwner={isOwner}
                  currentTime={currentTime}
                  projectMemberIds={projectMemberIds}
                />
              ))}
              {provided.placeholder}
            </div>
            
            {/* Crystal Clear Bottom Area */}
            {showScrollHint && (
              <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-transparent to-transparent pointer-events-none z-20" />
            )}
          </div>
        )}
      </Droppable>

      {/* Scroll Indicator Hint - Premium Industrial HUD Style */}
      <AnimatePresence>
        {showScrollHint && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1 cursor-pointer pointer-events-auto"
            onClick={() => {
               if (scrollRef.current) {
                 scrollRef.current.scrollBy({ top: 200, behavior: 'smooth' });
               }
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
             <div className="group relative flex flex-col items-center">
                {/* Tech Glow Background */}
                <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Main HUD Button */}
                <div className="relative px-5 py-2 bg-slate-950/90 backdrop-blur-xl rounded-full border border-brand-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)] flex items-center gap-3 overflow-hidden">
                   {/* Decorative corner lines */}
                   <div className="absolute top-0 left-4 w-2 h-[1px] bg-brand-500/40" />
                   <div className="absolute bottom-0 right-4 w-2 h-[1px] bg-brand-500/40" />
                   
                   <div className="flex items-center gap-2">
                      <div className="relative flex items-center justify-center">
                         <div className="w-2 h-2 rounded-full bg-brand-500 animate-ping absolute" />
                         <div className="w-1.5 h-1.5 rounded-full bg-brand-500 relative" />
                      </div>
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] font-mono whitespace-nowrap">XEM THÊM</span>
                   </div>
                   
                   <div className="h-4 w-[1px] bg-white/10" />
                   
                   <motion.div 
                     animate={{ y: [0, 3, 0] }}
                     transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                     className="text-brand-400"
                   >
                      <Plus size={12} className="rotate-45" /> {/* Using Plus as a tech-cross but styled better */}
                   </motion.div>
                </div>
                
                {/* Sub-label technical hint */}
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-[0.3em] font-mono mt-1 opacity-60">SYS_DATA_EXPAND</span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

export default KanbanColumn;
