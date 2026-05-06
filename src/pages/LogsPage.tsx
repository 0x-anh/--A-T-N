import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Clock, User, Shield, Terminal, Filter, Cpu, Mail, Zap, CheckCircle2 } from 'lucide-react';
import { useLogs } from '../hooks/useLogs';
import { UserProfile, Project } from '../types';
import { cn } from '../lib/utils';

interface LogsPageProps {
  selectedProject: Project | null;
  userId: string;
  userProfiles: UserProfile[];
}

const LogsPage = ({ selectedProject, userId, userProfiles }: LogsPageProps) => {
  const { logs } = useLogs(selectedProject?.id);
  const [filterType, setFilterType] = useState<'all' | 'system' | 'admin'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredLogs = React.useMemo(() => {
    if (filterType === 'all') return logs;
    return logs.filter(log => {
      const isRemoval = 
        log.action?.toLowerCase().includes('remove') || 
        log.action?.toLowerCase().includes('decline') ||
        log.details?.toLowerCase().includes('xóa') ||
        log.details?.toLowerCase().includes('giải phóng') ||
        log.details?.toLowerCase().includes('từ chối');
        
      if (filterType === 'admin') return isRemoval;
      if (filterType === 'system') return !isRemoval;
      return true;
    });
  }, [logs, filterType]);

  const stats = {
    total: logs.length,
    system: logs.filter(l => !l.action?.toLowerCase().includes('remove') && !l.action?.toLowerCase().includes('decline')).length,
    admin: logs.filter(l => l.action?.toLowerCase().includes('remove') || l.action?.toLowerCase().includes('decline')).length,
    health: 100
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-8 w-full max-w-7xl mx-auto py-6 font-sans selection:bg-brand-500/20"
    >
      {/* Overview Style Header */}
      <header className="flex flex-col gap-8 mb-8 relative px-4">
        <div className="flex items-center justify-between border-b border-slate-200/50 pb-8">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h3 className="text-[11px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono leading-none mb-2">QUẢN TRỊ RƠ-LE</h3>
              <h2 className="text-4xl md:text-5xl font-heading font-black tracking-tighter uppercase leading-none text-slate-950">
                NHẬT KÝ <span className="text-slate-400">VẬN HÀNH</span>
              </h2>
            </div>
            <div className="hidden lg:block w-[1px] h-16 bg-slate-200" />
            <div className="hidden lg:block max-w-xs">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                Giám sát toàn bộ luồng dữ liệu và lịch sử tương tác trên các Node dự án {selectedProject?.name}.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4">
             {/* Filter Dropdown */}
             <div className="relative">
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={cn(
                    "h-10 px-5 rounded-xl border-2 transition-all flex items-center gap-3 group/filter",
                    filterType !== 'all' 
                      ? "bg-slate-950 text-white border-slate-950 shadow-lg" 
                      : "bg-white/60 backdrop-blur-md text-slate-400 border-slate-300/40 hover:text-slate-900 hover:border-slate-400"
                  )}
                >
                   <Filter size={16} className={cn("transition-transform duration-500", showFilterMenu && "rotate-180")} />
                   <span className="text-[9px] font-black uppercase tracking-widest">
                     {filterType === 'all' ? 'Bộ lọc luồng' : `Đang lọc: ${filterType === 'system' ? 'Hệ thống' : 'Quản trị'}`}
                   </span>
                </button>

                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-52 bg-white/90 backdrop-blur-3xl rounded-2xl border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-50 overflow-hidden p-1.5"
                    >
                       {[
                         { id: 'all', label: 'Tất cả dữ liệu', icon: Activity },
                         { id: 'system', label: 'Luồng hệ thống', icon: Shield },
                         { id: 'admin', label: 'Lệnh quản trị', icon: Cpu },
                       ].map((f) => (
                         <button
                           key={f.id}
                           onClick={() => {
                             setFilterType(f.id as any);
                             setShowFilterMenu(false);
                           }}
                           className={cn(
                             "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all text-left",
                             filterType === f.id 
                               ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" 
                               : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                           )}
                         >
                           <f.icon size={14} className={cn(filterType === f.id ? "text-brand-400" : "text-slate-400")} />
                           {f.label}
                         </button>
                       ))}
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>

             <div className="flex flex-col items-end gap-1 group cursor-default">
                <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-heading font-black text-slate-950 tracking-tighter tabular-nums leading-none">
                     {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                   </span>
                   <span className="text-[10px] font-black text-slate-400 uppercase font-mono">{currentTime.getHours() >= 12 ? 'PM' : 'AM'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-500/5 border border-brand-500/10 rounded-full">
                   <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                   <span className="text-[8px] font-black text-brand-600 uppercase tracking-[0.2em] font-mono">DÒNG DỮ LIỆU LIVE</span>
                </div>
             </div>
          </div>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
        {[
          { label: 'Tổng sự kiện', value: stats.total, icon: <Activity />, trend: 'DỮ LIỆU' },
          { label: 'Log Hệ thống', value: stats.system, icon: <Shield />, trend: 'AN TOÀN' },
          { label: 'Log Quản trị', value: stats.admin, icon: <Cpu />, trend: 'QUYỀN HẠN' },
          { label: 'Trạng thái', value: `${stats.health}%`, icon: <CheckCircle2 />, trend: 'HOẠT ĐỘNG' },
        ].map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/40 backdrop-blur-3xl p-6 rounded-3xl border border-white/60 shadow-sm tech-corners group hover:bg-white transition-all duration-500"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                {s.icon}
              </div>
              <span className="text-[9px] font-black text-brand-600 bg-brand-50 px-2 py-1 rounded-lg uppercase tracking-widest font-mono">
                {s.trend}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</span>
              <span className="text-3xl font-heading font-black text-slate-950 tracking-tighter">{s.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto relative px-4 pt-10">
        {/* Timeline Bar */}
        <div className="absolute left-1/2 top-10 bottom-0 w-[1px] bg-gradient-to-b from-slate-200 via-slate-200 to-transparent hidden md:block" />

        <div className="space-y-10 relative z-10">
          <AnimatePresence mode="popLayout">
            {filteredLogs.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                className="text-center py-24 bg-white/30 backdrop-blur-md rounded-[2.5rem] border-2 border-dashed border-slate-200"
              >
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Terminal size={32} className="text-slate-200" />
                 </div>
                 <h3 className="text-lg font-bold text-slate-400 uppercase tracking-widest">Không có luồng dữ liệu</h3>
                 <p className="text-slate-300 text-xs mt-2 font-mono">AWAITING_SYSTEM_ACTIVITY...</p>
              </motion.div>
            ) : (
              filteredLogs.map((log, idx) => {
                const date = log.timestamp?.toDate?.() || new Date();
                const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const dateStr = date.toLocaleDateString('vi-VN');
                const isRemoval = 
                  log.action?.toLowerCase().includes('remove') || 
                  log.action?.toLowerCase().includes('decline') ||
                  log.details?.toLowerCase().includes('xóa') ||
                  log.details?.toLowerCase().includes('giải phóng') ||
                  log.details?.toLowerCase().includes('từ chối');
                
                const userPhoto = log.userPhoto || userProfiles.find(u => u.userId === log.userId)?.photoURL;
                const userEmail = log.userEmail || userProfiles.find(u => u.userId === log.userId)?.email || 'Hệ thống';

                return (
                  <motion.div 
                    key={log.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "flex flex-col md:flex-row items-center gap-10 group",
                      idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                    )}
                  >
                    {/* Log Card */}
                    <div className={cn(
                      "flex-1 w-full bg-white/40 backdrop-blur-3xl p-7 rounded-[2rem] border border-white/60 shadow-sm hover:shadow-xl hover:bg-white transition-all duration-500 relative tech-corners",
                      isRemoval ? "hover:border-rose-200/50" : "hover:border-brand-500/30"
                    )}>
                       <div className="flex items-center justify-between mb-5">
                          <div className={cn(
                            "px-3 py-1 rounded-lg flex items-center gap-2",
                            isRemoval ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-brand-50 text-brand-600 border border-brand-100"
                          )}>
                             <span className="text-[8px] font-black uppercase tracking-widest font-mono">
                               {log.action?.replace(/_/g, ' ')}
                             </span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] tabular-nums">
                             <Clock size={12} />
                             <span>{timeStr}</span>
                          </div>
                       </div>

                       <p className="text-sm font-bold text-slate-800 leading-relaxed mb-6 break-all whitespace-pre-wrap">
                         {log.details || log.action}
                       </p>

                       <div className="flex items-center justify-between pt-5 border-t border-slate-100/50">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white ring-2 ring-white shadow-sm overflow-hidden">
                                {userPhoto ? (
                                  <img src={userPhoto} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <User size={14} />
                                )}
                             </div>
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{log.userName}</span>
                                <div className="flex items-center gap-1 text-slate-400">
                                   <Mail size={8} />
                                   <span className="text-[9px] font-medium font-mono">{userEmail}</span>
                                </div>
                             </div>
                          </div>
                          <div className="text-right">
                             <span className="block text-[8px] font-black text-slate-300 uppercase tracking-widest mb-0.5">MÃ NHẬT KÝ</span>
                             <span className="text-[9px] font-bold text-slate-400 font-mono">{log.id?.slice(0, 8).toUpperCase()}</span>
                          </div>
                       </div>
                    </div>

                    {/* Timeline Node */}
                    <div className="relative z-20 flex items-center justify-center">
                       <div className={cn(
                         "w-12 h-12 rounded-xl bg-white shadow-xl flex items-center justify-center border border-slate-100 transition-all duration-500 group-hover:scale-110 group-hover:border-brand-500/30",
                         isRemoval ? "text-rose-500" : "text-brand-500"
                       )}>
                          <Activity size={20} className="group-hover:animate-pulse" />
                       </div>
                    </div>

                    {/* Balance Spacer */}
                    <div className="flex-1 hidden md:block" />
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default LogsPage;
