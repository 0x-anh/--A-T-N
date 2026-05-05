/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { 
  Radio, Rocket, ArrowRight, Layout, LayoutGrid, FolderKanban, PieChart, 
  Zap, LogIn, LogOut, ShieldAlert, Bug as BugIcon, Activity, Cpu, Globe, Database, 
  Terminal, FolderPlus, ChevronDown, ChevronRight, Users, Bell, Search, Plus, 
  Filter, MessageSquare, History, Settings, Lock, CheckCircle2, Check, Shield, ShieldCheck, X,
  UserPlus, Clock, ArrowUpRight, Share2, MoreHorizontal, Orbit, Code2, Mail, Trash2, AlertTriangle
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
import { Project, UserProfile, Bug, UserRole, ROLE_CONFIG } from './types';

import { Toaster, toast } from 'sonner';

const MatrixBackground = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 noise-overlay">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, #6366f1 1px, transparent 0)', backgroundSize: '48px 48px' }} />
      <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)', backgroundSize: '128px 128px' }} />
      
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-500/10 blur-[160px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-violet-600/5 blur-[200px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ duration: 4 }}
        className="absolute inset-0"
      >
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-400/50 to-transparent animate-[scan_15s_linear_infinite]" />
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-violet-400/30 to-transparent animate-[scan_25s_linear_infinite] [animation-delay:7s]" />
      </motion.div>

      {/* TECHNICAL OVERLAY DECORATIONS */}
      <div className="absolute top-10 left-10 micro-label opacity-20 hidden md:block">LATENCY::0.002MS</div>
      <div className="absolute top-10 right-10 micro-label opacity-20 hidden md:block">UPTIME::99.98%</div>
      <div className="absolute bottom-10 left-10 micro-label opacity-20 hidden md:block">ENCRYPTION::AES_256</div>
      <div className="absolute bottom-10 right-10 micro-label opacity-20 hidden md:block">NODE::DISTRIBUTED_TX</div>
    </div>
  );
};

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
  const [showEventModal, setShowEventModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [inviteUserEmail, setInviteUserEmail] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
    const qBugs = query(
      collection(db, 'bugs'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeBugs = onSnapshot(qBugs, (snapshot) => {
      setBugs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Bug[]);
    }, (error) => {
      handleFirestoreError(error, 'list', 'bugs');
    });

    const qEvents = query(
      collection(db, 'events'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, 'list', 'events');
    });

    return () => {
      unsubscribeBugs();
      unsubscribeEvents();
    };
  }, [user, selectedProject]);

  const handleInviteMember = async () => {
    if (!inviteUserEmail.trim() || !user || !selectedProject) return;
    try {
      // Logic: Find user by email (in a real app you'd do a query, here we search in our synced profiles)
      const targetUser = userProfiles.find(u => u.email === inviteUserEmail.trim());
      if (!targetUser) {
        toast.error("Không tìm thấy nhân sự trong hệ thống.");
        return;
      }
      if (selectedProject.members.includes(targetUser.userId)) {
        toast.error("Nhân sự này đã được gán vào nút này.");
        return;
      }

      const projectRef = doc(db, 'projects', selectedProject.id);
      const updatedMembers = [...selectedProject.members, targetUser.userId];
      await setDoc(projectRef, { members: updatedMembers }, { merge: true });
      
      toast.success(`Nhân sự ${targetUser.displayName} đã được triển khai vào nút.`);
      setInviteUserEmail('');
      setShowInviteModal(false);
    } catch (e) {
      toast.error("Kiểm tra xác thực thất bại.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !selectedProject || memberId === selectedProject.ownerId) return;
    if (user.uid !== selectedProject.ownerId) {
      toast.error("Yêu cầu quyền quản trị viên.");
      return;
    }

    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      const updatedMembers = selectedProject.members.filter(id => id !== memberId);
      await setDoc(projectRef, { members: updatedMembers }, { merge: true });
      toast.success("Quyền truy cập của nhân sự đã bị thu hồi.");
    } catch (e) {
      toast.error("Thao tác thất bại.");
    }
  };

  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (startTab?: typeof activeTab) => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      if (startTab) setActiveTab(startTab);
      toast.success("Chào mừng trở lại");
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      toast.error("Xác thực thất bại");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => auth.signOut();

  const [projectLogs, setProjectLogs] = useState<any[]>([]);

  const overdueTasks = useMemo(() => {
    return bugs.filter(b => b.status !== 'done' && b.dueDate && new Date(b.dueDate) < new Date());
  }, [bugs]);

  const urgentTasks = useMemo(() => {
    if (!user) return [];
    const profile = userProfiles.find(u => u.userId === user.uid);
    const isAdminUser = profile?.roles?.includes('admin') || profile?.email === 'jokerducanh@gmail.com' || selectedProject?.ownerId === user.uid;
    
    if (isAdminUser) return overdueTasks;
    return overdueTasks.filter(b => b.assigneeId === user.uid);
  }, [overdueTasks, user, userProfiles, selectedProject]);

  const appStats = useMemo(() => {
    const total = bugs.length;
    const resolved = bugs.filter(b => b.status === 'done').length;
    const open = total - resolved;
    const critical = bugs.filter(b => b.priority === 'critical').length;
    
    return {
      total,
      resolved,
      open,
      critical,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 100,
      activeEvents: events.filter(e => e.status === 'in-progress').length
    };
  }, [bugs, events]);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const profile = userProfiles.find(u => u.userId === user.uid);
    return profile?.roles?.includes('admin') || 
           profile?.email === 'jokerducanh@gmail.com' ||
           selectedProject?.ownerId === user.uid;
  }, [user, userProfiles, selectedProject]);

  const handleUpdateUserRoles = async (targetUserId: string, currentRoles: UserRole[], role: UserRole) => {
    if (!isAdmin) return;
    const newRoles = currentRoles.includes(role) 
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    if (targetUserId === user?.uid && role === 'admin' && currentRoles.includes('admin') && newRoles.length === 0) {
      toast.error("Không thể gỡ bỏ vai trò quản trị cuối cùng của chính bạn");
      return;
    }

    try {
      await setDoc(doc(db, 'users', targetUserId), {
        roles: newRoles
      }, { merge: true });
      toast.success("Cập nhật phân quyền thành công");
    } catch (e) {
      toast.error("Lỗi cập nhật quyền");
    }
  };

  const resolutionChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString([], { weekday: 'short' });
    }).reverse();

    const stats = last7Days.map(day => {
      const count = bugs.filter(b => {
        if (!b.createdAt?.toDate) return false;
        const bugDay = new Date(b.createdAt.toDate()).toLocaleDateString([], { weekday: 'short' });
        return bugDay === day;
      }).length;
      return { name: day, value: count };
    });

    return stats;
  }, [bugs]);

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
      await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        description: 'New Project',
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        members: [user.uid]
      });
      setNewProjectName('');
      setShowProjectModal(false);
      toast.success("Không gian làm việc đã được tạo");
    } catch (error) { toast.error("Không thể tạo không gian làm việc."); }
  };

  const handleCreateEvent = async () => {
    if (!newEventTitle.trim() || !user || !selectedProject) return;
    try {
      await addDoc(collection(db, 'events'), {
        title: newEventTitle,
        projectId: selectedProject.id,
        status: 'in-progress',
        time: new Date().toLocaleTimeString(),
        createdAt: serverTimestamp(),
        userId: user.uid
      });
      setNewEventTitle('');
      setShowEventModal(false);
      toast.success("Sự kiện vận hành đã được truyền tin");
    } catch (e) { toast.error("Triển khai thất bại"); }
  };

  const handleUpdateProject = async () => {
    if (!user || !selectedProject || !selectedProject.name.trim()) return;
    setIsUpdatingProject(true);
    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      await setDoc(projectRef, { name: selectedProject.name, description: selectedProject.description || '' }, { merge: true });
      toast.success("Cập nhật dự án thành công.");
    } catch (error) { handleFirestoreError(error, 'update', 'projects'); } finally { setIsUpdatingProject(false); }
  };

  const handleDeleteProject = async () => {
    if (!user || !selectedProject) return;
    try {
      const projectId = selectedProject.id;
      await deleteDoc(doc(db, 'projects', projectId)); 
      toast.success("Lưu trữ dự án đã hoàn tất.");
      setShowSettingsModal(false);
      setSelectedProject(null);
      setActiveTab('dashboard');
    } catch (error) { handleFirestoreError(error, 'delete', 'projects'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 relative">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} 
            className="w-full h-full border border-slate-200 border-t-slate-900 rounded-full" 
          />
        </div>
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] animate-pulse">Zenith System Init</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans noise-overlay">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full min-h-screen bg-white relative overflow-hidden">
            <MatrixBackground />
            <div className="absolute inset-0 pattern-zenith opacity-[0.6]" />
            <nav className="fixed top-0 left-0 right-0 h-20 md:h-24 flex items-center justify-between px-6 lg:px-32 z-[100] bg-white/40 backdrop-blur-3xl border-b border-slate-200/30">
               <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center rounded-xl shadow-2xl shadow-slate-950/20 group-hover:rotate-12 transition-transform duration-700">
                     <Orbit size={24} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-heading font-black text-slate-950 tracking-[-0.08em] uppercase leading-none">Zenith</span>
                    <span className="text-[7px] font-black text-brand-600 uppercase tracking-[0.5em] font-mono leading-none mt-1.5 italic">Protocol_v4.2</span>
                  </div>
               </div>

               <div className="hidden lg:flex items-center gap-16">
                 <div className="flex items-center gap-12">
                   <button className="text-[9px] font-black text-slate-400 hover:text-slate-950 transition-all uppercase tracking-[0.4em] font-mono italic">Library_</button>
                   <button className="text-[9px] font-black text-slate-400 hover:text-slate-950 transition-all uppercase tracking-[0.4em] font-mono italic">Nodes_</button>
                 </div>
                 <div className="w-px h-6 bg-slate-100" />
                 <div className="flex items-center gap-10">
                   <button onClick={() => handleLogin()} className="text-[9px] font-black text-slate-500 hover:text-slate-950 transition-all uppercase tracking-[0.4em] font-mono italic">Access_</button>
                   <button onClick={() => handleLogin()} className="h-12 px-10 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-[0.3em] font-mono hover:bg-brand-600 hover:shadow-2xl hover:shadow-brand-500/20 active:scale-95 transition-all duration-500">Initialize_Protocol</button>
                 </div>
               </div>
            </nav>

            <main className="relative pt-32 lg:pt-60 px-6 lg:px-32 max-w-[1400px] mx-auto flex flex-col min-h-screen">
               <div className="flex flex-col items-center text-center space-y-20">
                 <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="space-y-12 max-w-5xl">
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-xl bg-white border border-slate-200/50 text-slate-400 text-[8px] font-black uppercase tracking-[0.5em] font-mono shadow-sm">
                      <div className="h-1 w-1 rounded-full bg-brand-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                      Zenith::Matrix_Core_v4.2.1
                    </div>
                    
                    <h1 className="text-6xl md:text-9xl lg:text-[12rem] font-heading font-black tracking-[-0.09em] text-slate-950 leading-[0.75] uppercase italic">
                       The <span className="text-brand-600 relative inline-block">
                         Zenith
                         <motion.div 
                           className="absolute -bottom-2 left-0 w-full h-2 bg-brand-500/20"
                           initial={{ width: 0 }}
                           animate={{ width: '100%' }}
                           transition={{ duration: 2, delay: 1 }}
                         />
                       </span> <br />
                       <span className="text-white bg-slate-950 px-12 py-6 inline-block -rotate-2 mt-12 shadow-5xl ring-1 ring-white/10">Operating.</span>
                    </h1>
                    
                    <p className="text-xl lg:text-3xl text-slate-500 max-w-3xl mx-auto leading-relaxed tracking-tight font-medium opacity-80 italic mt-8">
                       Hệ điều hành quản trị tối ưu cho đội ngũ tinh hoa. <br />
                       <span className="text-brand-500 not-italic font-black text-sm uppercase tracking-[0.4em] font-mono">Precision_Engineering_System</span>
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-8 pt-16">
                       <button onClick={() => handleLogin()} className="h-16 px-12 bg-slate-950 text-white rounded-2xl text-[11px] font-black hover:bg-brand-600 transition-all flex items-center gap-5 shadow-2xl shadow-slate-950/20 active:scale-95 uppercase tracking-[0.3em] group duration-500">
                          Deploy Matrix <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-500" />
                       </button>
                       <button onClick={() => setShowDocsModal(true)} className="h-16 px-12 border border-slate-200 bg-white text-slate-950 text-[11px] font-black hover:bg-slate-50 transition-all rounded-2xl flex items-center gap-5 uppercase tracking-[0.3em] shadow-sm duration-500 italic">
                          Technical_Doc
                       </button>
                    </div>
                 </motion.div>


                  <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }} className="relative w-full max-w-6xl mx-auto">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent)] blur-[120px] -z-10" />
                    <div className="relative p-6 rounded-[5rem] bg-slate-200/20 border border-white shadow-5xl backdrop-blur-xl">
                       <div className="bg-white rounded-[4.5rem] overflow-hidden aspect-[16/10] p-16 md:p-24 flex flex-col justify-between border border-white shadow-inner relative group">
                          <div className="absolute inset-0 pattern-zenith opacity-[0.06]" />
                          <div className="absolute top-0 right-0 p-32 opacity-[0.02] rotate-12 transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-45">
                             <Orbit size={600} strokeWidth={1} />
                          </div>
                          <div className="flex justify-between items-start relative z-10 w-full scale-110 md:scale-100 origin-top-left transition-transform duration-700">
                             <div className="space-y-8">
                                <div className="w-28 h-28 bg-slate-950 text-white flex items-center justify-center rounded-[2.5rem] shadow-5xl shadow-slate-950/40 group-hover:rotate-12 transition-all duration-700">
                                   <Cpu size={48} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="space-y-4">
                                  <h3 className="text-7xl font-heading font-black text-slate-950 uppercase tracking-tighter leading-none italic">System_Core</h3>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em] font-mono leading-none italic opacity-60">Kernel_Distribution::Node_0x1</p>
                                </div>
                             </div>
                             <div className="px-10 py-4 bg-emerald-50/80 backdrop-blur-md text-emerald-600 rounded-3xl text-[10px] font-black uppercase tracking-[0.5em] border border-emerald-100 flex items-center gap-5 shadow-inner-glow italic overflow-hidden">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                                OPERATIONAL::TX_ESTABLISHED
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                             </div>
                          </div>
                          
                          <div className="space-y-24 relative z-10 w-full">
                             <div className="space-y-10">
                                <div className="flex justify-between items-end">
                                   <div className="space-y-6">
                                     <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.6em] font-mono leading-none italic block">Throughput Metrics</span>
                                     <div className="h-1 w-20 bg-brand-500 rounded-full" />
                                   </div>
                                   <div className="flex items-baseline gap-6">
                                     <span className="text-[12rem] font-heading font-black text-slate-950 tracking-[-0.08em] leading-none italic transition-all duration-700 group-hover:tracking-[-0.1em]">98.2</span>
                                     <span className="text-4xl text-slate-300 font-mono font-black uppercase tracking-tighter italic">Tbps</span>
                                   </div>
                                </div>
                                <div className="h-10 w-full bg-slate-50/80 rounded-[2rem] overflow-hidden border border-slate-200/50 shadow-inner p-2">
                                   <motion.div animate={{ width: ["94%", "99%", "96%"] }} transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} className="h-full bg-slate-950 rounded-full shadow-5xl relative overflow-hidden">
                                      <motion.div animate={{ x: ['-100%', '300%'] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                                   </motion.div>
                                </div>
                             </div>
                             
                             <div className="grid grid-cols-3 gap-16 pt-12 border-t border-slate-100/50">
                                <div className="flex flex-col gap-6">
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none font-mono italic">Terminal_Nodes</div>
                                   <div className="text-7xl font-black text-slate-950 uppercase tracking-tighter italic leading-none">4.5K</div>
                                </div>
                                <div className="flex flex-col gap-6 border-l border-slate-100 pl-16">
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none font-mono italic">Latency_μs</div>
                                   <div className="text-7xl font-black text-slate-950 uppercase tracking-tighter italic leading-none">0.2</div>
                                </div>
                                <div className="flex flex-col gap-6 border-l border-slate-100 pl-16">
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] leading-none font-mono italic">Encryption</div>
                                   <div className="text-7xl font-black text-indigo-500 uppercase tracking-tighter italic leading-none">RSA</div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               </div>

                <footer className="mt-32 pt-20 pb-20 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-950 text-white flex items-center justify-center rounded-lg">
                         <Orbit size={16} />
                      </div>
                      <span className="text-lg font-heading font-black text-slate-950 tracking-tighter">ZENITH</span>
                   </div>
                   <div className="flex items-center gap-12 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                      <a href="#" className="hover:text-slate-900 transition-colors">Twitter</a>
                      <a href="#" className="hover:text-slate-900 transition-colors">GitHub</a>
                      <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
                   </div>
                 </footer>
              </main>
           </motion.div>
         ) : (
           <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-screen overflow-hidden bg-white relative">
            <aside className="hidden md:flex w-80 h-full flex-col bg-white/80 backdrop-blur-3xl border-r border-slate-200/50 relative z-50 overflow-hidden">
               <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
               <div className="p-6 pb-8 flex items-center gap-5 relative">
                  <div className="w-12 h-12 bg-slate-950 text-white flex items-center justify-center rounded-[1.25rem] shadow-3xl shadow-slate-950/20 rotate-[-8deg] group hover:rotate-0 transition-all duration-700">
                     <Orbit size={24} strokeWidth={2.5} className="group-hover:animate-spin-slow" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-slate-950 tracking-[-0.05em] uppercase leading-none group-hover:text-brand-600 transition-colors">ZENITH</span>
                    <span className="text-[9px] font-black text-brand-600 uppercase tracking-[0.4em] font-mono mt-1.5 opacity-60">SYSTEM_X</span>
                  </div>
               </div>

                <div className="flex-1 px-4 space-y-1 mt-2">
                  {[
                    { id: 'dashboard', icon: LayoutGrid, label: 'Overview' },
                    { id: 'board', icon: FolderKanban, label: 'Task Matrix' },
                    { id: 'metrics', icon: PieChart, label: 'Analytics Hub' },
                    { id: 'logs', icon: Activity, label: 'System Logs' },
                    { id: 'members', icon: Users, label: 'Operators' },
                  ].map(item => (
                    <button 
                      key={item.id} 
                      onClick={() => setActiveTab(item.id as any)}
                      className={cn(
                        "relative flex items-center gap-4 w-full px-4 py-2.5 rounded-xl transition-all duration-300 group outline-none",
                        activeTab === item.id 
                          ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10" 
                          : "text-slate-500 hover:text-slate-950 hover:bg-slate-50/50"
                      )}
                    >
                      <item.icon 
                        size={18} 
                        strokeWidth={activeTab === item.id ? 2.5 : 2}
                        className={cn(
                          "transition-all duration-300",
                          activeTab === item.id ? "text-white" : "group-hover:scale-110"
                        )}
                      />
                      <span className="text-[12px] font-bold uppercase tracking-wide">{item.label}</span>
                      {activeTab === item.id && (
                        <motion.div layoutId="activeTabIndicator" className="absolute right-4 w-1 h-1 rounded-full bg-brand-400" />
                      )}
                    </button>
                  ))}
               </div>

               <div className="p-8 mt-auto border-t border-slate-50">
                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl flex items-center gap-4 group cursor-pointer hover:bg-slate-100/80 transition-all">
                    <div className="relative">
                      <img className="w-11 h-11 rounded-2xl border-2 border-white shadow-xl group-hover:scale-105 transition-transform" src={user.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.uid}`} alt="" />
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                       <div className="text-[12px] font-black text-slate-950 truncate uppercase tracking-tight italic">{user.displayName}</div>
                       <button onClick={handleLogout} className="text-[9px] font-black text-slate-400 hover:text-rose-600 transition-colors uppercase tracking-[0.3em] font-mono leading-none">SIGN_OUT</button>
                    </div>
                  </div>
               </div>
            </aside>
            {/* MOBILE BOTTOM NAVIGATION */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-2xl border-t border-slate-100 z-[100] px-4 flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.03)] pb-safe">
               {[
                 { id: 'dashboard', icon: LayoutGrid },
                 { id: 'board', icon: FolderKanban },
                 { id: 'metrics', icon: PieChart },
                 { id: 'logs', icon: Activity },
               ].map(item => (
                 <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300",
                    activeTab === item.id 
                      ? "bg-slate-900 text-white shadow-lg scale-110 active:scale-95" 
                      : "text-slate-400"
                  )}
                 >
                   <item.icon size={20} strokeWidth={activeTab === item.id ? 3 : 2} />
                 </button>
               ))}
            </nav>

            <main className="flex-1 overflow-hidden flex flex-col bg-slate-50 pattern-zenith pb-16 md:pb-0">
               <header className="h-20 md:h-24 bg-white/80 backdrop-blur-3xl shrink-0 border-b border-slate-100/80 flex items-center justify-between px-8 md:px-14 sticky top-0 z-[60] shadow-sm">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <button 
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg border border-slate-200 transition-all font-sans bg-white shadow-sm"
                      >
                         <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                         <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">{selectedProject?.name || 'Loading...'}</span>
                         <ChevronDown size={12} className={cn("text-slate-400 transition-transform", showProjectDropdown && "rotate-180")} />
                      </button>
                      
                      <AnimatePresence>
                         {showProjectDropdown && (
                           <motion.div 
                             initial={{ opacity: 0, y: 8 }} 
                             animate={{ opacity: 1, y: 0 }} 
                             exit={{ opacity: 0, y: 8 }} 
                             className="absolute top-full left-0 mt-2 w-56 z-[110] bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden p-1.5"
                           >
                             <div className="px-3 py-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dự án</div>
                             <div className="space-y-0.5">
                               {projects.map(p => (
                                 <button key={p.id} onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); }} className={cn("w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all", selectedProject?.id === p.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50")}>
                                   {p.name}
                                   {selectedProject?.id === p.id && <Check size={12} />}
                                 </button>
                               ))}
                               <div className="h-px bg-slate-100 my-1.5 mx-1.5" />
                               <button 
                                 onClick={() => { setShowProjectModal(true); setShowProjectDropdown(false); }} 
                                 className="w-full flex items-center gap-2 px-3 py-2 text-xs text-brand-600 font-semibold hover:bg-brand-50 rounded-xl transition-colors"
                               >
                                 <Plus size={14} /> Tạo dự án
                               </button>
                             </div>
                           </motion.div>
                         )}
                      </AnimatePresence>
                    </div>

                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeTab}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button onClick={() => setShowInviteModal(true)} className="h-9 px-4 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-brand-600 transition-all flex items-center gap-2">
                       <UserPlus size={14} /> 
                       <span>Mời</span>
                    </button>
                    <button onClick={() => setShowSettingsModal(true)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                       <Settings size={18} />
                    </button>
                  </div>
               </header>

               <div className="flex-1 overflow-auto custom-scrollbar p-4 lg:p-6">
                   <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                        <motion.div 
                           initial={{ opacity: 0, y: 10 }} 
                           animate={{ opacity: 1, y: 0 }} 
                           exit={{ opacity: 0, y: -20 }} 
                           className="space-y-6 w-full max-w-7xl mx-auto py-2"
                        >
                           <header className="flex flex-col gap-4 mb-4">
                                <div className="flex items-center gap-6">
                                  <div className="w-1.5 h-6 bg-slate-950 rounded-full" />
                                  <div className="space-y-1">
                                    <h3 className="text-[10px] font-black text-slate-950 uppercase tracking-[0.4em] font-mono leading-none">Command_Protocol</h3>
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono">Telemetry_Sync_Established</span>
                                    </div>
                                  </div>
                                </div>
                                <h2 className="text-4xl md:text-5xl lg:text-7xl font-heading font-black tracking-[-0.06em] uppercase leading-[0.8] text-slate-950">
                                  Command.<br/>Center
                                </h2>
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                  <p className="text-base md:text-lg text-slate-500 font-medium tracking-tight max-w-xl leading-relaxed">
                                    Giám sát rơ-le dữ liệu thời gian thực và phân bổ tài nguyên tối ưu cho đội ngũ tinh hoa. 
                                    <span className="block mt-1 text-[10px] font-black uppercase tracking-[0.4em] font-mono text-slate-300">System_Core v4.2.1</span>
                                  </p>
                                  <motion.div 
                                    className="flex flex-col items-start lg:items-end gap-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl min-w-[260px] relative overflow-hidden"
                                  >
                                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono leading-none">Atomic_Clock</span>
                                     <span className="text-4xl font-heading font-black text-slate-950 tracking-tighter leading-none">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                     <div className="flex items-center gap-3 mt-1">
                                        <div className="w-1 h-1 rounded-full bg-brand-500 animate-ping" />
                                        <span className="text-[9px] font-black text-brand-500 uppercase tracking-[0.4em] font-mono">Sync_Active</span>
                                     </div>
                                  </motion.div>
                                </div>
                             </header>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                             <StatsCard label="Năng suất" value={`${appStats.resolutionRate}%`} icon={<Cpu />} trend="STABLE" />
                             <StatsCard label="Xử lý" value={appStats.open} icon={<Activity />} trend="ACTIVE" />
                             <StatsCard label="Khẩn cấp" value={appStats.critical} icon={<Zap />} trend="URGENT" />
                             <StatsCard label="Hoàn thành" value={appStats.resolved} icon={<CheckCircle2 />} trend="STABLE" />
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                               <section className="bg-white rounded-[1.5rem] border border-slate-100 p-6 shadow-sm">
                                  <div className="flex items-center justify-between mb-6">
                                     <div className="space-y-1">
                                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                           Lịch trình dự án
                                        </h3>
                                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight">Timeline vận hành cấp độ Delta</p>
                                     </div>
                                     <div className="text-[9px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 uppercase tracking-widest">{currentTime.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</div>
                                  </div>
                                  
                                  <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                                     {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                                        <div key={day} className="bg-slate-50 py-2 text-center text-[9px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-100 last:border-0">{day}</div>
                                     ))}
                                     {Array.from({ length: 35 }).map((_, i) => {
                                        const dayNum = i - 2; 
                                        const isToday = dayNum === currentTime.getDate(); 
                                        const isCurrentMonth = dayNum > 0 && dayNum <= 30;
                                        const dateString = `2026-04-${String(dayNum).padStart(2, '0')}`;
                                        const dayBugs = bugs.filter(b => b.dueDate?.startsWith(dateString));
                                        
                                        return (
                                           <div key={i} className={cn(
                                              "h-20 p-2 bg-white flex flex-col gap-1 transition-all hover:bg-slate-50/50 relative group/cell",
                                              !isCurrentMonth && "bg-slate-50/10 opacity-30 pointer-events-none"
                                            )}>
                                              <span className={cn(
                                                 "text-[10px] font-bold font-mono text-slate-200",
                                                 isToday && "text-brand-600 font-extrabold"
                                              )}>
                                                 {dayNum > 0 && dayNum <= 30 ? dayNum : (dayNum <= 0 ? 31 + dayNum : dayNum - 30)}
                                              </span>
                                              <div className="space-y-1.5 mt-2">
                                                 {dayBugs.slice(0, 3).map(bug => (
                                                   <div key={bug.id} className={cn(
                                                     "h-1.5 w-full rounded-full",
                                                     bug.status === 'done' ? "bg-emerald-400/20" : "bg-brand-500/40"
                                                   )} />
                                                 ))}
                                              </div>
                                           </div>
                                        );
                                     })}
                                  </div>
                               </section>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <QuickAction title="Khởi tạo mới" desc="Bắt đầu nhiệm vụ hoặc quy trình vận hành Zenith." icon={<Plus />} onClick={() => setShowProjectModal(true)} />
                                  <QuickAction title="Đội ngũ" desc="Quản lý nhân sự và phân quyền truy cập hệ thống." icon={<Users />} onClick={() => setShowInviteModal(true)} />
                               </div>
                            </div>

                            <div className="space-y-8">
                               <section className="bg-white rounded-[2rem] border border-slate-100 p-8 flex flex-col shadow-sm">
                                  <div className="flex items-center justify-between mb-10">
                                     <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] font-mono">Nhật ký vận hành</h3>
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                  </div>
                                  <div className="flex-1 space-y-8">
                                     {projectLogs.slice(0, 5).map((log, i) => (
                                        <div key={log.id} className="flex gap-4 group">
                                           <div className="relative">
                                              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-brand-600 group-hover:border-brand-100 transition-all">
                                                 <Orbit size={14} />
                                              </div>
                                              {i !== projectLogs.slice(0, 5).length - 1 && <div className="absolute top-9 left-1/2 -translate-x-1/2 w-px h-8 bg-slate-100" />}
                                           </div>
                                           <div className="flex-1 min-w-0">
                                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{log.action}</div>
                                              <p className="text-[13px] text-slate-600 font-medium leading-tight group-hover:text-slate-950 transition-colors line-clamp-2">{log.details}</p>
                                              <div className="text-[8px] font-bold text-slate-300 mt-2 font-mono uppercase">{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</div>
                                           </div>
                                        </div>
                                     ))}
                                  </div>
                                  <button onClick={() => setActiveTab('logs')} className="mt-10 w-full py-4 bg-slate-50 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all rounded-2xl border border-slate-100/50">
                                     Xem tất cả nhật ký
                                  </button>
                               </section>

                               {urgentTasks.length > 0 && (
                                 <section className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 space-y-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-6 opacity-[0.05] text-rose-600">
                                       <AlertTriangle size={80} />
                                    </div>
                                    <div className="relative">
                                       <div className="flex items-center justify-between mb-6">
                                          <h3 className="text-xs font-bold text-rose-600 uppercase tracking-widest leading-none">Nhiệm vụ trễ hạn</h3>
                                          <div className="px-2 py-0.5 bg-rose-600 text-white rounded text-[8px] font-bold uppercase">{urgentTasks.length} NODES</div>
                                       </div>
                                       <div className="space-y-3">
                                          {urgentTasks.slice(0, 3).map(task => (
                                            <div key={task.id} onClick={() => setActiveTab('board')} className="bg-white p-4 rounded-2xl border border-rose-200/50 shadow-sm cursor-pointer hover:border-rose-400 transition-all transform hover:-translate-y-0.5">
                                               <h4 className="text-[12px] font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-rose-600 transition-colors">{task.title}</h4>
                                               <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 uppercase tracking-tight">
                                                  <span className="text-rose-500">QUÁ HẠN</span>
                                                  <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                                               </div>
                                            </div>
                                          ))}
                                       </div>
                                       <button onClick={() => setActiveTab('board')} className="mt-8 w-full py-4 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl shadow-xl shadow-slate-900/10 active:scale-95 transition-all">
                                          Xử lý ngay lập tức
                                       </button>
                                    </div>
                                 </section>
                               )}
                            </div>
                          </div>
                        </motion.div>
                     )}

                    {activeTab === 'metrics' && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16 w-full max-w-7xl mx-auto">
                        <header className="space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="h-0.5 w-12 bg-slate-950 rounded-full" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] font-mono">Operations Analytics Registry</span>
                           </div>
                           <h2 className="text-4xl md:text-8xl font-heading font-black tracking-tighter uppercase leading-[0.8] text-slate-950">Chỉ số phân tích</h2>
                           <p className="text-lg md:text-xl text-slate-500 font-medium tracking-tight max-w-2xl leading-relaxed">Trực quan hóa hiệu suất vận hành hệ thống Zenith thông qua các rơ-le dữ liệu thời gian thực.</p>
                        </header>
 
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
                           <StatsCard label="Chính xác" value={`${appStats.resolutionRate}%`} icon={<CheckCircle2 size={16} />} trend="ĐỒNG BỘ" />
                           <StatsCard label="Khối lượng" value={appStats.total} icon={<Rocket size={16} />} trend="TUYẾN TÍNH" />
                           <StatsCard label="Ghi chép" value={events.length} icon={<Globe size={16} />} trend="ĐÃ GHI" />
                        </div>
 
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                           <div className="card-smart min-h-[350px] md:h-[520px] flex flex-col bg-white border border-slate-200 p-6 md:p-12 rounded-3xl overflow-hidden shadow-sm">
                             <div className="flex items-center justify-between mb-8 md:mb-12">
                                <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em] font-mono">Tốc độ giải quyết</h3>
                                <div className="px-3 py-1 bg-slate-50 rounded-xl text-[9px] font-black text-brand-600 tracking-widest border border-slate-100">ALPHA-CHART</div>
                             </div>
                             <div className="flex-1 w-full translate-x-[-15px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={resolutionChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', fontFamily: 'JetBrains Mono' }} dy={10} />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '24px' }} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[10, 10, 0, 0]} barSize={34} />
                                  </BarChart>
                                </ResponsiveContainer>
                             </div>
                           </div>
 
                           <div className="card-smart min-h-[400px] md:h-[520px] flex flex-col items-center p-6 md:p-12 bg-white border border-slate-200 rounded-3xl shadow-sm">
                             <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em] font-mono mb-8 md:mb-10 self-start">Phân bổ ưu tiên</h3>
                             <div className="flex-1 w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RePieChart>
                                    <Pie 
                                      data={[
                                        { name: 'Critical', value: bugs.filter(b => b.priority === 'critical').length },
                                        { name: 'High', value: bugs.filter(b => b.priority === 'high').length },
                                        { name: 'Medium', value: bugs.filter(b => b.priority === 'medium').length },
                                      ]} 
                                      innerRadius={window.innerWidth < 768 ? 60 : 110} 
                                      outerRadius={window.innerWidth < 768 ? 90 : 150} 
                                      paddingAngle={10} dataKey="value"
                                       stroke="none"
                                     >
                                       <Cell fill="#f43f5e" />
                                       <Cell fill="#f59e0b" />
                                       <Cell fill="#6366f1" />
                                     </Pie>
                                     <Tooltip />
                                   </RePieChart>
                                </ResponsiveContainer>
                                  <div className="absolute flex flex-col items-center justify-center gap-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Payloads</span>
                                    <span className="text-6xl font-heading font-black text-slate-950 italic leading-none">{bugs.length}</span>
                                 </div>
                              </div>
                            </div>
                         </div>
                       </motion.div>
                     )}

                    {activeTab === 'members' && (
                      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-16 w-full max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                            <div className="space-y-6">
                               <div className="flex items-center gap-4">
                                  <div className="h-0.5 w-12 bg-slate-950 rounded-full" />
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] font-mono">Operator Deployment Registry</span>
                               </div>
                               <h2 className="text-4xl md:text-8xl font-heading font-black tracking-tighter uppercase leading-[0.8] text-slate-950">System Operators</h2>
                               <p className="text-lg md:text-xl text-slate-500 font-medium tracking-tight max-w-xl leading-relaxed">Directory of authorized engine operators assigned to this matrix node.</p>
                            </div>
                            <button onClick={() => setShowInviteModal(true)} className="h-14 px-10 bg-slate-950 text-white rounded-2xl text-[12px] font-bold hover:bg-brand-600 transition-all flex items-center gap-3 uppercase tracking-widest shadow-xl shadow-slate-950/10">
                               <UserPlus size={18} /> Add Member
                            </button>
                        </div>
   
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {userProfiles.map((profile) => (
                              <div key={profile.userId} className="bg-white border border-slate-100 p-8 rounded-[2.5rem] flex items-center justify-between group hover:border-slate-300 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/40 relative overflow-hidden">
                                  <div className="flex items-center gap-8">
                                    <div className="relative">
                                      <img src={profile.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.userId}`} alt="" className="w-24 h-24 rounded-[2rem] bg-slate-50 border border-slate-50 shadow-inner group-hover:scale-105 transition-transform duration-500" />
                                      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-xl">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                      </div>
                                    </div>
                                 <div className="space-y-4">
                                       <div className="text-2xl font-heading font-black text-slate-950 tracking-tighter uppercase group-hover:text-brand-600 transition-colors">{profile.displayName}</div>
                                       <div className="flex items-center gap-3 py-2 px-4 bg-slate-50 rounded-xl w-fit border border-slate-100">
                                          <Mail size={12} className="text-slate-400" />
                                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">{profile.email}</div>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-4">
                                    <div className="flex flex-wrap gap-2 justify-end">
                                      {isAdmin ? (
                                        (Object.keys(ROLE_CONFIG) as UserRole[]).map(role => {
                                          const isAssigned = profile.roles?.includes(role);
                                          return (
                                            <button
                                              key={role}
                                              onClick={() => handleUpdateUserRoles(profile.userId, profile.roles || [], role)}
                                              className={cn(
                                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all border",
                                                isAssigned 
                                                  ? cn(ROLE_CONFIG[role].color, "text-white border-transparent shadow-md shadow-current/10")
                                                  : "bg-white text-slate-300 border-slate-100 hover:border-indigo-300 hover:text-indigo-600"
                                              )}
                                            >
                                              {isAssigned && <Check size={10} />}
                                              {ROLE_CONFIG[role].label.split(' / ')[0]}
                                             </button>
                                          );
                                       })
                                      ) : (
                                        profile.roles?.map(role => (
                                          <div key={role} className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest text-white", ROLE_CONFIG[role].color)}>
                                            {ROLE_CONFIG[role].label}
                                          </div>
                                        ))
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-300 group-hover:text-slate-500 transition-colors">
                                        <button onClick={() => toast.info(`Sharing node access for ${profile.displayName}...`)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-all"><Share2 size={16} /></button>
                                        {selectedProject?.ownerId !== profile.userId && user?.uid === selectedProject?.ownerId && (
                                          <button onClick={() => handleRemoveMember(profile.userId)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-all"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                 </div>
                              </div>
                            ))}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'board' && selectedProject && (
                      <KanbanBoard 
                        key={selectedProject.id} 
                        projectId={selectedProject.id} 
                        userId={user.uid} 
                        userProfiles={userProfiles} 
                        bugs={bugs} 
                        isProjectOwner={selectedProject.ownerId === user.uid}
                      />
                    )}

                     {activeTab === 'logs' && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16 w-full">
                        <header className="space-y-6">
                           <div className="flex items-center gap-4">
                              <div className="h-0.5 w-12 bg-slate-900 rounded-full" />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] font-mono">Protocol Event Ledger</span>
                           </div>
                           <h2 className="text-4xl md:text-8xl font-heading font-black tracking-tighter uppercase leading-[0.8] text-slate-950">System Logs</h2>
                           <p className="text-lg md:text-xl text-slate-500 font-medium tracking-tight max-w-2xl leading-relaxed">Ghi chép toàn diện các sự kiện hệ thống và quá trình chuyển đổi trạng thái mạng lưới.</p>
                         </header>

                         <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:border-slate-300 transition-all">
                           <div className="overflow-x-auto no-scrollbar">
                             <table className="w-full text-left min-w-[800px]">
                               <thead>
                                 <tr className="bg-slate-50/50 border-b border-slate-100">
                                   <th className="px-10 py-8 text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase font-mono">Timestamp_Iso</th>
                                   <th className="px-10 py-8 text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase font-mono">Protocol_Action</th>
                                   <th className="px-10 py-8 text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase font-mono">Operator_Identity</th>
                                   <th className="px-10 py-8 text-[10px] font-black text-slate-400 tracking-[0.3em] uppercase font-mono">Audit_Details_Stream</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-50">
                                 {projectLogs.length === 0 ? (
                                   <tr>
                                     <td colSpan={4} className="px-10 py-24 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Hệ thống đang chờ lệnh... Không có hồ sơ hoạt động.</td>
                                   </tr>
                                 ) : projectLogs.map((log) => (
                                   <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group/row">
                                     <td className="px-10 py-8 font-mono text-[11px] text-slate-400 font-medium">{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleString() : 'FETCHING...'}</td>
                                     <td className="px-10 py-8">
                                       <span className="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-mono font-black text-slate-500 group-hover/row:bg-slate-950 group-hover/row:text-white transition-all uppercase tracking-widest">{log.action?.toUpperCase() || 'MOD'}</span>
                                     </td>
                                     <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                           <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-slate-950/10 italic">
                                              {userProfiles.find(u => u.userId === log.userId)?.displayName?.slice(0, 2).toUpperCase() || 'SY'}
                                           </div>
                                           <span className="font-bold text-slate-950 text-sm tracking-tight">{userProfiles.find(u => u.userId === log.userId)?.displayName || 'SYSTEM_CORE'}</span>
                                        </div>
                                     </td>
                                     <td className="px-10 py-8">
                                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 group-hover/row:bg-white transition-all">
                                           <span className="text-xs font-medium text-slate-500 leading-relaxed font-mono italic">{log.details || 'Không có mô tả chi tiết được mã hóa.'}</span>
                                        </div>
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>
               </main>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
           {showSettingsModal && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="w-full max-w-2xl relative z-[510] overflow-hidden bg-white border border-slate-200/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[2.5rem]"
               >
                  <div className="px-12 py-10 flex items-center justify-between border-b border-slate-100">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-950 text-white flex items-center justify-center rounded-2xl shadow-xl">
                           <Settings size={22} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-950 tracking-tight uppercase italic">Settings_Control</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">System Configuration Matrix</p>
                        </div>
                     </div>
                     <button onClick={() => setShowSettingsModal(false)} className="w-12 h-12 rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center text-slate-400 hover:text-slate-950">
                        <X size={24} />
                     </button>
                  </div>
                  <div className="p-12 space-y-12">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono ml-1">Workspace_Identity</label>
                        <input 
                          className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-8 text-2xl font-black text-slate-950 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-200 font-mono italic"
                          value={selectedProject?.name} 
                          onChange={(e) => setSelectedProject(selectedProject ? {...selectedProject, name: e.target.value} : null)} 
                          disabled={user?.uid !== selectedProject?.ownerId}
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-8">
                        <div className="p-8 space-y-3 bg-slate-50 border border-slate-100 rounded-3xl">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono opacity-50">Encryption_Standard</span>
                           <div className="text-lg font-black text-slate-950 italic font-mono uppercase">AES-256-GCM</div>
                        </div>
                        <div className="p-8 space-y-3 bg-slate-50 border border-slate-100 rounded-3xl">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono opacity-50">Security_Level</span>
                           <div className="text-lg font-black text-emerald-600 italic font-mono flex items-center gap-2">
                              <Lock size={18} /> AUTH_LEVEL_4
                           </div>
                        </div>
                     </div>

                     <div className="pt-10 flex items-center justify-between gap-6">
                        {user?.uid === selectedProject?.ownerId && (
                          <button 
                            onClick={() => handleDeleteProject()}
                            className="text-[10px] font-black text-rose-500 hover:text-rose-400 transition-colors uppercase tracking-[0.4em] font-mono italic"
                          >
                            Terminate_Workspace
                          </button>
                        )}
                        <div className="flex-1" />
                        <button 
                          onClick={() => { handleUpdateProject(); setShowSettingsModal(false); }}
                          className="h-14 px-14 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] font-mono hover:bg-brand-600 hover:shadow-2xl hover:shadow-brand-500/20 transition-all active:scale-95"
                        >
                           Commit_Changes
                        </button>
                     </div>
                  </div>
               </motion.div>
            </div>
          )}

           {showProjectModal && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProjectModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg p-14 relative z-[510] bg-white border border-slate-200/60 shadow-5xl rounded-[3rem]"
              >
                <div className="flex flex-col text-center space-y-6 mb-12">
                  <div className="w-20 h-20 bg-slate-950 text-white flex items-center justify-center rounded-[1.75rem] mx-auto shadow-2xl mb-4 group rotate-[-8deg] hover:rotate-0 transition-transform duration-700">
                     <FolderPlus size={32} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-950 tracking-tight uppercase italic leading-none">New_Deployment</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">Initialize collaborative matrix node.</p>
                </div>
                <div className="space-y-10">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono ml-1">Workspace_Callsign</label>
                     <input autoFocus placeholder="..." className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-8 text-xl text-center font-black text-slate-950 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-100 font-mono italic uppercase" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()} />
                  </div>
                  <div className="flex gap-4">
                    <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="flex-1 h-14 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] font-mono hover:bg-brand-600 shadow-xl disabled:opacity-30 transition-all">Execute_Init</button>
                    <button onClick={() => setShowProjectModal(false)} className="px-8 text-[10px] font-black text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-[0.3em] font-mono italic">Cancel</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {showEventModal && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEventModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg p-14 relative z-[610] bg-white border border-slate-200/60 shadow-5xl rounded-[3rem]"
              >
                <div className="space-y-6 mb-12 text-center">
                   <div className="w-16 h-16 bg-brand-500 text-white flex items-center justify-center rounded-2xl mx-auto mb-6 shadow-brand-500/20 shadow-2xl">
                      <Activity size={24} />
                   </div>
                   <h3 className="text-3xl font-black text-slate-950 tracking-tight uppercase italic leading-none">Register_Event</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">Manual override telemetry injection.</p>
                </div>
                <div className="space-y-10">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono ml-1">Event_Identifier</label>
                      <input autoFocus placeholder="..." className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-8 text-xl text-center font-black text-slate-950 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-100 font-mono italic uppercase" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()} />
                   </div>
                   <div className="flex gap-4">
                      <button onClick={handleCreateEvent} disabled={!newEventTitle.trim()} className="flex-1 h-14 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] font-mono hover:bg-brand-600 transition-all shadow-xl disabled:opacity-30">Commit_Log</button>
                      <button onClick={() => setShowEventModal(false)} className="px-8 text-[10px] font-black text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-[0.3em] font-mono italic">Cancel</button>
                   </div>
                </div>
              </motion.div>
            </div>
          )}

          {showInviteModal && (
            <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-lg p-14 relative z-[610] bg-white border border-slate-200/60 shadow-5xl rounded-[3.5rem]"
              >
                <div className="space-y-6 mb-12 text-center">
                   <div className="w-20 h-20 bg-slate-950 text-white flex items-center justify-center rounded-[2rem] mx-auto mb-8 shadow-2xl group rotate-6 hover:rotate-0 transition-transform duration-700">
                      <UserPlus size={32} />
                   </div>
                   <h3 className="text-3xl font-black text-slate-950 tracking-tight uppercase italic leading-none">Add_Operator</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">Expand matrix node member registry.</p>
                </div>
                <div className="space-y-10">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono ml-1">Identity_Endpoint_Email</label>
                      <input autoFocus placeholder="..." className="w-full h-16 bg-slate-50 border border-slate-100 rounded-2xl px-8 text-xl text-center font-black text-slate-950 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-100 font-mono italic" value={inviteUserEmail} onChange={(e) => setInviteUserEmail(e.target.value)} />
                   </div>
                   <div className="flex gap-4">
                      <button onClick={handleInviteMember} disabled={!inviteUserEmail.trim()} className="flex-1 h-14 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] font-mono hover:bg-brand-600 transition-all shadow-xl disabled:opacity-30">Grant_Access</button>
                      <button onClick={() => setShowInviteModal(false)} className="px-8 text-[10px] font-black text-slate-400 hover:text-slate-950 transition-colors uppercase tracking-[0.3em] font-mono italic">Resume</button>
                   </div>
                </div>
              </motion.div>
            </div>
          )}

          {showDocsModal && (
            <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDocsModal(false)} className="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative z-[710] bg-white border border-slate-200 shadow-6xl rounded-[3rem]"
              >
                <div className="px-14 py-12 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-brand-600 text-white flex items-center justify-center rounded-[1.5rem] shadow-2xl shadow-brand-500/20">
                      <Terminal size={28} />
                    </div>
                    <div>
                      <h3 className="text-4xl font-black text-slate-950 tracking-[-0.05em] uppercase italic leading-none">System_Core v4.2</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] font-mono mt-2">Internal_Reference_Protocol</p>
                    </div>
                  </div>
                  <button onClick={() => setShowDocsModal(false)} className="w-14 h-14 rounded-2xl hover:bg-white hover:shadow-xl transition-all flex items-center justify-center text-slate-400 hover:text-slate-950 border border-transparent hover:border-slate-100">
                    <X size={28} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-14 pb-20 space-y-16 custom-scrollbar bg-white">
                  <div className="prose prose-slate max-w-none space-y-16">
                    <section className="space-y-6">
                      <h4 className="text-2xl font-black text-slate-950 uppercase tracking-widest font-mono flex items-center gap-4 italic">
                        <div className="w-2 h-8 bg-brand-500/20" /> 0x01_Operational_Overview
                      </h4>
                      <p className="text-xl text-slate-500 leading-relaxed italic font-medium border-l-[6px] border-slate-50 pl-10">Zenith is an automated workspace orchestration layer. Every interaction is synchronized via telemetry relays to Firestore for real-time consistency across all connected elite personnel nodes.</p>
                    </section>

                    <section className="space-y-6">
                      <h4 className="text-2xl font-black text-slate-950 uppercase tracking-widest font-mono flex items-center gap-4 italic">
                        <div className="w-2 h-8 bg-brand-500/20" /> 0x02_Task_Matrix_Control
                      </h4>
                      <p className="text-xl text-slate-500 leading-relaxed italic font-medium border-l-[6px] border-slate-50 pl-10">Utilize the Task Matrix to manage node entries (issues). Drag and drop between columns for instant network-wide state transitions.</p>
                    </section>

                    <section className="space-y-8 p-12 bg-slate-950 rounded-[2.5rem] text-white">
                       <div className="flex items-center gap-4 text-brand-400 font-mono text-xs font-black uppercase tracking-[0.5em]">
                          <Activity size={14} className="animate-pulse" /> Live_Telemetry_Active
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
                          <div className="space-y-1">
                             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Uptime</div>
                             <div className="text-4xl font-black italic tracking-tighter">99.998<span className="text-brand-500">%</span></div>
                          </div>
                          <div className="space-y-1">
                             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Latency</div>
                             <div className="text-4xl font-black italic tracking-tighter">12<span className="text-brand-500">ms</span></div>
                          </div>
                          <div className="space-y-1">
                             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Security</div>
                             <div className="text-4xl font-black italic tracking-tighter text-emerald-400">PASS</div>
                          </div>
                          <div className="space-y-1">
                              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Status</div>
                              <div className="text-4xl font-black italic tracking-tighter text-indigo-400">READY</div>
                           </div>
                        </div>
                     </section>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
}

function StatsCard({ label, value, icon, trend }: { label: string; value: any; icon: any; trend?: string }) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="surface-precision p-6 flex flex-col justify-between h-[200px] group bg-white"
    >
      <div className="flex justify-between items-start relative z-10">
        <div className="w-10 h-10 bg-slate-950 text-white flex items-center justify-center rounded-xl shadow-lg group-hover:bg-brand-600 transition-all duration-500">
          {React.cloneElement(icon as React.ReactElement, { size: 20, strokeWidth: 1.5 })}
        </div>
        <div className="flex flex-col items-end">
          {trend && (
            <div className={cn(
              "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] border backdrop-blur-md mb-2 shadow-sm",
              trend === "ACTIVE" || trend === "SYNC" || trend === "SAFE" || trend === "STABLE" || trend === "ĐỒNG BỘ" ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" :
              trend === "WARNING" ? "bg-rose-50 text-rose-600 border-rose-100/50 animate-pulse" : "bg-slate-50 text-slate-400 border-slate-100/50"
            )}>
              {trend}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.3em] font-mono opacity-80 leading-none group-hover:text-brand-500 transition-colors">ACTIVE</span>
            <div className="w-1 h-1 rounded-full bg-brand-500 animate-ping" />
          </div>
        </div>
      </div>
      
      <div className="space-y-1 relative z-10 text-left">
         <div className="text-[8px] font-black text-slate-300 font-mono tracking-[0.3em] uppercase leading-none mb-2">NODE_REF::0x{Math.floor(Math.random() * 255).toString(16).toUpperCase()}</div>
         <div className="flex items-baseline gap-3">
           <span className="text-5xl font-heading font-black text-slate-950 tracking-[-0.05em] leading-none transition-all group-hover:text-brand-600 duration-1000">{value}</span>
           <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] font-mono opacity-40">MTRX</span>
         </div>
         <div className="text-[10px] font-black text-slate-950 uppercase tracking-[0.3em] font-mono mt-4 flex items-center gap-2 transition-all group-hover:translate-x-1">
            <div className="w-1.5 h-1.5 bg-slate-950 rounded-full group-hover:bg-brand-600 transition-colors" />
            {label}
         </div>
      </div>
    </motion.div>
  );
}

function QuickAction({ title, desc, icon, onClick }: { title: string; desc: string; icon: any; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="surface-precision p-6 flex flex-col justify-between h-[240px] group hover:border-brand-500/40 hover:shadow-2xl transition-all duration-700 bg-white relative overflow-hidden text-left"
    >
      <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="w-12 h-12 bg-slate-950 text-white flex items-center justify-center rounded-2xl shadow-xl group-hover:bg-brand-600 transition-all duration-500 relative z-10">
         {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: 1.5 })}
      </div>
      
      <div className="space-y-3 relative z-10">
        <div className="flex items-center gap-3 text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] font-mono mb-1 group-hover:text-brand-500 transition-colors">
           CMD::READY
        </div>
        <h3 className="text-2xl font-heading font-black text-slate-950 uppercase tracking-tighter leading-[1] transition-transform duration-700">{title}</h3>
        <p className="text-[12px] font-medium text-slate-500 leading-relaxed max-w-[200px] border-l-2 border-slate-100 pl-4 group-hover:border-brand-500 transition-all duration-700">{desc}</p>
      </div>
      
      <div className="flex items-center justify-end w-full relative z-10">
         <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl text-slate-400 group-hover:bg-slate-950 group-hover:text-white transition-all shadow-sm duration-500">
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-500" />
         </div>
      </div>
    </button>
  );
}
