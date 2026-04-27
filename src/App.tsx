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
  const [showEventModal, setShowEventModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [inviteUserEmail, setInviteUserEmail] = useState('');

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
        toast.error("Operator not found in registry.");
        return;
      }
      if (selectedProject.members.includes(targetUser.userId)) {
        toast.error("Operator already assigned to this node.");
        return;
      }

      const projectRef = doc(db, 'projects', selectedProject.id);
      const updatedMembers = [...selectedProject.members, targetUser.userId];
      await setDoc(projectRef, { members: updatedMembers }, { merge: true });
      
      toast.success(`Operator ${targetUser.displayName} deployed to node.`);
      setInviteUserEmail('');
      setShowInviteModal(false);
    } catch (e) {
      toast.error("Authorization check failed.");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!user || !selectedProject || memberId === selectedProject.ownerId) return;
    if (user.uid !== selectedProject.ownerId) {
      toast.error("Administrator authorization required.");
      return;
    }

    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      const updatedMembers = selectedProject.members.filter(id => id !== memberId);
      await setDoc(projectRef, { members: updatedMembers }, { merge: true });
      toast.success("Operator access revoked.");
    } catch (e) {
      toast.error("Operation failed.");
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
      toast.success("Welcome back");
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') return;
      toast.error("Authentication failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => auth.signOut();

  const [projectLogs, setProjectLogs] = useState<any[]>([]);

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
      toast.success("Workspace created");
    } catch (error) { toast.error("Failed to create workspace."); }
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
      toast.success("Operational event dispatched");
    } catch (e) { toast.error("Deployment failure"); }
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full shadow-2xl shadow-brand-500/10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Toaster position="top-right" richColors />
      
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full min-h-screen bg-[#FBFBFE]">
            <nav className="fixed top-0 left-0 right-0 h-20 flex items-center justify-between px-10 lg:px-20 z-[100] bg-white/80 backdrop-blur-3xl border-b border-slate-200/60">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-500 text-white flex items-center justify-center rounded-xl shadow-lg shadow-brand-500/20">
                     <Orbit size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-bold text-slate-900 tracking-widest uppercase font-mono">Linebase</span>
                     <span className="text-[9px] font-bold text-brand-500/50 uppercase tracking-[0.2em] font-mono">V2.0.4</span>
                  </div>
               </div>
               <div className="flex items-center gap-8">
                 <button onClick={() => handleLogin()} className="text-[11px] font-bold text-slate-500 hover:text-brand-600 transition-colors uppercase tracking-widest">Sign In</button>
                 <button onClick={() => handleLogin()} className="btn-precision h-11 px-8 rounded-full">
                    Get Started <ArrowRight size={14} />
                 </button>
               </div>
            </nav>

            <main className="pt-40 lg:pt-52 px-10 lg:px-20 max-w-7xl mx-auto flex flex-col technical-grid min-h-screen">
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
                 <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="lg:col-span-7 space-y-12 text-left">
                    <div className="inline-flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                      <span className="text-[11px] font-bold text-brand-400 uppercase tracking-[0.3em] font-mono">Autonomous_Workspace_Engine</span>
                    </div>
                    
                    <h1 className="text-7xl lg:text-[7.5rem] font-bold tracking-tighter text-slate-900 leading-[0.9] font-sans">
                      Command <br />
                      <span className="text-brand-500 italic">the Matrix.</span>
                    </h1>
                    
                    <p className="text-xl lg:text-2xl text-slate-500 max-w-xl font-medium leading-relaxed tracking-tight border-l-2 border-brand-500/20 pl-8">
                      Synchronize your source, tasks, and telemetry in a single, high-fidelity command center designed for high-velocity teams.
                    </p>

                    <div className="flex flex-wrap items-center gap-6 pt-6">
                       <button onClick={() => handleLogin()} className="btn-precision h-16 px-12 text-base rounded-full hover:scale-105 active:scale-95 transition-all">
                          Initialize Workspace
                       </button>
                       <button onClick={() => setShowDocsModal(true)} className="h-16 px-10 border border-slate-200 bg-white text-slate-900 text-[12px] font-bold uppercase tracking-[0.2em] hover:bg-slate-50 transition-all rounded-full flex items-center gap-3">
                          <Terminal size={16} /> Documentation
                       </button>
                    </div>
                 </motion.div>

                  <motion.div initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 1, delay: 0.2 }} className="lg:col-span-5 relative">
                    <div className="surface-precision p-1 bg-white/40 backdrop-blur-3xl border-slate-200">
                       <div className="bg-white rounded-[1.2rem] overflow-hidden aspect-[4/5] p-12 flex flex-col justify-between border border-slate-100">
                          <div className="space-y-4">
                             <div className="w-12 h-12 bg-brand-500 text-white flex items-center justify-center rounded-2xl shadow-2xl shadow-brand-500/20">
                                <Activity size={24} />
                             </div>
                             <h3 className="text-4xl font-bold text-slate-900 leading-tight tracking-tighter">System Metrics Live</h3>
                          </div>
                          <div className="space-y-8">
                             <div className="h-[4px] w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div animate={{ width: ["10%", "80%", "40%"] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="h-full bg-brand-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
                             </div>
                             <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                   <div className="micro-label opacity-40">Status: Active</div>
                                   <div className="text-slate-500 text-[10px] font-mono tracking-widest">RELAY_PROTOCOL_OK</div>
                                </div>
                                <div className="text-slate-900 text-7xl font-sans font-bold tracking-tighter italic">100<span className="text-2xl text-brand-500">%</span></div>
                             </div>
                          </div>
                       </div>
                    </div>

                 </motion.div>
               </div>

               <div className="mt-40 w-full grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { label: "Sync Latency", value: "0.04ms", desc: "Real-time protocol relay.", icon: Zap },
                    { label: "Node Health", value: "Optimal", desc: "Always-on telemetric pulse.", icon: Activity },
                    { label: "Matrix Parity", value: "Locked", desc: "Encrypted state-sync.", icon: ShieldCheck }
                  ].map((stat, i) => (
                    <div key={i} className="surface-precision p-10 space-y-6 hover:bg-slate-50 transition-all group">
                       <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-lg text-slate-500 group-hover:text-brand-500 transition-colors">
                          <stat.icon size={20} />
                       </div>
                       <div className="space-y-1">
                          <span className="micro-label text-slate-500">{stat.label}</span>
                          <div className="text-4xl font-bold text-slate-900 tracking-tighter">{stat.value}</div>
                       </div>
                       <p className="text-sm font-medium text-slate-500 leading-relaxed">{stat.desc}</p>
                    </div>
                  ))}
               </div>
            </main>
          </motion.div>
        ) : (
          <div className="flex-1 flex h-screen overflow-hidden bg-slate-50">
            {/* PRECISION SIDEBAR */}
            <aside className="w-56 h-full flex flex-col bg-white border-r border-slate-200 relative z-50">
               <div className="p-8 flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-900 text-white flex items-center justify-center shadow-lg">
                     <Code2 size={16} strokeWidth={3} />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-lg font-bold text-slate-900 tracking-tighter leading-none">Linebase</span>
                     <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em] font-mono">v.1.0.4</span>
                  </div>
               </div>

               <div className="flex-1 py-10 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                  <div className="px-5 mb-6 micro-label opacity-40">System Access</div>
                  {[
                    { id: 'dashboard', icon: LayoutGrid, label: 'Overview' },
                    { id: 'board', icon: FolderKanban, label: 'Task Matrix' },
                    { id: 'metrics', icon: PieChart, label: 'Telemetry' },
                    { id: 'members', icon: Users, label: 'Operators' },
                    { id: 'logs', icon: Activity, label: 'Audit Log' },
                  ].map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setActiveTab(item.id as any)}
                      className={cn(
                        "nav-link",
                        activeTab === item.id ? "nav-link-active" : "nav-link-inactive"
                      )}
                    >
                      <item.icon size={13} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                      <span className="tracking-[0.15em] uppercase text-[9px] font-bold font-mono">{item.label}</span>
                    </button>
                  ))}
               </div>

               <div className="p-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 p-2 group cursor-pointer transition-all">
                    <img className="w-7 h-7 rounded-sm grayscale group-hover:grayscale-0 transition-all border border-slate-200" src={user.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${user.uid}`} alt="" />
                    <div className="min-w-0 flex-1">
                       <div className="text-[10px] font-bold text-slate-700 group-hover:text-slate-900 truncate font-mono uppercase tracking-tighter transition-colors">{user.displayName}</div>
                       <button onClick={handleLogout} className="text-[8px] font-bold text-slate-400 uppercase tracking-widest hover:text-rose-600 transition-colors">Terminate Session</button>
                    </div>
                  </div>
               </div>
            </aside>

            <main className="flex-1 overflow-hidden flex flex-col technical-grid">
               {/* PRECISION HEADER */}
               <header className="h-14 px-10 flex items-center justify-between bg-white/40 backdrop-blur-md relative z-40 border-b border-slate-200">
                  <div className="flex items-center gap-8">
                    <div className="relative">
                      <button 
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="flex items-center gap-3 text-[11px] font-bold text-slate-500 hover:text-slate-900 transition-all group tracking-widest uppercase font-mono"
                      >
                         <span className="text-brand-600 opacity-50">Node:</span>
                         <span className="text-slate-900 border-b border-slate-200 pb-0.5">{selectedProject?.name || 'SYNCING...'}</span>
                         <ChevronDown size={12} className={cn("text-slate-400 transition-transform", showProjectDropdown && "rotate-180")} />
                      </button>
                      
                      <AnimatePresence>
                         {showProjectDropdown && (
                           <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-10 left-0 w-64 z-[110] bg-white border border-slate-200 shadow-2xl rounded-xl">
                             <div className="p-3 micro-label opacity-30 text-[8px]">Active_Matrix_Nodes</div>
                             <div className="p-1 space-y-0.5">
                               {projects.map(p => (
                                 <button key={p.id} onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); }} className={cn("w-full flex items-center justify-between px-4 py-2 text-[10px] font-mono font-bold tracking-widest uppercase transition-all rounded-lg", selectedProject?.id === p.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>
                                   {p.name}
                                   {selectedProject?.id === p.id && <Check size={10} />}
                                 </button>
                               ))}
                               <div className="h-px bg-slate-100 my-1" />
                               <button onClick={() => { setShowProjectModal(true); setShowProjectDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-[10px] text-brand-600 font-bold tracking-widest uppercase hover:bg-brand-50 rounded-lg">
                                 <Plus size={12} /> Init New Node
                               </button>
                             </div>
                           </motion.div>
                         )}
                      </AnimatePresence>
                    </div>

                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] font-mono">Status: Optimal</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button onClick={() => toast.info("Encryption relay active. Zero pending alerts.")} className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-white transition-all">
                       <Bell size={14} />
                    </button>
                    <button 
                      onClick={() => setShowSettingsModal(true)}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-white transition-all"
                    >
                       <Settings size={14} />
                    </button>
                    <div className="h-4 w-px bg-white/10" />
                    <button onClick={() => setShowProjectModal(true)} className="btn-precision h-8 px-4 text-[9px]">
                       <Plus size={12} /> New Operator
                    </button>
                  </div>
               </header>

               <div className="flex-1 overflow-auto custom-scrollbar p-10 lg:p-14">
                 <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                       <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-16 max-w-7xl">
                        <div className="flex items-end justify-between gap-8">
                           <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <div className="h-[1px] w-8 bg-brand-500/40" />
                                <span className="text-[9px] font-bold text-brand-500 uppercase tracking-[0.5em] font-mono">Platform_Command_Directives</span>
                              </div>
                              <h2 className="text-8xl font-sans font-bold tracking-tighter italic leading-none text-slate-900">
                                System Overview
                              </h2>
                              <p className="text-slate-500 font-mono text-[10px] tracking-wider uppercase">Protocol parity: synchronized</p>
                           </div>
                              <div className="flex items-center gap-3">
                                 <button onClick={() => setShowProjectModal(true)} className="btn-precision h-12 px-8">
                                    <Plus size={14} /> Initialize Node
                                 </button>
                                 <button onClick={() => setShowSettingsModal(true)} className="h-12 px-8 border border-slate-200 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">
                                    Parameters
                                 </button>
                              </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                           <StatsCard label="System Integrity" value={`${appStats.resolutionRate}%`} icon={<Cpu size={14} />} trend="PARITY" />
                           <StatsCard label="Active Nodes" value={appStats.open} icon={<Activity size={14} />} trend="PROCESSING" />
                           <StatsCard label="Critical Vectors" value={appStats.critical} icon={<Zap size={14} />} trend={appStats.critical > 3 ? "WARNING" : "STABLE"} />
                           <StatsCard label="Deployment Flux" value={appStats.activeEvents} icon={<Orbit size={14} />} trend="ACTIVE" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                           <div className="lg:col-span-2 surface-precision p-10">
                              <div className="flex items-center justify-between mb-12">
                                 <div className="space-y-1">
                                    <h3 className="text-xl font-bold tracking-tight text-slate-900">Active Operations</h3>
                                    <p className="micro-label opacity-40">Matrix node priority queue</p>
                                 </div>
                                 <button onClick={() => setShowEventModal(true)} className="btn-precision h-9 px-4 text-[10px]">
                                    <Plus size={14} /> Add Event
                                 </button>
                              </div>

                              <div className="space-y-px">
                                 {events.length === 0 ? (
                                    <div className="py-20 text-center border border-dashed border-slate-200 rounded">
                                       <div className="micro-label text-slate-400">Awaiting system events...</div>
                                    </div>
                                 ) : (
                                    events.map((event) => (
                                       <div 
                                          key={event.id} 
                                          className="flex items-center justify-between p-6 bg-white hover:bg-slate-50 border border-slate-100 transition-all group cursor-pointer"
                                       >
                                          <div className="flex items-center gap-6">
                                             <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                event.status === 'completed' ? "bg-brand-500" :
                                                event.status === 'in-progress' ? "bg-amber-500 animate-pulse" : "bg-slate-300"
                                             )} />
                                             <div>
                                                <h4 className="text-[14px] font-bold text-slate-900 tracking-widest uppercase font-mono group-hover:text-brand-600 transition-colors">{event.title}</h4>
                                                <div className="flex items-center gap-4 mt-2">
                                                   <span className="micro-label text-slate-400 border-r border-slate-200 pr-4">{event.type || 'PROTOCOL'}</span>
                                                   <span className="text-[10px] font-mono text-slate-400 italic opacity-60">ID: {event.id.slice(0, 8)}</span>
                                                </div>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-8">
                                             <div className="text-right hidden sm:block">
                                                <div className="text-[10px] font-bold text-slate-500 font-mono tracking-tighter uppercase">{event.time}</div>
                                                <div className="text-[9px] font-semibold text-slate-400 font-mono mt-1 uppercase">ESTIMATED COMPLETION</div>
                                             </div>
                                             <div className="flex items-center gap-2">
                                               <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'events', event.id)); }} className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100">
                                                  <Trash2 size={12} />
                                               </button>
                                               <div className="w-7 h-7 rounded bg-slate-900 text-white flex items-center justify-center">
                                                  <ChevronRight size={12} strokeWidth={3} />
                                               </div>
                                             </div>
                                          </div>
                                       </div>
                                    ))
                                 )}
                              </div>
                           </div>

                           <div className="surface-precision p-10 flex flex-col">
                              <div className="mb-12">
                                 <h3 className="text-xl font-bold tracking-tight text-slate-900">System Feed</h3>
                                 <p className="micro-label opacity-40 mt-1">Audit stream monitor</p>
                              </div>
                              <div className="flex-1 space-y-6">
                                 {projectLogs.slice(0, 6).map((log, i) => (
                                    <div key={log.id} className="flex gap-4 group">
                                       <div className="flex flex-col items-center">
                                          <div className="w-1.5 h-1.5 rounded-none bg-slate-200 group-hover:bg-brand-500 transition-colors" />
                                          {i !== projectLogs.slice(0, 6).length - 1 && <div className="w-[1px] flex-1 bg-slate-100 my-2" />}
                                       </div>
                                       <div className="space-y-1 pb-4">
                                          <div className="text-[10px] font-bold text-slate-400 tracking-widest font-mono uppercase italic underline underline-offset-4 decoration-slate-100 transition-colors group-hover:text-slate-900">Op_{log.action}</div>
                                          <p className="text-[11px] text-slate-600 font-medium leading-relaxed italic group-hover:text-slate-900 transition-colors">{log.details}</p>
                                          <div className="text-[8px] font-bold text-slate-400 font-mono uppercase tracking-[0.2em]">{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString() : '...'}</div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                              <button onClick={() => setActiveTab('logs')} className="w-full h-10 border border-slate-100 text-[9px] font-bold uppercase tracking-[0.3em] text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all mt-8">
                                 Full Audit Log
                              </button>
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
                           <h2 className="text-6xl font-bold tracking-tighter text-slate-900">System Performance</h2>
                           <p className="text-lg text-slate-500 font-medium tracking-tight max-w-2xl">High-fidelity visualization of system throughput and multi-channel protocol distribution.</p>
                        </div>
 
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 border border-slate-200">
                           <StatsCard label="Precision Yield" value={`${appStats.resolutionRate}%`} icon={<CheckCircle2 size={16} />} trend="SYNCED" />
                           <StatsCard label="Node Volume" value={appStats.total} icon={<Rocket size={16} />} trend="LINEAR" />
                           <StatsCard label="Operational Events" value={events.length} icon={<Globe size={16} />} trend="LOGGED" />
                        </div>
 
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                           <div className="card-smart h-[520px] flex flex-col bg-white border border-slate-200 p-12 rounded-3xl overflow-hidden shadow-sm">
                             <div className="flex items-center justify-between mb-12">
                                <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em] font-mono">Resolution Velocity</h3>
                                <div className="px-4 py-1.5 bg-slate-50 rounded-xl text-[9px] font-black text-brand-600 tracking-widest border border-slate-100">ALPHA-CHART</div>
                             </div>
                             <div className="flex-1 w-full translate-x-[-15px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={resolutionChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.03)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b', fontFamily: 'JetBrains Mono' }} dy={10} />
                                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '24px' }} />
                                    <Bar dataKey="value" fill="#8b5cf6" radius={[10, 10, 0, 0]} barSize={44} />
                                  </BarChart>
                                </ResponsiveContainer>
                             </div>
                           </div>
 
                           <div className="card-smart h-[520px] flex flex-col items-center p-12 bg-white border border-slate-200 rounded-3xl shadow-sm">
                             <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em] font-mono mb-10 self-start">Priority Distribution</h3>
                             <div className="flex-1 w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RePieChart>
                                    <Pie 
                                      data={[
                                        { name: 'Critical', value: bugs.filter(b => b.priority === 'critical').length },
                                        { name: 'High', value: bugs.filter(b => b.priority === 'high').length },
                                        { name: 'Medium', value: bugs.filter(b => b.priority === 'medium').length },
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
                               <h2 className="text-6xl font-bold tracking-tighter text-slate-900">System Operators</h2>
                               <p className="text-lg text-slate-500 font-medium tracking-tight max-w-xl">Comprehensive directory of authorized engine operators assigned to this matrix node.</p>
                            </div>
                            <button onClick={() => setShowInviteModal(true)} className="btn-precision h-12 px-8">
                               <UserPlus size={16} /> Add Member
                            </button>
                        </div>
  
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {userProfiles.map((profile) => (
                              <div key={profile.userId} className="surface-precision flex items-center justify-between group bg-white hover:bg-slate-50 p-8 transition-all duration-500 border-slate-200 hover:border-brand-500/20 relative overflow-hidden shadow-sm">
                                  <div className="flex items-center gap-8">
                                    <div className="relative">
                                      <img src={profile.photoURL || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.userId}`} alt="" className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm transition-all duration-500 group-hover:scale-105" />
                                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-xl">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                      </div>
                                    </div>
                                    <div className="min-w-0">
                                       <div className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-3 group-hover:text-brand-600 transition-colors">{profile.displayName}</div>
                                       <div className="flex items-center gap-4 py-2 px-4 bg-slate-50 rounded-xl w-fit border border-slate-100">
                                          <Mail size={14} className="text-slate-400" />
                                          <div className="text-[11px] font-black text-slate-400 truncate uppercase tracking-widest font-mono">{profile.email}</div>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end gap-10">
                                    <div className="px-4 py-1.5 bg-brand-50 text-brand-600 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-brand-200">
                                      {selectedProject?.ownerId === profile.userId ? 'Administrator' : 'Operator'}
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

                    {activeTab === 'board' && selectedProject && <KanbanBoard key={selectedProject.id} projectId={selectedProject.id} userId={user.uid} userProfiles={userProfiles} bugs={bugs} />}

                     {activeTab === 'logs' && (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-16 max-w-7xl">
                        <div className="space-y-4">
                           <div className="flex items-center gap-4">
                              <div className="h-0.5 w-12 bg-brand-500/30 rounded-full" />
                              <span className="text-[10px] font-black text-brand-600 uppercase tracking-[0.4em] font-mono">System Ledger Index</span>
                           </div>
                           <h2 className="text-6xl font-bold tracking-tighter text-slate-900">System Logs</h2>
                           <p className="text-lg text-slate-500 font-medium tracking-tight max-w-xl">Comprehensive history of system changes and network state transitions.</p>
                         </div>

                         <div className="surface-precision overflow-hidden bg-white border border-slate-200 shadow-sm">
                           <table className="w-full text-left">
                             <thead>
                               <tr className="bg-slate-50 border-b border-slate-100">
                                 <th className="px-8 py-6 micro-label text-slate-400">TIMESTAMP</th>
                                 <th className="px-8 py-6 micro-label text-slate-400">PROTOCOL</th>
                                 <th className="px-8 py-6 micro-label text-slate-400">OPERATOR</th>
                                 <th className="px-8 py-6 micro-label text-slate-400">AUDIT_DETAILS</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {projectLogs.length === 0 ? (
                                 <tr>
                                   <td colSpan={4} className="px-8 py-20 text-center micro-label text-slate-300">No activity recorded in current state_cycle</td>
                                 </tr>
                               ) : projectLogs.map((log) => (
                                 <tr key={log.id} className="hover:bg-slate-50 transition-colors group/row">
                                   <td className="px-8 py-6 font-mono text-[11px] text-slate-400">{log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleString() : 'PENDING...'}</td>
                                   <td className="px-8 py-6">
                                     <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-mono font-bold text-slate-500 group-hover/row:bg-brand-500 group-hover/row:text-white transition-all">{log.action?.toUpperCase() || 'MOD'}</span>
                                   </td>
                                   <td className="px-8 py-6">
                                      <div className="flex items-center gap-3">
                                         <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center text-[10px] font-mono border border-slate-200 italic text-slate-400">
                                            {userProfiles.find(u => u.userId === log.userId)?.displayName?.slice(0, 2).toUpperCase() || 'SY'}
                                         </div>
                                         <span className="font-bold text-slate-900 text-[13px] italic font-serif ">{userProfiles.find(u => u.userId === log.userId)?.displayName || 'SYSTEM_DAEMON'}</span>
                                      </div>
                                   </td>
                                   <td className="px-8 py-6 text-slate-500 font-medium text-[13px] max-w-md italic">{log.details}</td>
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
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettingsModal(false)} className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" />
             <div className="surface-precision w-full max-w-2xl relative z-[510] overflow-hidden bg-white border-slate-200">
                <div className="px-12 py-10 flex items-center justify-between border-b border-slate-100">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-500 text-white flex items-center justify-center rounded shadow-xl">
                         <Settings size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight">Project Settings</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Workspace configuration</p>
                      </div>
                   </div>
                   <button onClick={() => setShowSettingsModal(false)} className="w-10 h-10 rounded hover:bg-slate-100 transition-all flex items-center justify-center text-slate-500 hover:text-slate-900">
                      <X size={20} />
                   </button>
                </div>
                <div className="p-12 space-y-12">
                   <div className="space-y-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Workspace Name</label>
                      <input 
                        className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-6 text-xl font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-300 font-mono"
                        value={selectedProject?.name} 
                        onChange={(e) => setSelectedProject(selectedProject ? {...selectedProject, name: e.target.value} : null)} 
                        disabled={user.uid !== selectedProject?.ownerId}
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      <div className="p-6 space-y-2 bg-slate-50 border border-slate-100 rounded">
                         <span className="micro-label opacity-40 text-[9px]">ENCRYPTION_PROTOCOL</span>
                         <div className="text-sm font-bold text-slate-700 italic font-mono uppercase">AES-256-GCM</div>
                      </div>
                      <div className="p-6 space-y-2 bg-slate-50 border border-slate-100 rounded">
                         <span className="micro-label opacity-40 text-[9px]">SECURITY_VECTOR</span>
                         <div className="text-sm font-bold text-emerald-600 italic font-mono flex items-center gap-2">
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
                          Delete Workspace
                        </button>
                      )}
                      <div className="flex-1" />
                      <button 
                        onClick={() => { handleUpdateProject(); setShowSettingsModal(false); }}
                        className="btn-precision h-12 px-12"
                      >
                         Save Changes
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

         {showProjectModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowProjectModal(false)} className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" />
            <div className="surface-precision w-full max-w-lg p-12 relative z-[210] bg-white border-slate-200">
              <div className="flex flex-col text-center space-y-4 mb-10">
                <div className="w-16 h-16 bg-brand-500 text-white flex items-center justify-center rounded mx-auto shadow-2xl mb-4">
                   <FolderPlus size={24} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Create Workspace</h3>
                <p className="text-slate-500 font-medium text-sm">Define the name for your new collaborative matrix node.</p>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Workspace Name</label>
                  <input autoFocus placeholder="e.g. PROJECT_OVERDRIVE" className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-6 text-lg text-center font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-200 font-mono" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()} />
                </div>
                <div className="flex gap-4">
                  <button onClick={handleCreateProject} disabled={!newProjectName.trim()} className="flex-1 btn-precision h-12 disabled:opacity-50">Create Workspace</button>
                  <button onClick={() => setShowProjectModal(false)} className="px-6 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEventModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEventModal(false)} className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" />
            <div className="surface-precision w-full max-w-lg p-12 relative z-[610] bg-white border-slate-200">
              <div className="space-y-4 mb-10 text-center">
                 <div className="w-12 h-12 bg-brand-500 text-white flex items-center justify-center rounded-none mx-auto mb-6">
                    <Activity size={20} />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Event</h3>
                 <p className="micro-label opacity-40">Matrix level authorization required for manual override.</p>
              </div>
              <div className="space-y-8">
                 <div className="space-y-4">
                    <label className="micro-label ml-2">Event_Designation</label>
                    <input autoFocus placeholder="OP_NAME_..." className="w-full h-14 bg-slate-50 border border-slate-200 rounded-none px-6 text-lg text-center font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-200 font-mono" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()} />
                 </div>
                 <div className="flex gap-4">
                    <button onClick={handleCreateEvent} disabled={!newEventTitle.trim()} className="flex-1 btn-precision h-12 disabled:opacity-50">Execute Dispatch</button>
                    <button onClick={() => setShowEventModal(false)} className="micro-label px-6 text-slate-500 hover:text-slate-900 transition-colors">Cancel</button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {showInviteModal && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInviteModal(false)} className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" />
            <div className="surface-precision w-full max-w-lg p-12 relative z-[610] bg-white border-slate-200">
              <div className="space-y-4 mb-10 text-center">
                 <div className="w-12 h-12 bg-brand-500 text-white flex items-center justify-center rounded-2xl mx-auto mb-6">
                    <UserPlus size={20} />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Add Operator</h3>
                 <p className="micro-label opacity-40">Expand the matrix node membership registry.</p>
              </div>
              <div className="space-y-8">
                 <div className="space-y-4">
                    <label className="micro-label ml-2">Registry Email</label>
                    <input autoFocus placeholder="operator@linebase.sys" className="w-full h-14 bg-slate-50 border border-slate-200 rounded-xl px-6 text-lg text-center font-bold text-slate-900 outline-none focus:bg-white focus:border-brand-500 transition-all placeholder:text-slate-200 font-mono" value={inviteUserEmail} onChange={(e) => setInviteUserEmail(e.target.value)} />
                 </div>
                 <div className="flex gap-4">
                    <button onClick={handleInviteMember} disabled={!inviteUserEmail.trim()} className="flex-1 btn-precision h-12 disabled:opacity-50">Assign Operator</button>
                    <button onClick={() => setShowInviteModal(false)} className="micro-label px-6 text-slate-500 hover:text-slate-900 transition-colors">Terminate</button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {showDocsModal && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDocsModal(false)} className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" />
            <div className="surface-precision w-full max-w-3xl max-h-[80vh] overflow-y-auto p-12 relative z-[710] bg-white border-slate-200 custom-scrollbar">
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-brand-500 text-white flex items-center justify-center rounded-xl">
                    <Terminal size={20} />
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 tracking-tighter italic">System_Core v2</h3>
                </div>
                <button onClick={() => setShowDocsModal(false)} className="w-10 h-10 rounded hover:bg-slate-100 transition-all flex items-center justify-center text-slate-400">
                  <X size={24} />
                </button>
              </div>
              
              <div className="prose prose-slate max-w-none space-y-10">
                <section className="space-y-4">
                  <h4 className="text-xl font-bold text-slate-900 uppercase tracking-widest font-mono flex items-center gap-3">
                    <div className="w-1 h-1 bg-brand-500" /> 0x01_Overview
                  </h4>
                  <p className="text-slate-500 leading-relaxed italic">Linebase is an autonomous workspace engine. Every interaction is synchronized via telemetric relays to Firestore for real-time parity across all connected operators.</p>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xl font-bold text-slate-900 uppercase tracking-widest font-mono flex items-center gap-3">
                    <div className="w-1 h-1 bg-brand-500" /> 0x02_Task_Matrix
                  </h4>
                  <p className="text-slate-500 leading-relaxed italic">Use the Task Matrix to manage nodes (issues). Drag and drop between columns to update protocol status. Clicking an entry allows for deep state manipulation including priority shifts and assignee deployment.</p>
                </section>

                <section className="space-y-4">
                  <h4 className="text-xl font-bold text-slate-900 uppercase tracking-widest font-mono flex items-center gap-3">
                    <div className="w-1 h-1 bg-brand-500" /> 0x03_Security
                  </h4>
                  <p className="text-slate-500 leading-relaxed italic">All data is hardened with AES-256 equivalent security rules. Members must be explicitly assigned to project nodes to gain read/write authority.</p>
                </section>

                <div className="pt-10 flex justify-center">
                  <button onClick={() => setShowDocsModal(false)} className="btn-precision h-12 px-12">Acknowledge_Directives</button>
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
    <div className="surface-precision p-8 h-48 flex flex-col justify-between group relative overflow-hidden bg-white transition-all hover:bg-slate-50">
      <div className="flex items-center justify-between relative z-10">
        <div className="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-2xl text-slate-400 group-hover:text-brand-600 transition-all border border-slate-100 shadow-inner">
          {icon}
        </div>
        {trend && (
          <div className="px-3 py-1 bg-brand-50 text-brand-600 text-[10px] font-bold rounded-full tracking-wider uppercase border border-brand-100">
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1 relative z-10 mt-auto">
        <div className="micro-label opacity-40 text-[10px] mb-2">{label}</div>
        <div className="text-4xl font-bold tracking-tighter leading-none text-slate-900">
          {value}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ title, desc, icon, onClick }: { title: string, desc: string, icon: any, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="surface-precision p-10 flex flex-col text-left group bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-500"
    >
      <div className="w-14 h-14 bg-brand-500/10 text-brand-500 flex items-center justify-center rounded-2xl mb-8 group-hover:bg-brand-500 group-hover:text-white transition-all duration-500">
        {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: 2.5 })}
      </div>
      <h3 className="text-xl font-bold mb-3 tracking-tight text-slate-900 group-hover:text-brand-600 transition-all">{title}</h3>
      <p className="text-sm font-medium text-slate-500 leading-relaxed">{desc}</p>
    </button>
  );
}
