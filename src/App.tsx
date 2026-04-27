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
            <nav className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-10 lg:px-14 z-[100] bg-white/50 backdrop-blur-md border-b border-white/20">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-600 text-white flex items-center justify-center rounded-xl shadow-lg shadow-brand-500/20">
                     <Code2 size={20} strokeWidth={2.5} />
                  </div>
                  <span className="text-xl font-bold tracking-tight text-slate-900 font-display italic">Linebase</span>
               </div>
               <div className="flex items-center gap-8">
                 <button onClick={() => handleLogin()} className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-brand-600 transition-colors">Đăng nhập</button>
                 <button onClick={() => handleLogin()} className="h-11 px-6 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/10 hover:bg-brand-600 transition-all flex items-center gap-3 group">
                   Khởi tạo Node <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                 </button>
               </div>
            </nav>

            <main className="pt-40 lg:pt-52 pb-32 px-10 lg:px-14 max-w-7xl mx-auto flex flex-col min-h-screen">
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

               <div className="mt-32 w-full grid grid-cols-1 md:grid-cols-3 gap-12 pt-20 border-t border-slate-100">
                  {[
                    { label: "Sync Latency", value: "0.04ms", desc: "Real-time protocol relay." },
                    { label: "Node Health", value: "Optimal", desc: "Always-on telemetric pulse." },
                    { label: "Matrix Flux", value: "Stable", desc: "Network parity maintained." }
                  ].map((stat, i) => (
                    <div key={i} className="space-y-4 px-4 border-l border-slate-50 first:border-none">
                       <span className="text-[11px] font-black text-brand-600 uppercase tracking-[0.2em]">{stat.label}</span>
                       <div className="text-4xl font-black text-slate-950 font-display italic">{stat.value}</div>
                       <p className="text-sm font-bold text-slate-400 tracking-tight leading-relaxed">{stat.desc}</p>
                    </div>
                  ))}
               </div>
            </main>
          </motion.div>
        ) : (
          <div className="flex-1 flex h-screen overflow-hidden bg-[#FBFBFE]">
            {/* BACKGROUND GLOWS */}
            <div className="bg-glow top-[-10%] left-[-10%] w-[40%] h-[40%]" />
            <div className="bg-glow bottom-[-10%] right-[-10%] w-[50%] h-[50%]" />
            
            {/* PREMIUM SIDEBAR */}
            <aside className="w-64 h-full flex flex-col bg-[#0F1115] border-r border-white/5 relative z-50">
               <div className="p-6 h-24 flex items-center gap-4">
                  <div className="w-11 h-11 bg-brand-600 text-white rounded-xl flex items-center justify-center shadow-2xl shadow-brand-500/40">
                     <Code2 size={22} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-lg font-black text-white tracking-tight font-display italic leading-none">Linebase</span>
                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5 font-mono">Kernel v2.04</span>
                  </div>
               </div>

               <div className="flex-1 py-12 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                  {[
                    { id: 'dashboard', icon: LayoutGrid, label: 'Tổng quan' },
                    { id: 'board', icon: FolderKanban, label: 'Ma trận công việc' },
                    { id: 'metrics', icon: PieChart, label: 'Phân tích' },
                    { id: 'members', icon: Users, label: 'Nhân sự' },
                    { id: 'logs', icon: Activity, label: 'Nhật ký' },
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-[13px] font-bold transition-all duration-300",
                        activeTab === item.id 
                          ? "bg-white/10 text-white shadow-xl shadow-black/20 ring-1 ring-white/10" 
                          : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
                      )}
                    >
                      <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                      <span className="tracking-tight">{item.label}</span>
                    </button>
                  ))}
               </div>

               <div className="p-6 pt-0">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-3xl flex items-center gap-3 backdrop-blur-sm">
                    <img className="w-10 h-10 rounded-2xl border border-white/10" src={user.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.uid}`} alt="" />
                    <div className="min-w-0 flex-1">
                       <div className="text-[11px] font-black text-white truncate mb-0.5">{user.displayName || 'Quản trị viên'}</div>
                       <button onClick={handleLogout} className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-brand-400 transition-colors">Đăng xuất hệ thống</button>
                    </div>
                  </div>
               </div>
            </aside>

            <main className="flex-1 overflow-hidden flex flex-col">
               {/* TOP HEADER */}
               <header className="h-20 px-10 flex items-center justify-between bg-white/50 backdrop-blur-md relative z-40 border-b border-white/20">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <button 
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="flex items-center gap-2.5 h-11 px-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
                      >
                         <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                         <span className="text-sm font-bold text-slate-900 font-display">{selectedProject?.name || 'Loading...'}</span>
                         <ChevronDown size={14} className={cn("text-slate-400 transition-transform group-hover:text-slate-950", showProjectDropdown && "rotate-180")} />
                      </button>
                      
                      <AnimatePresence>
                         {showProjectDropdown && (
                           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-14 left-0 w-72 z-[110] p-2 bg-white border border-slate-100 rounded-2xl shadow-2xl">
                             <div className="space-y-1">
                               {projects.map(p => (
                                 <button key={p.id} onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); }} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all", selectedProject?.id === p.id ? "bg-brand-50 text-brand-600" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950")}>
                                   {p.name}
                                   {selectedProject?.id === p.id && <Check size={14} strokeWidth={3} />}
                                 </button>
                               ))}
                               <div className="h-px bg-slate-50 my-2" />
                               <button onClick={() => { setShowProjectModal(true); setShowProjectDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-900 font-bold hover:bg-slate-50">
                                 <Plus size={16} /> New Node
                               </button>
                             </div>
                           </motion.div>
                         )}
                      </AnimatePresence>
                    </div>

                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Hub Sync</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowSettingsModal(true)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                    >
                       <Settings size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all relative">
                       <Bell size={18} />
                       <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-brand-500 rounded-full border-2 border-white" />
                    </button>
                    <div className="h-4 w-px bg-slate-200" />
                    <button onClick={() => setShowProjectModal(true)} className="h-11 px-5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/10 hover:bg-brand-600 transition-all flex items-center gap-2">
                       <Plus size={18} /> New Event
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
                              <h2 className="text-6xl font-black text-slate-950 tracking-tighter font-display italic leading-none">
                                Hệ thống <span className="text-slate-400">Điều phối</span>
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
                           <h2 className="text-7xl font-black text-slate-950 tracking-tighter font-display italic leading-none">Phân tích <span className="text-slate-400">Hiệu năng</span></h2>
                           <p className="text-lg text-slate-400 font-medium tracking-tight max-w-2xl">Trực quan hóa hiệu quả vận hành hệ thống và phân phối giao thức truyền thông đa kênh.</p>
                        </div>
 
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                           <StatsCard label="Tỉ lệ xử lý" value="94%" icon={<CheckCircle2 size={24} strokeWidth={2.5} />} trend="Ổn định" />
                           <StatsCard label="Vận tốc Node" value="12.4" icon={<Rocket size={24} strokeWidth={2.5} />} trend="+0.8" />
                           <StatsCard label="Thời gian Phục hồi" value="2.4h" icon={<Clock size={24} strokeWidth={2.5} />} trend="-15m" />
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
                               <h2 className="text-6xl font-black text-slate-950 tracking-tighter font-display italic leading-none">Mạng lưới <span className="text-slate-400">Nhân sự</span></h2>
                               <p className="text-lg text-slate-400 font-medium tracking-tight max-w-xl">Hợp tác điều phối hệ thống giữa các Engine Operator được ủy nhiệm cho mạng lưới Node này.</p>
                            </div>
                            <button className="h-16 px-10 bg-slate-950 text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] flex items-center gap-4 shadow-2xl shadow-slate-950/20 hover:bg-brand-600 transition-all active:scale-95">
                               <UserPlus size={20} strokeWidth={3} /> Mời thành viên
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

                         <div className="card-smart p-0 overflow-hidden border-slate-100 shadow-3xl bg-white">
                           <table className="w-full text-left">
                             <thead>
                               <tr className="bg-slate-50/50 border-b border-slate-100">
                                 <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono">Thời điểm</th>
                                 <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono">Giao thức</th>
                                 <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono">Người vận hành</th>
                                 <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono">Nội dung Alpha</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                               {projectLogs.map((log) => (
                                 <tr key={log.id} className="hover:bg-slate-50/30 transition-colors group/row">
                                   <td className="px-12 py-8 font-mono text-[11px] text-slate-400 font-bold group-hover/row:text-slate-600 transition-colors">{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleString() : 'Đang xử lý...'}</td>
                                   <td className="px-12 py-8">
                                     <span className="px-5 py-2 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 group-hover/row:bg-brand-600 transition-all">{log.action || 'THAY ĐỔI'}</span>
                                   </td>
                                   <td className="px-12 py-8">
                                      <div className="flex items-center gap-4">
                                         <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black border border-slate-100 group-hover/row:border-brand-200 transition-colors uppercase italic font-display">
                                            {userProfiles.find(u => u.userId === log.userId)?.displayName?.slice(0, 2) || 'SY'}
                                         </div>
                                         <span className="font-bold text-slate-900 text-sm group-hover/row:text-brand-600 transition-colors italic font-display">{userProfiles.find(u => u.userId === log.userId)?.displayName || 'System Relay'}</span>
                                      </div>
                                   </td>
                                   <td className="px-12 py-8 text-slate-500 font-bold text-sm truncate max-w-md italic font-display">{log.details}</td>
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
        {showSettingsModal && selectedProject && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-3xl" />
             <motion.div initial={{ scale: 0.9, opacity: 0, rotateX: 10 }} animate={{ scale: 1, opacity: 1, rotateX: 0 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3.5rem] w-full max-w-2xl relative z-[510] shadow-[0_40px_100px_rgba(0,0,0,0.4)] overflow-hidden">
                <div className="bg-slate-50 px-12 py-10 flex items-center justify-between border-b border-slate-100">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-950 text-white flex items-center justify-center rounded-2xl shadow-xl">
                         <Settings size={22} className="animate-spin-slow" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 font-display italic tracking-tight uppercase">Cốt lõi hệ thống</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi đè nút toàn cầu</p>
                      </div>
                   </div>
                   <button onClick={() => setShowSettingsModal(false)} className="w-12 h-12 rounded-2xl hover:bg-white transition-all flex items-center justify-center text-slate-400 hover:text-slate-950">
                      <X size={24} />
                   </button>
                </div>
                <div className="p-12 space-y-12">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Tên định danh Node</label>
                      <input 
                        className="w-full h-16 bg-slate-50 border border-slate-100 rounded-[2rem] px-8 text-xl font-black text-slate-900 outline-none focus:bg-white focus:ring-8 focus:ring-brand-500/5 focus:border-brand-200 transition-all"
                        value={selectedProject.name} 
                        onChange={(e) => setSelectedProject({...selectedProject, name: e.target.value})} 
                        disabled={user.uid !== selectedProject.ownerId}
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      <div className="card-smart p-8 space-y-2 border-slate-50 bg-slate-50/20">
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Loại giao thức</span>
                         <div className="text-base font-black text-slate-900 italic font-display">Node Tiêu chuẩn</div>
                      </div>
                      <div className="card-smart p-8 space-y-2 border-slate-50 bg-slate-50/20">
                         <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Mức độ an ninh</span>
                         <div className="text-base font-black text-emerald-500 italic font-display flex items-center gap-2">
                            <Lock size={16} /> Xác thực cấp 4
                         </div>
                      </div>
                   </div>

                   <div className="pt-10 flex items-center justify-between gap-6">
                      {user.uid === selectedProject.ownerId && (
                        <button 
                          onClick={() => { if(confirm("Thực thi giao thức hủy diệt?")) handleDeleteProject()}}
                          className="text-[11px] font-bold text-rose-300 hover:text-rose-600 uppercase tracking-[0.2em] transition-all"
                        >
                          Xóa bỏ Nút mạng
                        </button>
                      )}
                      <button 
                        onClick={() => { handleUpdateProject(); setShowSettingsModal(false); }}
                        className="h-14 px-12 bg-slate-950 text-white rounded-[2rem] font-black text-base shadow-2xl shadow-slate-950/20 hover:bg-brand-600 transition-all active:scale-95"
                      >
                         Đồng bộ tham số
                      </button>
                   </div>
                </div>
             </motion.div>
          </div>
        )}

        {showProjectModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProjectModal(false)} className="absolute inset-0 bg-slate-950/40 backdrop-blur-3xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-[3rem] w-full max-w-lg p-12 relative z-[210] shadow-2xl">
              <div className="flex flex-col text-center space-y-4 mb-10">
                <div className="w-20 h-20 bg-slate-950 text-white flex items-center justify-center rounded-[2.5rem] mx-auto shadow-2xl shadow-slate-950/20 mb-2">
                   <FolderPlus size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-4xl font-black text-slate-950 font-display italic tracking-tight">Initialize Workspace</h3>
                <p className="text-slate-400 font-bold text-lg">Define the parameters of your new engineering node.</p>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] ml-2">Node Designation</label>
                  <input autoFocus placeholder="e.g. Project Overdrive" className="input-premium h-16 text-lg text-center" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()} />
                </div>
                <div className="flex gap-4">
                  <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="flex-1 btn-premium bg-slate-950 text-white disabled:opacity-50">Create Node</button>
                  <button onClick={() => setShowProjectModal(false)} className="px-8 font-black text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-widest text-[11px]">Abort</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatsCard({ label, value, icon, trend }: { label: string, value: any, icon: any, trend?: string }) {
  return (
    <div className="card-smart group hover:-translate-y-2 transition-all duration-700 relative overflow-hidden bg-white/80 backdrop-blur-xl border-white/60">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/5 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-brand-500/15 transition-colors" />
      <div className="flex items-center justify-between mb-10 relative z-10">
        <div className="w-14 h-14 rounded-3xl flex items-center justify-center bg-slate-50 text-slate-400 group-hover:bg-brand-600 group-hover:text-white transition-all duration-500 shadow-xl border border-white group-hover:rotate-[10deg] group-hover:scale-110">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] font-mono",
            trend.startsWith('+') ? "bg-emerald-50/80 text-emerald-600 border border-emerald-100/50" : 
            trend.startsWith('-') ? "bg-rose-50/80 text-rose-600 border border-rose-100/50" : "bg-slate-50/80 text-slate-400 border border-slate-100/50"
          )}>
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1.5 relative z-10">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-display italic">{label}</div>
        <div className="text-4xl font-black text-slate-950 tracking-tighter font-display italic leading-none">
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
