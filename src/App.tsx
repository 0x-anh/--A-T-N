import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from 'react-i18next';
import { Toaster, toast } from 'sonner';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { useProjectData } from './hooks/useProjectData';

// Layout Components
import MainLayout from './components/layout/MainLayout';
import MatrixBackground from './components/layout/MatrixBackground';

// Pages
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import LogsPage from './pages/LogsPage';
import MetricsPage from './pages/MetricsPage';
import MembersPage from './pages/MembersPage';
import KanbanBoard from './components/KanbanBoard';

// Modals
import ProjectModal from './components/modals/ProjectModal';
import InviteModal from './components/modals/InviteModal';
import SettingsModal from './components/modals/SettingsModal';
import DocsModal from './components/modals/DocsModal';
import QuickAddModal from './components/kanban/QuickAddModal';

import { db } from './lib/firebase';
import type { BugPriority } from './types';
import { addDoc, collection, serverTimestamp, doc, setDoc, deleteDoc, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { handleFirestoreError } from './lib/firebase';

export default function App() {
  const { t } = useTranslation();
  const { user, loading, userProfiles, isAdmin, handleLogin, handleLogout } = useAuth();
  const { 
    projects, selectedProject, setSelectedProject, 
    pendingInvitations, sentInvitations,
    handleInviteMember: inviteMemberLogic, 
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleRemoveMember,
    handleUpdateUserRoles
  } = useProjects(user?.uid, userProfiles);
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'board' | 'metrics' | 'logs' | 'members' | 'dashboard'>('dashboard');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUserEmail, setInviteUserEmail] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddPriority, setQuickAddPriority] = useState<BugPriority>('low');
  const [quickAddDueDate, setQuickAddDueDate] = useState('');

  const { bugs, events, overdueTasks, urgentTasks, appStats } = useProjectData(user, selectedProject, userProfiles, currentTime, projects);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !user) return;
    try {
      await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        description: t('projects.default_description'),
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        members: [user.uid]
      });
      setNewProjectName('');
      setShowProjectModal(false);
      toast.success(t('toasts.project_created'));
    } catch (error) { toast.error(t('toasts.project_create_failed')); }
  };

  const handleInviteMember = async () => {
    const success = await inviteMemberLogic(inviteUserEmail);
    if (success) {
      setInviteUserEmail('');
      setShowInviteModal(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!user || !selectedProject || !selectedProject.name.trim()) return;
    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      await setDoc(projectRef, { name: selectedProject.name }, { merge: true });
      toast.success(t('toasts.project_updated'));
    } catch (error) { handleFirestoreError(error, 'update', 'projects'); }
  };

  const handleDeleteProject = async (projectToDelete: any) => {
    if (!user || !projectToDelete) return;
    const projectId = projectToDelete.id;
    const projectName = projectToDelete.name;

    const deleteTimeout = setTimeout(() => {
      (async () => {
        try {
          // 1. Dọn dẹp dữ liệu liên quan (Bugs & Logs)
          const bugsRef = collection(db, 'bugs');
          const logsRef = collection(db, 'activity_logs');
          
          const [bugsSnapshot, logsSnapshot] = await Promise.all([
            getDocs(query(bugsRef, where('projectId', '==', projectId))),
            getDocs(query(logsRef, where('projectId', '==', projectId)))
          ]);

          const batch = writeBatch(db);
          bugsSnapshot.forEach(doc => batch.delete(doc.ref));
          logsSnapshot.forEach(doc => batch.delete(doc.ref));
          
          // 2. Xóa dự án chính
          batch.delete(doc(db, 'projects', projectId));
          
          await batch.commit();
          
          toast.success(t('toasts.project_deleted', { name: projectName }));
          if (selectedProject?.id === projectId) {
            setSelectedProject(null);
            setActiveTab('dashboard');
          }
        } catch (error) { 
          console.error("Cleanup error:", error);
          toast.error(t('toasts.project_delete_failed'));
        }
        delete (window as any)[`timeout_project_${projectId}`];
      })();
    }, 5000);

    (window as any)[`timeout_project_${projectId}`] = deleteTimeout;

    toast(t('toasts.project_deleting', { name: projectName }), {
      duration: 5000,
      action: {
        label: t('common.undo'),
        onClick: () => {
          const tId = (window as any)[`timeout_project_${projectId}`];
          if (tId) {
            clearTimeout(tId);
            delete (window as any)[`timeout_project_${projectId}`];
            toast.info(t('toasts.project_restored', { name: projectName }));
          }
        }
      }
    });
  };

  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim() || !user) return;
    if (!selectedProject) {
      toast.error(t('toasts.quick_add_no_project'));
      return;
    }
    
    let docId = '';
    try {
      const docRef = await addDoc(collection(db, 'bugs'), {
        projectId: selectedProject.id,
        title: quickAddTitle.trim(),
        description: t('kanban.quick_add_description'),
        status: 'backlog',
        priority: quickAddPriority,
        creatorId: user.uid,
        ownerId: user.uid,
        members: [user.uid],
        dueDate: quickAddDueDate || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      docId = docRef.id;
      
      setQuickAddTitle('');
      setQuickAddDueDate('');
      setShowQuickAdd(false);
      toast.success(t('toasts.task_deployed'));
    } catch (e: any) { 
      handleFirestoreError(e, 'create', 'bugs');
      toast.error(t('toasts.task_failed', { code: e.code }));
      return;
    }

    try {
      const logMessage = t('logs.task_deployed_log', { title: quickAddTitle.trim() });
      await addDoc(collection(db, 'activity_logs'), {
        projectId: selectedProject.id,
        bugId: docId,
        action: 'BUG_CREATED',
        details: logMessage,
        userId: user.uid,
        userName: user.displayName || t('logs.system_user'),
        userPhoto: user.photoURL || '',
        createdAt: serverTimestamp()
      });
    } catch (e: any) { 
      console.warn("Log error:", e.message);
    }
  };

  // Expose modal trigger for sub-components
  useEffect(() => {
    (window as any).triggerProjectModal = () => setShowProjectModal(true);
    return () => { delete (window as any).triggerProjectModal; };
  }, []);

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
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] animate-pulse">{t('app.initializing')}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500/30 relative">
      <MatrixBackground />
      
      {!user ? (
        <LoginPage handleLogin={handleLogin} onShowDocs={() => setShowDocsModal(true)} />
      ) : (
        <MainLayout
          key={user.uid}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          handleLogout={handleLogout}
          selectedProject={selectedProject}
          projects={projects}
          setSelectedProject={setSelectedProject}
          setShowProjectModal={setShowProjectModal}
          setShowInviteModal={setShowInviteModal}
          setShowSettingsModal={setShowSettingsModal}
          handleDeleteProject={handleDeleteProject}
          isAdmin={isAdmin}
        >
          {activeTab === 'dashboard' && (
            <DashboardPage 
              appStats={appStats}
              currentTime={currentTime}
              bugs={bugs}
              events={events}
              overdueTasks={overdueTasks}
              userProfiles={userProfiles}
              projects={projects}
              pendingInvitations={pendingInvitations}
              handleAcceptInvitation={handleAcceptInvitation}
              handleDeclineInvitation={handleDeclineInvitation}
              setActiveTab={setActiveTab}
              setShowProjectModal={setShowProjectModal}
              setShowInviteModal={setShowInviteModal}
              setShowQuickAdd={setShowQuickAdd}
            />
          )}

          {activeTab === 'board' && (
             <KanbanBoard 
                selectedProject={selectedProject}
                userId={user.uid}
                userProfiles={userProfiles}
                bugs={bugs}
                isAdmin={isAdmin}
                setShowQuickAdd={setShowQuickAdd}
                currentTime={currentTime}
                handleUpdateUserRoles={handleUpdateUserRoles}
                handleRemoveMember={handleRemoveMember}
             />
          )}

          {activeTab === 'metrics' && (
            <MetricsPage 
              bugs={bugs} 
              projects={projects}
              selectedProject={selectedProject}
              appStats={appStats} 
              setActiveTab={setActiveTab} 
            />
          )}

          {activeTab === 'logs' && (
            <LogsPage 
              selectedProject={selectedProject}
              projects={projects}
              userId={user?.uid || ''}
              userProfiles={userProfiles}
            />
          )}

          {activeTab === 'members' && (
            <MembersPage 
              userProfiles={userProfiles}
              selectedProject={selectedProject}
              isAdmin={isAdmin}
              isOwner={selectedProject?.ownerId === user?.uid}
              userId={user?.uid || ''}
              setShowInviteModal={setShowInviteModal}
              handleRemoveMember={handleRemoveMember}
              handleUpdateUserRoles={handleUpdateUserRoles}
              sentInvitations={sentInvitations}
            />
          )}
        </MainLayout>
      )}

      {/* Global Modals */}
      <ProjectModal 
        show={showProjectModal} 
        onClose={() => setShowProjectModal(false)}
        newProjectName={newProjectName}
        setNewProjectName={setNewProjectName}
        handleCreateProject={handleCreateProject}
      />

      <InviteModal 
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        inviteUserEmail={inviteUserEmail}
        setInviteUserEmail={setInviteUserEmail}
        handleInviteMember={handleInviteMember}
      />

      {user && (
        <SettingsModal 
          show={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          selectedProject={selectedProject}
          setSelectedProject={setSelectedProject}
          user={user}
          handleUpdateProject={handleUpdateProject}
          handleDeleteProject={() => handleDeleteProject(selectedProject)}
        />
      )}

      <DocsModal 
        show={showDocsModal}
        onClose={() => setShowDocsModal(false)}
      />

      <QuickAddModal 
        show={showQuickAdd} 
        onClose={() => setShowQuickAdd(false)}
        title={quickAddTitle}
        setTitle={setQuickAddTitle}
        priority={quickAddPriority}
        setPriority={setQuickAddPriority}
        dueDate={quickAddDueDate}
        setDueDate={setQuickAddDueDate}
        onSubmit={handleQuickAdd}
      />

      <Toaster position="top-right" />
    </div>
  );
}
