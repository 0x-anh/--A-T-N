import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileNav from './MobileNav';
import { Project } from '../../types';

interface MainLayoutProps {
  children?: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  user: any;
  handleLogout: () => void;
  selectedProject: Project | null;
  projects: Project[];
  setSelectedProject: (project: Project | null) => void;
  setShowProjectModal: (show: boolean) => void;
  setShowInviteModal: (show: boolean) => void;
  setShowSettingsModal: (show: boolean) => void;
  handleDeleteProject: (project: any) => void;
  isAdmin: boolean;
  key?: string;
}

const MainLayout = ({
  children,
  activeTab,
  setActiveTab,
  user,
  handleLogout,
  selectedProject,
  projects,
  setSelectedProject,
  setShowProjectModal,
  setShowInviteModal,
  setShowSettingsModal,
  handleDeleteProject,
  isAdmin
}: MainLayoutProps) => {
  return (
    <div className="flex h-screen bg-transparent overflow-hidden font-sans selection:bg-slate-200">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        handleLogout={handleLogout} 
      />
      
      <main className="flex-1 overflow-hidden flex flex-col bg-transparent pb-16 md:pb-0">
        <Topbar 
          selectedProject={selectedProject}
          projects={projects}
          setSelectedProject={setSelectedProject}
          setShowProjectModal={setShowProjectModal}
          setShowInviteModal={setShowInviteModal}
          setShowSettingsModal={setShowSettingsModal}
          handleDeleteProject={handleDeleteProject}
          activeTab={activeTab}
          userId={user?.uid || ''}
          isAdmin={isAdmin}
        />
        
        <div className="flex-1 overflow-auto custom-scrollbar p-4 lg:p-6">
          {children}
        </div>
      </main>

      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default MainLayout;
