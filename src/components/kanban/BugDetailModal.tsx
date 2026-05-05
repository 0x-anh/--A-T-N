import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, Lock, ShieldCheck, MessageSquare, Clock } from 'lucide-react';
import { 
  Bug, BugStatus, BugPriority, UserProfile, UserRole, 
  STATUS_COLUMNS, PRIORITY_CONFIG, ROLE_CONFIG, 
  canEditBug, canDeleteBug, canUserMoveTo 
} from '../../types';
import { cn } from '../../lib/utils';

interface BugDetailModalProps {
  selectedBug: Bug | null;
  onClose: () => void;
  userProfiles: UserProfile[];
  userId: string;
  isAdmin: boolean;
  handleUpdateBugDetails: (bugId: string, updates: Partial<Bug>) => void;
  handleDeleteBug: (bugId: string) => void;
  logActivity: (bugId: string, type: string, content: string) => void;
  comments: any[];
  newComment: string;
  setNewComment: (val: string) => void;
  handleAddComment: () => void;
  bottomRef: React.RefObject<HTMLDivElement>;
}

const BugDetailModal = ({
  selectedBug,
  onClose,
  userProfiles,
  userId,
  isAdmin,
  handleUpdateBugDetails,
  handleDeleteBug,
  logActivity,
  comments,
  newComment,
  setNewComment,
  handleAddComment,
  bottomRef
}: BugDetailModalProps) => {
  if (!selectedBug) return null;

  const currentUserProfile = userProfiles.find(u => u.userId === userId);
  const userRoles = currentUserProfile?.roles;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }} 
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative w-full max-w-6xl h-[90vh] bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-5xl overflow-hidden flex flex-col md:flex-row border border-white/20"
        >
          {/* Left: Main Content */}
          <div className="flex-1 overflow-y-auto p-8 md:p-16 space-y-12 custom-scrollbar">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg",
                    selectedBug.status === 'done' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-brand-500 text-white shadow-brand-500/20"
                  )}>
                    {selectedBug.status.replace('-', ' ')}
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 font-mono tracking-widest uppercase">
                    Ref_ID: {selectedBug.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                {(isAdmin || canDeleteBug(userRoles)) && (
                  <button 
                    onClick={() => handleDeleteBug(selectedBug.id)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300 shadow-sm"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              <div className="relative group/title">
                <textarea 
                  rows={2}
                  className="w-full text-xl md:text-3xl font-heading font-black text-slate-950 outline-none border-none p-0 bg-transparent tracking-tighter leading-tight resize-none placeholder:text-slate-100 disabled:cursor-not-allowed uppercase"
                  placeholder="TIÊU ĐỀ NÚT..."
                  value={selectedBug.title}
                  disabled={!isAdmin && !canEditBug(userRoles, selectedBug.status)}
                  onChange={(e) => handleUpdateBugDetails(selectedBug.id, { title: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 py-10 border-y border-slate-50">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Trạng thái</label>
                <select 
                  value={selectedBug.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as BugStatus;
                    if (!isAdmin && !canUserMoveTo(userRoles, newStatus)) {
                      return;
                    }
                    handleUpdateBugDetails(selectedBug.id, { status: newStatus });
                    logActivity(selectedBug.id, 'STATUS_UPDATE', `Di chuyển sang ${newStatus}`);
                  }}
                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none cursor-pointer uppercase tracking-widest appearance-none hover:border-brand-500 transition-all"
                >
                  {STATUS_COLUMNS.map(col => (
                    <option key={col.id} value={col.id}>{col.label.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  Độ ưu tiên
                  {!isAdmin && !canEditBug(userRoles, selectedBug.status) && <Lock size={8} className="text-slate-300" />}
                </label>
                <select 
                  value={selectedBug.priority}
                  onChange={(e) => handleUpdateBugDetails(selectedBug.id, { priority: e.target.value as BugPriority })}
                  disabled={!isAdmin && !canEditBug(userRoles, selectedBug.status)}
                  className={cn(
                    "w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none uppercase tracking-widest appearance-none transition-all",
                    !isAdmin && !canEditBug(userRoles, selectedBug.status) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-brand-500"
                  )}
                >
                  {(Object.entries(PRIORITY_CONFIG) as [BugPriority, any][]).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  Nhân sự
                  {!isAdmin && !canEditBug(userRoles, selectedBug.status) && <Lock size={8} className="text-slate-300" />}
                </label>
                <div className="space-y-2">
                  <select 
                    value={selectedBug.assigneeId || ''}
                    onChange={(e) => handleUpdateBugDetails(selectedBug.id, { assigneeId: e.target.value })}
                    disabled={!isAdmin && !canEditBug(userRoles, selectedBug.status)}
                    className={cn(
                      "w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-xs font-bold text-slate-900 outline-none uppercase tracking-widest appearance-none transition-all",
                      !isAdmin && !canEditBug(userRoles, selectedBug.status) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-brand-500"
                    )}
                  >
                    <option value="">CHƯA GIAO</option>
                    {userProfiles.map(u => <option key={u.userId} value={u.userId}>{u.displayName.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                Chi tiết kỹ thuật
                {!isAdmin && !canEditBug(userRoles, selectedBug.status) && <Lock size={10} className="text-slate-300" />}
              </label>
              <textarea 
                placeholder="Mô tả chi tiết các thông số kỹ thuật..."
                className="w-full h-48 bg-transparent border-none p-0 text-sm text-slate-600 outline-none leading-relaxed placeholder:text-slate-200 resize-none custom-scrollbar disabled:opacity-60"
                value={selectedBug.description || ''}
                disabled={!isAdmin && !canEditBug(userRoles, selectedBug.status)}
                onChange={(e) => handleUpdateBugDetails(selectedBug.id, { description: e.target.value })}
              />
            </div>
          </div>

          {/* Right: Interaction Log Section */}
          <div className="w-full md:w-[320px] lg:w-[400px] border-t md:border-t-0 md:border-l border-slate-100 flex flex-col bg-slate-50">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-1 h-3 bg-brand-500 rounded-full" />
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">NHẬT KÝ HỆ THỐNG</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
                  <MessageSquare size={20} className="text-slate-400 mb-4" />
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Dữ liệu trống_</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {comments.map((c) => (
                    <div key={c.id} className="group/log relative">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[9px] font-black text-slate-900 uppercase tracking-wider">{c.userName}</span>
                        <span className="text-[8px] font-bold text-slate-300 font-mono ml-auto">
                          {c.createdAt?.toDate ? new Date(c.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'VỪA XONG_'}
                        </span>
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm transition-all">
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} className="h-1" />
                </div>
              )}
            </div>

            <div className="p-8 bg-white border-t border-slate-100 space-y-4">
              <textarea 
                placeholder="Tham gia thảo luận..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-xs font-bold text-slate-900 outline-none h-32 placeholder:text-slate-200 resize-none custom-scrollbar focus:border-brand-500"
                value={newComment} 
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
              />
              <button 
                onClick={handleAddComment} 
                disabled={!newComment.trim()}
                className="w-full h-11 bg-slate-900 text-white rounded-xl text-[9px] font-black hover:bg-black transition-all shadow-xl disabled:opacity-20 uppercase tracking-[0.3em]"
              >
                Gửi phản hồi
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BugDetailModal;
