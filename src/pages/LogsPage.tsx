import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Clock, User, MessageSquare, Terminal } from 'lucide-react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';

interface LogsPageProps {
  projectId: string;
}

const LogsPage = ({ projectId }: LogsPageProps) => {
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
            <h2 className="text-2xl font-black text-slate-950 tracking-tight uppercase leading-none">Danh_SÁch_Nhân_Sự</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono mt-2">Live_Telemetry_Relay</p>
          </div>
        </div>
      </header>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Đang tải dữ liệu...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20">
            <Terminal className="w-12 h-12 text-slate-100 mx-auto mb-4" />
            <h3 className="text-xs font-black text-slate-950 uppercase tracking-widest">Năng suất khởi tạo</h3>
          </div>
        ) : (
          <div className="space-y-8">
            {logs.map((log, i) => (
              <div key={log.id} className="flex gap-6 group relative">
                {i !== logs.length - 1 && (
                  <div className="absolute left-6 top-12 bottom-[-32px] w-[2px] bg-slate-50 group-hover:bg-indigo-50 transition-colors" />
                )}
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                  {log.type === 'comment' ? <MessageSquare size={16} className="text-indigo-500" /> : <Clock size={16} className="text-slate-400" />}
                </div>
                <div className="flex-1 pt-1 pb-6 border-b border-slate-50 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-black text-slate-950 uppercase tracking-tight truncate">
                      {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleString() : 'Just now'}
                    </h3>
                    <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono flex items-center gap-2">
                      <User size={10} />
                      {log.userName || 'System'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-950 leading-relaxed tracking-tight">
                    {log.content || log.message || 'Hệ thống đã thực hiện một tác vụ tự động.'}
                  </p>
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
