/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Code2, Rocket, Layout, LayoutGrid, FolderKanban, PieChart, Zap, LogIn, LogOut, ShieldAlert, Bug, Activity, Cpu, Globe, Database, Terminal, FolderPlus, ChevronDown, Users, Bell, Search, Plus, Filter, MessageSquare, History, Settings } from "lucide-react";
import { auth, db, handleFirestoreError, testConnection } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc, addDoc, serverTimestamp, where, orderBy, getDocFromServer, limit } from 'firebase/firestore';
import KanbanBoard from './components/KanbanBoard';
import { cn } from './lib/utils';
import { Project, UserProfile } from './types';

import { Toaster, toast } from 'sonner';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'board' | 'metrics' | 'logs'>('board');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Sync user profile
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

  // Listen for projects
  useEffect(() => {
    if (!user) {
      setProjects([]);
      setSelectedProject(null);
      return;
    }
    // Secure query: Only projects where user is owner or member
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

  // Listen for all users
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUserProfiles(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => {
      console.warn("Limited user profile access:", error.message);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Lỗi đăng nhập:", error);
    }
  };

  const handleLogout = () => auth.signOut();

  const [projectLogs, setProjectLogs] = useState<any[]>([]);

  // Listen for project logs
  useEffect(() => {
    if (!user || !selectedProject || activeTab !== 'logs') return;
    const q = query(
      collection(db, 'activity_logs'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjectLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user, selectedProject, activeTab]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return;
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        description: 'Industrial Bug Tracking Space',
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        members: [user.uid]
      });
      toast.success(`SYSTEM_INIT: Project '${newProjectName}' deployed.`, {
        description: `Ref: ${docRef.id}`,
      });
      setNewProjectName('');
      setShowProjectModal(false);
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error("DEPLOYMENT_FAILED: Error initializing project node.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-sans text-slate-300">
        <div className="mb-8">
          <Bug size={48} className="text-indigo-500 animate-pulse" />
        </div>
        <div className="w-48 h-1 bg-slate-900 relative overflow-hidden rounded-full font-mono">
          <motion.div 
            className="absolute top-0 left-0 h-full bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.5)]"
            initial={{ width: 0 }} animate={{ width: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mt-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">Initializing System...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen saas-bg text-slate-300 font-sans selection:bg-indigo-500/30 selection:text-white flex flex-col">
      <Toaster position="top-center" richColors theme="dark" />
      
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="w-full min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
          >
            {/* Background Spotlights */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm relative z-10"
            >
              <div className="saas-card rounded-2xl p-10 flex flex-col items-center border border-white/5 shadow-2xl">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/20 group">
                  <Bug size={28} className="text-white group-hover:scale-110 transition-transform" />
                </div>
                
                <div className="text-center mb-10">
                  <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Nebula</h1>
                  <p className="text-slate-500 text-sm font-medium">Next-gen issue tracking for modern teams</p>
                </div>

                <button 
                  onClick={handleLogin}
                  className="w-full h-12 bg-white text-slate-950 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
                  Continue with Google
                </button>

                <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em]">
                  <div className="w-8 h-[1px] bg-slate-800" />
                  Enterprise Ready
                  <div className="w-8 h-[1px] bg-slate-800" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="saas-header h-14 px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center shadow-lg shadow-indigo-500/10">
                  <Bug size={16} className="text-white" />
                </div>
                <span className="text-md font-bold text-white tracking-tight">Nebula</span>
                <div className="h-4 w-[1px] bg-slate-800 mx-2" />
                <button 
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-slate-900 transition-all group"
                >
                  <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 truncate max-w-[150px]">
                    {selectedProject?.name || 'All Projects'}
                  </span>
                  <ChevronDown size={14} className={cn("text-slate-600 group-hover:text-slate-400 transition-transform", showProjectDropdown && "rotate-180")} />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/50 border border-slate-800/50">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user.displayName}</span>
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-lg border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-900 transition-all"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </header>

            <main className="flex-1 flex overflow-hidden">
              {/* Sidebar Navigation */}
              <nav className="w-16 lg:w-56 saas-sidebar flex flex-col p-3 gap-1 overflow-y-auto">
                <NavButton icon={LayoutGrid} label="Overview" active={activeTab === 'board'} onClick={() => setActiveTab('board')} />
                <NavButton icon={Activity} label="Activity" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
                <NavButton icon={PieChart} label="Analytics" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} />
                <div className="my-2 border-t border-slate-800/50" />
                <NavButton icon={FolderKanban} label="Workspaces" active={false} onClick={() => setShowProjectDropdown(true)} />
                
                <div className="mt-auto pt-4">
                  <button 
                    onClick={() => setShowProjectModal(true)}
                    className="w-full h-10 rounded-lg bg-indigo-600/10 text-indigo-400 text-xs font-bold hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-2 border border-indigo-500/20"
                  >
                    <Plus size={16} />
                    <span className="hidden lg:inline">New Workspace</span>
                  </button>
                </div>
              </nav>

              <div className="flex-1 flex flex-col min-w-0 bg-[#020617] relative">
                <div className="absolute inset-0 subtle-grid opacity-30 pointer-events-none" />
                
                <AnimatePresence mode="wait">
                  {!selectedProject ? (
                    <motion.div 
                      key="empty"
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="flex-1 flex flex-col items-center justify-center p-12 text-center relative z-10"
                    >
                      <div className="w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center mb-6">
                        <FolderKanban size={32} className="text-slate-600" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Welcome to Nebula</h3>
                      <p className="text-slate-500 text-sm max-w-xs mb-8">Select or create a workspace to begin tracking your issues and project health.</p>
                      <button 
                        onClick={() => setShowProjectModal(true)}
                        className="h-10 px-6 bg-white text-slate-950 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Get Started
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key={selectedProject.id + activeTab}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex-1 overflow-hidden relative z-10"
                    >
                      {activeTab === 'board' ? (
                        <KanbanBoard projectId={selectedProject.id} userProfiles={userProfiles} />
                      ) : activeTab === 'logs' ? (
                        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                           <div className="flex justify-between items-center mb-8">
                             <div>
                               <h2 className="text-xl font-bold text-white tracking-tight">Audit Trail</h2>
                               <p className="text-xs text-slate-500 mt-1">Detailed history of all actions in {selectedProject.name}</p>
                             </div>
                           </div>
                           <div className="saas-card rounded-xl border border-slate-800/60 overflow-hidden">
                             <table className="w-full text-left border-collapse">
                               <thead>
                                 <tr className="bg-slate-900/50 border-b border-slate-800/80">
                                   <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">User</th>
                                   <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operation</th>
                                   <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metadata</th>
                                   <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Time</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-800/40">
                                 {projectLogs.map(log => (
                                   <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                                     <td className="px-5 py-3.5">
                                       <div className="flex items-center gap-3">
                                         <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                                           {log.userName?.charAt(0)}
                                         </div>
                                         <span className="text-xs font-semibold text-slate-300">{log.userName}</span>
                                       </div>
                                     </td>
                                     <td className="px-5 py-3.5">
                                       <span className={cn(
                                         "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
                                         log.action === 'CREATE' ? "bg-emerald-500/10 text-emerald-500" :
                                         log.action === 'STATUS_CHANGE' ? "bg-indigo-500/10 text-indigo-500" :
                                         "bg-slate-800 text-slate-500"
                                       )}>
                                         {log.action}
                                       </span>
                                     </td>
                                     <td className="px-5 py-3.5 text-xs text-slate-400 leading-relaxed max-w-md truncate">{log.details}</td>
                                     <td className="px-5 py-3.5 text-[10px] font-mono text-slate-600 text-right">
                                       {log.createdAt?.toDate ? new Date(log.createdAt.toDate()).toLocaleTimeString() : 'now'}
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                        </div>
                      ) : (
                        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                          <h2 className="text-xl font-bold text-white tracking-tight mb-8">Performance Analytics</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {[
                               { label: 'Issue Velocity', value: '4.2d', change: '-15%', desc: 'Avg. resolution time' },
                               { label: 'System Health', value: '99.9%', change: 'Stable', desc: 'SLA Uptime' },
                               { label: 'Team Capacity', value: '82%', change: '+5%', desc: 'Total utilization' },
                               { label: 'Total Resolved', value: '1,280', change: '+240', desc: 'Resolved this quarter' },
                            ].map((stat, i) => (
                              <div key={i} className="saas-card p-5 rounded-xl border border-slate-800/60">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="text-2xl font-bold text-white">{stat.value}</span>
                                  <span className="text-[10px] font-bold text-emerald-500">{stat.change}</span>
                                </div>
                                <p className="text-[10px] text-slate-600">{stat.desc}</p>
                              </div>
                            ))}
                          </div>
                          <div className="saas-card rounded-xl border border-slate-800/60 p-8 flex flex-col items-center justify-center text-center">
                            <PieChart size={48} className="text-slate-800 mb-4" />
                            <p className="text-sm font-semibold text-slate-400">Detailed visualization engine is initializing...</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dropdown Backdrop */}
                <AnimatePresence>
                  {showProjectDropdown && (
                    <div className="fixed inset-0 z-50">
                      <div className="absolute inset-0 bg-transparent" onClick={() => setShowProjectDropdown(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                        className="absolute top-14 left-6 w-72 saas-surface border border-slate-800 p-2 rounded-xl shadow-2xl z-[100]"
                      >
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                           <div className="p-2 mb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Your Workspaces</div>
                           {projects.map(p => (
                             <button 
                               key={p.id}
                               onClick={() => { setSelectedProject(p); setShowProjectDropdown(false); }}
                               className={cn(
                                 "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                 selectedProject?.id === p.id ? "bg-indigo-500/10 text-indigo-400" : "text-slate-400 hover:bg-slate-900 hover:text-white"
                               )}
                             >
                               {p.name}
                               {selectedProject?.id === p.id && <Zap size={12} className="text-indigo-500" />}
                             </button>
                           ))}
                        </div>
                        <div className="my-1 border-t border-slate-800" />
                        <button 
                          onClick={() => { setShowProjectModal(true); setShowProjectDropdown(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold text-indigo-400 hover:bg-indigo-500/10 transition-all"
                        >
                          <Plus size={14} /> New Project
                        </button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </main>
          </div>
        )}
      </AnimatePresence>

      {/* Project Creation Modal */}
      <AnimatePresence>
        {showProjectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProjectModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md saas-surface border border-slate-800 p-8 rounded-2xl shadow-2xl z-10 overflow-hidden"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-indigo-600/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
                  <FolderPlus size={20} className="text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">Create Workspace</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">Workspace Name</label>
                  <input 
                    autoFocus type="text" value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="E.g. Engineering Cloud"
                    className="w-full h-11 bg-slate-950 border border-slate-800 rounded-lg px-4 text-white text-sm font-semibold focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-700"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowProjectModal(false)} className="flex-1 h-10 rounded-lg text-slate-400 text-xs font-bold hover:text-white transition-all">
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreateProject} disabled={!newProjectName.trim()}
                    className="flex-1 h-10 bg-white text-slate-950 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-30"
                  >
                    Add Workspace
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group",
        active ? "bg-indigo-500/10 text-indigo-100 border border-indigo-500/10 shadow-sm" : "text-slate-400 hover:bg-slate-900/60 hover:text-white"
      )}
    >
      <Icon size={18} className={cn("transition-transform group-hover:scale-105", active ? "text-indigo-400" : "text-slate-500")} />
      <span className="text-sm font-semibold tracking-tight">{label}</span>
      {active && <div className="ml-auto w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
    </button>
  );
}
