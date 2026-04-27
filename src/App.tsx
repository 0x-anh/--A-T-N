/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  Radio, Rocket, ArrowRight, Layout, LayoutGrid, FolderKanban, PieChart, 
  Zap, LogIn, LogOut, ShieldAlert, Bug as BugIcon, Activity, Cpu, Globe, Database, 
  Terminal, FolderPlus, ChevronDown, ChevronRight, Users, Bell, Search, Plus, 
  Filter, MessageSquare, History, Settings, Lock, CheckCircle2, Check, Shield, ShieldCheck, X,
  UserPlus, Clock, ArrowUpRight, Share2, MoreHorizontal, Orbit, Code2, Mail, Trash2
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { auth, db, handleFirestoreError, testConnection } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc, addDoc, deleteDoc, serverTimestamp, where, orderBy, getDocFromServer, limit } from 'firebase/firestore';
import KanbanBoard from './components/KanbanBoard';
import { cn } from './lib/utils';
import { Project, UserProfile, Bug } from './types';

import { Toaster, toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'metrics' | 'logs' | 'members' | 'dashboard'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [platformStats, setPlatformStats] = useState({
    bandwidth: "1.2 GB/s",
    latency: "24ms",
    activeNodes: 12,
    serverLoad: 42
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPlatformStats(prev => ({
        ...prev,
        bandwidth: `${(1.1 + Math.random() * 0.2).toFixed(1)} GB/s`,
        latency: `${Math.floor(20 + Math.random() * 10)}ms`,
        serverLoad: Math.floor(40 + Math.random() * 15)
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          await setDoc(userRef, {
            userId: u.uid,
            displayName: u.displayName || 'Anonymous User',
            email: u.email,
            photoURL: u.photoURL || ''
          }, { merge: true });
        } catch (e) {
          console.error("Profile sync failed:", e);
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setSelectedProject(null);
      return;
    }
    const q = query(
      collection(db, 'projects'), 
      where('members', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
      setProjects(projList);
      if (projList.length > 0 && !selectedProject) {
        const lastId = localStorage.getItem('lastProjectId');
        const found = projList.find(p => p.id === lastId);
        setSelectedProject(found || projList[0]);
      }
    }, (error) => {
      handleFirestoreError(error, 'list', 'projects');
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('lastProjectId', selectedProject.id);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUserProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      console.warn("User profile sync limited");
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedProject) {
      setBugs([]);
      return;
    }
    const q = query(
      collection(db, 'bugs'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBugs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bug[]);
    }, (error) => {
      handleFirestoreError(error, 'list', 'bugs');
    });
    return () => unsubscribe();
  }, [user, selectedProject]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (startTab?: typeof activeTab) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      if (startTab) setActiveTab(startTab);
      toast.success("Welcome back");
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      toast.error("Authentication failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => auth.signOut();

  const [chartData] = useState([
    { name: 'Mon', value: 12 }, { name: 'Tue', value: 34 }, { name: 'Wed', value: 25 },
    { name: 'Thu', value: 56 }, { name: 'Fri', value: 42 }, { name: 'Sat', value: 18 }, { name: 'Sun', value: 29 },
  ]);

  const [projectLogs, setProjectLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !selectedProject) return;
    const q = query(
      collection(db, 'activity_logs'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjectLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, 'list', 'activity_logs');
    });
    return () => unsubscribe();
  }, [user, selectedProject]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return;
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        description: 'New Project',
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        members: [user.uid]
      });
      toast.success("Workspace created");
      setNewProjectName('');
      setShowProjectModal(false);
    } catch (error) { toast.error("Failed to create workspace."); }
  };

  const handleUpdateProject = async () => {
    if (!user || !selectedProject || !selectedProject.name.trim()) return;
    setIsUpdatingProject(true);
    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      await setDoc(projectRef, { name: selectedProject.name, description: selectedProject.description || '' }, { merge: true });
      toast.success("Project updated.");
    } catch (error) { handleFirestoreError(error, 'update', 'projects'); } finally { setIsUpdatingProject(false); }
  };

  const handleDeleteProject = async () => {
    if (!user || !selectedProject) return;
    try {
      await deleteDoc(doc(db, 'projects', selectedProject.id)); 
      toast.success("Project archive finalized.");
      setSelectedProject(null);
      setActiveTab('dashboard');
    } catch (error) { handleFirestoreError(error, 'delete', 'projects'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full shadow-2xl shadow-brand-500/20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Toaster position="top-right" richColors />
      
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full min-h-screen bg-[#FBFBFE]">
            <nav className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-10 lg:px-20 z-[100] bg-[#0A0A0A]/50 backdrop-blur-xl border-b border-white/5">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white text-black flex items-center justify-center rounded">
                     <Code2 size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-white tracking-widest uppercase font-mono">Linebase</span>
                     <span className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] font-mono italic">SYSLINK.PRO</span>
                  </div>
               </div>
               <div className="flex items-center gap-10">
                 <button onClick={() => handleLogin()} className="micro-label text-slate-500 hover:text-white transition-colors">Access_Kernel</button>
                 <button onClick={() => handleLogin()} className="btn-precision h-10 px-6">
                   Initialize_Node <ArrowRight size={14} />
                 </button>
               </div>
            </nav>

            <main className="pt-40 lg:pt-52 px-10 lg:px-20 max-w-7xl mx-auto flex flex-col items-center text-center technical-grid min-h-screen">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
                 <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="lg:col-span-7 space-y-10">
                    <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-brand-50 border border-brand-100/50">
                      <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-brand-600 uppercase tracking-[0.2em]">Matrix V2.0 Live Protocols</span>
                    </div>
                    
                    <h1 className="text-6xl lg:text-[8rem] font-black tracking-tight text-slate-950 leading-[0.9] font-display italic">
                      Trí tuệ <br />
                      <span className="text-brand-600 underline decoration-[10px] decoration-brand-100">Kỹ thuật.</span>
                    </h1>
                    
                    <p className="text-xl lg:text-2xl text-slate-400 max-w-xl font-bold leading-relaxed tracking-tight">
                      Trung tâm chỉ huy hợp nhất cho các nhóm hiệu suất cao để đồng bộ hóa mã nguồn, công việc và dữ liệu đo lường.
                    </p>

                    <div className="flex flex-wrap items-center gap-6 pt-4">
                       <button onClick={() => handleLogin()} className="h-14 px-10 bg-slate-950 text-white rounded-2xl text-base font-black shadow-2xl shadow-slate-900/20 hover:bg-brand-600 transition-all active:scale-95">
                          Thiết lập không gian làm việc
                       </button>
                       <button onClick={() => handleLogin()} className="h-14 px-10 bg-white text-slate-400 border border-slate-100 rounded-2xl text-base font-black hover:bg-slate-50 transition-all active:scale-95">
                          Tài liệu kỹ thuật
                       </button>
                    </div>
                 </motion.div>

                 <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.2 }} className="lg:col-span-5 relative">
                    <div className="card-smart p-1 shadow-[0_40px_100px_rgba(0,0,0,0.05)] border-white/50 bg-white/30 backdrop-blur-sm rotate-3">
                       <div className="bg-slate-950 rounded-[2rem] overflow-hidden aspect-[4/5] p-10 flex flex-col justify-between">
                          <div className="space-y-4">
                             <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Zap size={24} />
                             </div>
                             <h3 className="text-3xl font-black text-white font-display italic">Quantum <br />Board Sync</h3>
                          </div>
                          <div className="space-y-6">
                             <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                <motion.div animate={{ width: "70%" }} transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }} className="h-full bg-brand-500" />
                             </div>
                             <div className="flex justify-between items-end">
                                <div className="text-slate-500 text-sm font-mono">0101010111</div>
                                <div className="text-brand-500 text-4xl font-black font-display italic">72%</div>
                             </div>
                          </div>
                       </div>
                    </div>
                    {/* ACCENT FLOAT */}
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-400/10 blur-[80px] -z-10 rounded-full" />
                 </motion.div>
               </div>

               <div className="mt-40 w-full grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/5">
                  {[
                    { label: "Sync_Latency", value: "0.04ms", desc: "Real-time protocol relay." },
                    { label: "Node_Health", value: "Optimal", desc: "Always-on telemetric pulse." },
                    { label: "Matrix_Parity", value: "Locked", desc: "Encrypted state-sync." }
                  ].map((stat, i) => (
                    <div key={i} className="p-12 text-left space-y-6 bg-surface hover:bg-white/[0.02] transition-colors relative group">
                       <span className="micro-label text-slate-700 group-hover:text-brand-400 transition-colors">{stat.label}</span>
                       <div className="text-5xl font-sans font-bold text-white italic tracking-tighter">{stat.value}</div>
                       <p className="text-sm font-medium text-slate-500 tracking-tight leading-relaxed italic">{stat.desc}</p>
                    </div>
                  ))}
               </div>
            </main>
          </motion.div>
        ) : (
          <div className="flex-1 flex h-screen overflow-hidden bg-[#050505]">
            {/* PRECISION SIDEBAR */}
            <aside className="w-64 h-full flex flex-col bg-[#0A0A0A] border-r border-white/5 relative z-50">
               <div className="p-8 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white text-black rounded-lg flex items-center justify-center shadow-2xl">
                     <Code2 size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-white tracking-widest uppercase font-mono">Linebase</span>
                     <span className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] font-mono italic">SYSLINK.PRO</span>
                  </div>
               </div>

               <div className="flex-1 py-12 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                  <div className="px-5 mb-4 micro-label">Nav_Protocols</div>
                  {[
                    { id: 'dashboard', icon: LayoutGrid, label: 'Overview' },
                    { id: 'board', icon: FolderKanban, label: 'Work_Matrix' },
                    { id: 'metrics', icon: PieChart, label: 'Analytics' },
                    { id: 'members', icon: Users, label: 'Operators' },
                    { id: 'logs', icon: Activity, label: 'System_Logs' },
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={cn(
                        "nav-link",
                        activeTab === item.id 
                          ? "nav-link-active" 
                          : "nav-link-inactive"
                      )}
                    >
                      <item.icon size={16} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                      <span className="tracking-tighter">{item.label}</span>
                    </button>
                  ))}
               </div>

               <div className="p-6 border-t border-white/5">
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                    <img className="w-8 h-8 rounded border border-white/10" src={user.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.uid}`} alt="" />
                    <div className="min-w-0 flex-1">
                       <div className="text-[11px] font-bold text-white truncate font-mono">{user.displayName?.toUpperCase()}</div>
                       <button onClick={handleLogout} className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Terminate_Session</button>
                    </div>
                  </div>
               </div>
            </aside>

            <main className="flex-1 overflow-hidden flex flex-col technical-grid">
               {/* PRECISION HEADER */}
               <header className="h-16 px-10 flex items-center justify-between bg-[#0A0A0A]/50 backdrop-blur-xl relative z-40 border-b border-white/10">
                  <div className="flex items-center gap-8">
                    <div className="relative">
                      <button 
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="flex items-center gap-3 text-sm font-bold text-white hover:text-brand-400 transition-all group"
                      >
                         <span className="font-mono text-slate-500">Node:</span>
                         <span className="underline underline-offset-4 decoration-border">{selectedProject?.name || 'SYNCING...'}</span>
                         <ChevronDown size={14} className={cn("text-slate-500 transition-transform", showProjectDropdown && "rotate-180")} />
                      </button>
                      
                      <AnimatePresence>
                         {showProjectDropdown && (
                           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute top-12 left-0 w-72 z-[110] p-1 bg-[#0D0D0D] border border-white/10 rounded-lg shadow-3xl">
                             <div className="p-2 micro-label">AVAILABLE_NODES</div>
                             <div className="p-1 space-y-0.5">
                               {projects.map(p => (
                                 <button key={p.id} onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); }} className={cn("w-full flex items-center justify-between px-4 py-2 rounded text-[13px] font-medium transition-all", selectedProject?.id === p.id ? "bg-white/10 text-white" : "text-slate-500 hover:bg-white/5 hover:text-white")}>
                                   {p.name}
                                   {selectedProject?.id === p.id && <Check size={14} />}
                                 </button>
                               ))}
                               <div className="h-px bg-white/5 my-2" />
                               <button onClick={() => { setShowProjectModal(true); setShowProjectDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-2 rounded text-[13px] text-brand-400 font-bold hover:bg-brand-500/10">
                                 <Plus size={16} /> INITIALIZE_NEW_NODE
                               </button>
                             </div>
                           </motion.div>
                         )}
                      </AnimatePresence>
                    </div>

                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-mono">Status: Optimal</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all">
                       <Bell size={16} />
                    </button>
                    <button 
                      onClick={() => setShowSettingsModal(true)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                       <Settings size={16} />
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <button onClick={() => setShowProjectModal(true)} className="btn-precision h-9 px-4">
                       <Plus size={16} /> New Node
                    </button>
                  </div>
               </header>

               <div className="flex-1 overflow-auto custom-scrollbar p-10 lg:p-14">
                 <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-16 max-w-7xl">
                        <div className="flex items-end justify-between gap-8">
                           <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="h-0.5 w-12 bg-brand-500/30 rounded-full" />
                                <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.4em] font-mono">Kernel Core v2.04</span>
                              </div>
                              <h2 className="text-7xl font-sans font-bold tracking-tighter italic">
                                SYSTEM_<span className="text-slate-700">CORE</span>
                              </h2>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="flex -space-x-3">
                                {userProfiles.slice(0, 5).map((p, i) => (
                                  <img key={i} className="w-12 h-12 rounded-2xl border-4 border-[#FBFBFE] shadow-2xl shadow-black/10" src={p.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${p.userId}`} alt="" />
                                ))}
                                {userProfiles.length > 5 && (
                                  <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center text-[10px] font-black border-4 border-[#FBFBFE] shadow-2xl shadow-black/10">
                                     +{userProfiles.length - 5}
                                  </div>
                                )}
                              </div>
                           </div>
                        </div>
 
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                           <StatsCard label="Vụ việc mở" value={bugs.filter(b => b.status !== 'done').length} icon={<BugIcon size={20} />} trend="+4.5%" />
                           <StatsCard label="Nút thành viên" value={userProfiles.length} icon={<Users size={20} />} trend="Ổn định" />
                           <StatsCard label="Tải hệ thống" value={`${platformStats.serverLoad}%`} icon={<Zap size={20} />} trend="-1.2%" />
                           <StatsCard label="Độ trễ" value={platformStats.latency} icon={<Activity size={20} />} trend="Tối ưu" />
                        </div>
 
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                           <div className="lg:col-span-8 space-y-12">
                             <div className="card-smart min-h-[520px] flex flex-col p-10 bg-slate-950 border-none shadow-brand-500/10">
                                <div className="flex items-center justify-between mb-12">
                                   <div className="space-y-1">
                                      <h3 className="text-white text-lg font-black font-display italic tracking-tight">Giám sát hoạt động</h3>
                                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] font-mono">Dòng dữ liệu thời gian thực</p>
                                   </div>
                                   <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                                      <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_12px_rgba(124,58,237,0.5)]" />
                                      <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest font-mono">Active Hub Link</span>
                                   </div>
                                </div>
                                <div className="flex-1 w-full translate-x-[-10px]">
                                   <ResponsiveContainer width="100%" height="100%">
                                     <AreaChart data={chartData}>
                                       <defs>
                                         <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                           <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                           <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                         </linearGradient>
                                       </defs>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                       <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#475569', fontFamily: 'JetBrains Mono' }} dy={10} />
                                       <Tooltip contentStyle={{ backgroundColor: '#0F1115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
                                       <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={4} fillOpacity={1} fill="url(#areaGrad)" />
                                     </AreaChart>
                                   </ResponsiveContainer>
                                </div>
                             </div>
 
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <QuickLink title="Ma trận vụ việc" desc="Trung tâm điều phối Kanban nâng cao." icon={<FolderKanban size={24} />} onClick={() => setActiveTab('board')} />
                                <QuickLink title="Nhân sự" desc="Mạng lưới Operator được ủy quyền." icon={<Users size={24} />} onClick={() => setActiveTab('members')} />
                                <QuickLink title="Phân tích" desc="Dữ liệu đo lường hiệu năng hệ thống." icon={<PieChart size={24} />} onClick={() => setActiveTab('metrics')} />
                                <QuickLink title="Giao thức" desc="Cấu hình Kernel và tham số Node." icon={<Settings size={24} />} onClick={() => setShowSettingsModal(true)} />
                             </div>
                           </div>
 
                           <div className="lg:col-span-4 flex flex-col gap-10">
                              <div className="card-smart flex-1 flex flex-col p-0 overflow-hidden border-slate-100/60 shadow-3xl bg-white">
                                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30 backdrop-blur-sm">
                                  <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-[0.3em] font-display italic">Sổ cái toàn cầu</h3>
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-4">
                                  {projectLogs.slice(0, 10).map((log, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group/log">
                                       <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover/log:bg-brand-600 group-hover/log:text-white transition-all shrink-0 border border-slate-100">
                                          <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <div className="text-[13px] font-bold text-slate-800 leading-tight mb-1 group-hover/log:text-slate-950 transition-colors line-clamp-2">{log.details}</div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{log.createdAt ? 'Synced' : 'Pending'}</span>
                                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                                            <span className="text-[9px] font-mono text-slate-300 font-bold">{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                          </div>
                                       </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'metrics' && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-20 max-w-7xl">
                        <div className="space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="h-0.5 w-12 bg-brand-500/30 rounded-full" />
                              <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono">Telemetry Analytics</span>
                           </div>
                           <h2 className="text-7xl font-sans font-bold tracking-tighter italic">Operational_<span className="text-slate-700">Metrics</span></h2>
                           <p className="text-lg text-slate-500 font-medium tracking-tight max-w-2xl">High-fidelity visualization of system throughput and multi-channel protocol distribution.</p>
                        </div>
 
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/5 border border-white/5">
                           <StatsCard label="PRECISION_YIELD" value="94%" icon={<CheckCircle2 size={16} />} trend="STABLE" />
                           <StatsCard label="NODE_VELOCITY" value="12.4" icon={<Rocket size={16} />} trend="+0.8" />
                           <StatsCard label="MEAN_RECOVERY" value="2.4h" icon={<Clock size={16} />} trend="-15m" />
                        </div>
 
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                           <div className="card-smart h-[520px] flex flex-col bg-slate-950 border-none p-12">
                             <div className="flex items-center justify-between mb-12">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] font-mono">Vận tốc giải quyết</h3>
                                <div className="px-4 py-1.5 bg-white/5 rounded-xl text-[9px] font-black text-brand-400 tracking-widest border border-white/5">ALPHA-CHART</div>
                             </div>
                             <div className="flex-1 w-full translate-x-[-15px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#475569', fontFamily: 'JetBrains Mono' }} dy={10} />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#0F1115', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px' }} />
                                    <Bar dataKey="value" fill="#7c3aed" radius={[10, 10, 0, 0]} barSize={44} />
                                  </BarChart>
                                </ResponsiveContainer>
                             </div>
                           </div>
 
                           <div className="card-smart h-[520px] flex flex-col items-center p-12">
                             <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] font-display italic mb-12 self-start">Phân phối ưu tiên</h3>
                             <div className="flex-1 w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RePieChart>
                                    <Pie 
                                      data={[
                                        { name: 'Khẩn cấp', value: bugs.filter(b => b.priority === 'critical').length || 1 },
                                        { name: 'Cao', value: bugs.filter(b => b.priority === 'high').length || 2 },
                                        { name: 'Trung bình', value: bugs.filter(b => b.priority === 'medium').length || 4 },
                                      ]} 
                                      innerRadius={110} outerRadius={150} paddingAngle={15} dataKey="value"
                                      stroke="none"
                                    >
                                      <Cell fill="#f43f5e" />
                                      <Cell fill="#f59e0b" />
                                      <Cell fill="#8b5cf6" />
                                    </Pie>
                                    <Tooltip />
                                  </RePieChart>
                                </ResponsiveContainer>
                                <div className="absolute flex flex-col items-center justify-center gap-1">
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nodes</span>
                                   <span className="text-5xl font-black text-slate-950 font-display italic leading-none">{bugs.length}</span>
                                </div>
                             </div>
                           </div>
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'members' && (
                      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-16 max-w-7xl">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                            <div className="space-y-4">
                               <div className="flex items-center gap-4">
                                  <div className="h-0.5 w-12 bg-brand-500/30 rounded-full" />
                                  <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.4em] font-mono">Operator Deployment Registry</span>
                               </div>
                               <h2 className="text-7xl font-sans font-bold tracking-tighter italic">Network_<span className="text-slate-700">Operators</span></h2>
                               <p className="text-lg text-slate-500 font-medium tracking-tight max-w-xl">Comprehensive directory of authorized engine operators assigned to this matrix node.</p>
                            </div>
                            <button className="btn-precision h-12 px-8">
                               <UserPlus size={16} /> Deploy_Member
                            </button>
                        </div>
  
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {userProfiles.map((profile) => (
                              <div key={profile.userId} className="card-smart flex items-center justify-between group bg-white/80 backdrop-blur-xl p-10 hover:shadow-4xl transition-all duration-700 border-white group relative overflow-hidden">
                                 <div className="absolute top-0 left-0 w-full h-1 bg-slate-50 group-hover:bg-brand-500 transition-colors" />
                                 <div className="flex items-center gap-10">
                                    <div className="relative">
                                      <img src={profile.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.userId}`} alt="" className="w-28 h-28 rounded-[2.5rem] bg-slate-50 border border-slate-100 shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:-rotate-3 group-hover:shadow-brand-500/10" />
                                      <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-xl group-hover:rotate-[15deg] transition-transform">
                                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" />
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                       <div className="text-3xl font-black text-slate-950 tracking-tighter font-display italic leading-none mb-4 group-hover:text-brand-600 transition-colors">{profile.displayName}</div>
                                       <div className="flex items-center gap-4 py-2 px-4 bg-slate-50 rounded-xl w-fit border border-slate-100/50">
                                          <Mail size={14} className="text-slate-300" />
                                          <div className="text-[11px] font-black text-slate-400 truncate uppercase tracking-widest font-mono">{profile.email}</div>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-10">
                                    <div className="px-6 py-2.5 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] font-mono shadow-xl shadow-slate-900/10 group-hover:bg-brand-600 transition-colors">
                                      {selectedProject?.ownerId === profile.userId ? 'Administrator' : 'Core Operator'}
                                    </div>
                                    <div className="flex items-center gap-8 text-slate-300 group-hover:text-slate-400 transition-colors">
                                       <button className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-brand-50 hover:text-brand-600 transition-all border border-transparent hover:border-brand-100"><Share2 size={20} /></button>
                                       <button className="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"><Trash2 size={20} /></button>
                                    </div>
                                 </div>
                              </div>
                            ))}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'board' && selectedProject && <KanbanBoard key={selectedProject.id} projectId={selectedProject.id} userId={user.uid} userProfiles={userProfiles} bugs={bugs} />}

                     {activeTab === 'logs' && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16 max-w-7xl">
                        <div className="space-y-4">
                           <div className="flex items-center gap-4">
                              <div className="h-0.5 w-12 bg-brand-500/30 rounded-full" />
                              <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.4em] font-mono">System Ledger Index</span>
                           </div>
                           <h2 className="text-6xl font-black text-slate-950 tracking-tighter font-display italic leading-none">Nhật ký <span className="text-slate-400">Hệ thống</span></h2>
                           <p className="text-lg text-slate-400 font-medium tracking-tight max-w-xl">Lịch sử toàn diện về các thay đổi và chuyển đổi trạng thái mạng lưới.</p>
                         </div>

                         <div className="surface-precision overflow-hidden">
                           <table className="w-full text-left">
                             <thead>
                               <tr className="bg-white/[0.02] border-b border-white/5">
                                 <th className="px-8 py-6 micro-label">TIMESTAMP</th>
                                 <th className="px-8 py-6 micro-label">PROTOCOL</th>
                                 <th className="px-8 py-6 micro-label">OPERATOR</th>
                                 <th className="px-8 py-6 micro-label">AUDIT_DETAILS</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-white/5">
                               {projectLogs.map((log) => (
                                 <tr key={log.id} className="hover:bg-white/[0.01] transition-colors group/row">
                                   <td className="px-8 py-6 font-mono text-[11px] text-slate-500">{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleString() : 'PENDING...'}</td>
                                   <td className="px-8 py-6">
                                     <span className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono font-bold text-slate-400 group-hover/row:bg-white group-hover/row:text-black transition-all">{log.action?.toUpperCase() || 'MOD'}</span>
                                   </td>
                                   <td className="px-8 py-6">
                                      <div className="flex items-center gap-3">
                                         <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center text-[10px] font-mono border border-white/10 italic">
                                            {userProfiles.find(u => u.userId === log.userId)?.displayName?.slice(0, 2).toUpperCase() || 'SY'}
                                         </div>
                                         <span className="font-bold text-white text-[13px] italic font-serif ">{userProfiles.find(u => u.userId === log.userId)?.displayName || 'SYSTEM_DAEMON'}</span>
                                      </div>
                                   </td>
                                   <td className="px-8 py-6 text-slate-400 font-medium text-[13px] max-w-md italic">{log.details}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
            </main>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
         {showSettingsModal && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-[#050505]/90 backdrop-blur-3xl" />
             <div className="surface-precision w-full max-w-2xl relative z-[510] overflow-hidden bg-surface">
                <div className="px-12 py-10 flex items-center justify-between border-b border-white/5">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white text-black flex items-center justify-center rounded shadow-xl">
                         <Settings size={20} />
                      </div>
                      <div>
                        <h3 className="serif-header text-2xl italic tracking-tight">System_Protocol_Override</h3>
                        <p className="micro-label">Node authorization level: Root</p>
                      </div>
                   </div>
                   <button onClick={() => setShowSettingsModal(false)} className="w-10 h-10 rounded hover:bg-white/5 transition-all flex items-center justify-center text-slate-500 hover:text-white">
                      <X size={20} />
                   </button>
                </div>
                <div className="p-12 space-y-12">
                   <div className="space-y-4">
                      <label className="micro-label ml-2">Node_Designation</label>
                      <input 
                        className="w-full h-14 bg-white/5 border border-white/10 rounded px-6 text-xl font-bold text-white outline-none focus:bg-white/10 focus:border-brand-500 transition-all placeholder:text-slate-700 font-mono"
                        value={selectedProject?.name} 
                        onChange={(e) => setSelectedProject(selectedProject ? {...selectedProject, name: e.target.value} : null)} 
                        disabled={user.uid !== selectedProject?.ownerId}
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      <div className="p-6 space-y-2 bg-white/[0.02] border border-white/5 rounded">
                         <span className="micro-label opacity-40 text-[9px]">ENCRYPTION_PROTOCOL</span>
                         <div className="text-sm font-bold text-white italic font-mono uppercase">AES-256-GCM</div>
                      </div>
                      <div className="p-6 space-y-2 bg-white/[0.02] border border-white/5 rounded">
                         <span className="micro-label opacity-40 text-[9px]">SECURITY_VECTOR</span>
                         <div className="text-sm font-bold text-emerald-500 italic font-mono flex items-center gap-2">
                            <Lock size={14} /> LEVEL_4_AUTH
                         </div>
                      </div>
                   </div>

                   <div className="pt-10 flex items-center justify-between gap-6">
                      {user.uid === selectedProject?.ownerId && (
                        <button 
                          onClick={() => { if(confirm("EXECUTE_DESTRUCTION_PROTOCOL?")) handleDeleteProject()}}
                          className="micro-label text-rose-500 hover:text-rose-400 transition-colors"
                        >
                          Terminate_Node
                        </button>
                      )}
                      <div className="flex-1" />
                      <button 
                        onClick={() => { handleUpdateProject(); setShowSettingsModal(false); }}
                        className="btn-precision h-12 px-12"
                      >
                         Sync_Parameters
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

         {showProjectModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProjectModal(false)} className="absolute inset-0 bg-[#050505]/90 backdrop-blur-3xl" />
            <div className="surface-precision w-full max-w-lg p-12 relative z-[210] bg-surface">
              <div className="flex flex-col text-center space-y-4 mb-10">
                <div className="w-16 h-16 bg-white text-black flex items-center justify-center rounded mx-auto shadow-2xl mb-4">
                   <FolderPlus size={24} />
                </div>
                <h3 className="serif-header text-4xl italic tracking-tight underline underline-offset-8 decoration-white/10">Initialize_Node</h3>
                <p className="text-slate-500 font-medium text-sm">Define the telemetry parameters for the new matrix node.</p>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="micro-label ml-2">Node_Designation</label>
                  <input autoFocus placeholder="e.g. PROJECT_OVERDRIVE" className="w-full h-14 bg-white/5 border border-white/10 rounded px-6 text-lg text-center font-bold text-white outline-none focus:bg-white/10 focus:border-brand-500 transition-all placeholder:text-slate-700 font-mono" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()} />
                </div>
                <div className="flex gap-4">
                  <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="flex-1 btn-precision h-12 disabled:opacity-50">Create_Node</button>
                  <button onClick={() => setShowProjectModal(false)} className="px-6 micro-label text-slate-500 hover:text-white transition-colors">Abort</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ label, value, icon, trend }: { label: string, value: any, icon: any, trend?: string }) {
  return (
    <div className="surface-precision p-8 space-y-10 group relative overflow-hidden">
      <div className="flex items-center justify-between relative z-10">
        <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-white transition-all border border-white/5">
          {icon}
        </div>
        {trend && (
          <div className="text-[10px] font-mono font-bold text-slate-600">
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-2 relative z-10">
        <div className="micro-label opacity-50">{label}</div>
        <div className="text-4xl font-sans font-bold tracking-tighter italic">
          {value}
        </div>
      </div>
    </div>
  );
}

function QuickLink({ title, desc, icon, onClick }: { title: string, desc: string, icon: any, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="card-smart p-10 flex flex-col text-left group bg-white border-slate-100 hover:border-brand-500/20 shadow-xl hover:shadow-2xl transition-all duration-500"
    >
      <div className="w-14 h-14 bg-slate-950 text-white flex items-center justify-center rounded-[1.5rem] mb-10 shadow-2xl shadow-slate-950/20 group-hover:bg-brand-600 group-hover:rotate-[15deg] group-hover:scale-110 transition-all duration-500 hvr-pulse-shrink">
        {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: 2.5 })}
      </div>
      <h3 className="text-xl font-black text-slate-950 mb-3 tracking-tight font-display italic italic">{title}</h3>
      <p className="text-sm text-slate-400 font-bold leading-relaxed tracking-tight group-hover:text-slate-500 transition-colors">{desc}</p>
      
      <div className="mt-10 flex items-center gap-3 text-brand-600 font-black text-[10px] uppercase tracking-[0.4em] opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-2">
        EXECUTE PROTOCOL <ArrowRight size={14} strokeWidth={3} />
      </div>
    </button>
  );
}
