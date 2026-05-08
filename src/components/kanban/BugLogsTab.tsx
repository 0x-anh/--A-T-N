import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Trash2, Send, Activity } from 'lucide-react';
import { UserProfile } from '../../types';

interface BugLogsTabProps {
  comments: any[];
  userProfiles: UserProfile[];
  userId: string;
  isAdmin: boolean;
  onDeleteComment: (commentId: string) => Promise<void>;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  newComment: string;
  setNewComment: (val: string) => void;
  onAddComment: () => Promise<void>;
  t: (key: string) => string;
}

const BugLogsTab = ({
  comments,
  userProfiles,
  userId,
  isAdmin,
  onDeleteComment,
  bottomRef,
  newComment,
  setNewComment,
  onAddComment,
  t
}: BugLogsTabProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
        {comments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-40 py-20 text-center">
            <MessageSquare size={40} className="text-slate-950 mb-4" />
            <p className="text-xs font-black text-slate-950 uppercase tracking-[0.2em]">{t('kanban.empty_data_stream')}_</p>
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-4 group">
                 <img src={userProfiles.find(u => u.userId === c.userId)?.photoURL} className="w-10 h-10 rounded-xl object-cover shrink-0 border-2 border-slate-300 shadow-sm" alt="" />
                 <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black text-slate-950 uppercase tracking-wider">{c.userName}</span>
                       <span className="text-[8px] font-black text-slate-950 font-mono">
                         {c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString() : 'SIGNAL_RECEIVING...'}
                       </span>
                    </div>
                    <div className="p-5 bg-white/40 border-2 border-slate-200 rounded-2xl rounded-tl-none group-hover:bg-white/60 transition-all relative">
                       <p className="text-xs text-slate-950 leading-relaxed font-black">{c.content}</p>
                       
                       {(c.userId === userId || isAdmin) && (
                         <button 
                           onClick={() => onDeleteComment(c.id)}
                           className="absolute top-2 right-2 p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                         >
                           <Trash2 size={12} />
                         </button>
                       )}
                    </div>
                 </div>
              </div>
            ))}
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </div>

      <div className="p-8 pt-6 bg-white/60 backdrop-blur-2xl border-t-2 border-slate-400/50 flex gap-4 items-end -mx-10 -mb-10">
        <div className="flex-1 relative">
          <textarea 
            placeholder={t('kanban.input_feedback_placeholder')}
            className="w-full bg-white/40 border-2 border-slate-400 rounded-2xl p-5 text-xs font-black text-slate-950 outline-none h-24 placeholder:text-slate-950/80 resize-none custom-scrollbar focus:border-brand-600 transition-all uppercase"
            value={newComment} 
            onChange={(e) => setNewComment(e.target.value)}
          />
        </div>
        <button 
          onClick={onAddComment} 
          disabled={!newComment.trim()}
          className="h-24 w-24 bg-brand-600 text-white rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-brand-700 transition-all shadow-xl shadow-brand-600/30 disabled:opacity-20 group"
        >
          <Send size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest">SEND</span>
        </button>
      </div>
    </div>
  );
};

export default BugLogsTab;
