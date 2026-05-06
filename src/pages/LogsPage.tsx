import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Clock, User, MessageSquare, Terminal } from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface LogsPageProps {
  projectId: string;
}

const LogsPage = ({ projectId, userProfiles }: { projectId: string, userProfiles: any[] }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    const q = query(
      collection(db, 'activity_logs'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list', 'activity_logs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-4xl mx-auto py-6"
    >
      <header className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center rounded-2xl shadow-xl">
            <Activity size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase leading-none">Nhật Ký Hệ Thống</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono mt-2">TRUYỀN TẢI DỮ LIỆU TRỰC TIẾP</p>
          </div>
        </div>
      </header>

      <div className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.02)] p-10 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono">Xác Thực Dữ Liệu...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <Terminal className="w-16 h-16 text-slate-200 mx-auto mb-6 opacity-50" />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Hệ thống chưa ghi nhận hoạt động</h3>
          </div>
        ) : (
          <div className="space-y-10 relative">
            {logs.map((log, i) => (
              <div key={log.id} className="flex gap-8 group relative">
                {i !== logs.length - 1 && (
                  <div className="absolute left-[23px] top-14 bottom-[-40px] w-[2px] bg-slate-200/30 group-hover:bg-brand-200 transition-colors" />
                )}
                
                <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shrink-0 border border-white shadow-sm group-hover:scale-110 group-hover:border-brand-500/30 group-hover:shadow-brand-500/10 transition-all duration-500 relative z-10">
                  {log.type === 'comment' ? (
                    <MessageSquare size={18} className="text-brand-500" />
                  ) : (
                    <Clock size={18} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
                  )}
                </div>

                <div className="flex-1 pb-10 border-b border-slate-200/30 last:border-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-heading font-black text-slate-950 tracking-tighter tabular-nums">
                        {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleString('vi-VN', { 
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                          day: '2-digit', month: '2-digit', year: 'numeric'
                        }) : 'Vừa xong'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-[1px] bg-brand-500" />
                        <span className="text-[9px] font-black text-brand-600 uppercase tracking-widest font-mono">XÁC_THỰC_TRẠNG_THÁI</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-950 text-white rounded-xl shadow-lg shadow-slate-950/10 self-start md:self-center">
                       <img 
                         src={userProfiles.find(u => u.userId === log.userId)?.photoURL || log.userPhoto || `https://api.dicebear.com/7.x/notionists/svg?seed=${log.userId || 'system'}`} 
                         className="w-5 h-5 rounded-lg border border-white/20"
                         alt=""
                       />
                       <span className="text-[10px] font-black uppercase tracking-widest">{log.userName || 'System'}</span>
                    </div>
                  </div>

                  <div className="p-5 bg-white/30 rounded-2xl border border-white/40 group-hover:bg-white/60 transition-all duration-500">
                    <p className="text-sm font-bold text-slate-700 leading-relaxed tracking-tight">
                      {log.message || log.details || log.content || 'Hoạt động vận hành hệ thống đã được thực thi thành công.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LogsPage;
