import React from 'react';
import ProjectModal from '../modals/ProjectModal';
import InviteModal from '../modals/InviteModal';
import SettingsModal from '../modals/SettingsModal';
import DocsModal from '../modals/DocsModal';
import QuickAddModal from '../kanban/QuickAddModal';
import { Toaster } from 'sonner';
import { User } from 'firebase/auth';
import { Project, BugPriority } from '../../types';

interface ModalsContainerProps {
  user: User | null;
  selectedProject: Project | null;
  setSelectedProject: (p: Project | null) => void;
  showProjectModal: boolean;
  setShowProjectModal: (s: boolean) => void;
  newProjectName: string;
  setNewProjectName: (n: string) => void;
  handleCreateProject: () => void;
  showInviteModal: boolean;
  setShowInviteModal: (s: boolean) => void;
  inviteUserEmail: string;
  setInviteUserEmail: (e: string) => void;
  handleInviteMember: () => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (s: boolean) => void;
  handleUpdateProject: () => void;
  handleDeleteProject: (p: any) => void;
  showDocsModal: boolean;
  setShowDocsModal: (s: boolean) => void;
  showQuickAdd: boolean;
  setShowQuickAdd: (s: boolean) => void;
  quickAddTitle: string;
  setQuickAddTitle: (t: string) => void;
  quickAddPriority: BugPriority;
  setQuickAddPriority: (p: BugPriority) => void;
  quickAddDueDate: string;
  setQuickAddDueDate: (d: string) => void;
  handleQuickAdd: () => void;
}

const ModalsContainer = ({
  user,
  selectedProject,
  setSelectedProject,
  showProjectModal,
  setShowProjectModal,
  newProjectName,
  setNewProjectName,
  handleCreateProject,
  showInviteModal,
  setShowInviteModal,
  inviteUserEmail,
  setInviteUserEmail,
  handleInviteMember,
  showSettingsModal,
  setShowSettingsModal,
  handleUpdateProject,
  handleDeleteProject,
  showDocsModal,
  setShowDocsModal,
  showQuickAdd,
  setShowQuickAdd,
  quickAddTitle,
  setQuickAddTitle,
  quickAddPriority,
  setQuickAddPriority,
  quickAddDueDate,
  setQuickAddDueDate,
  handleQuickAdd
}: ModalsContainerProps) => {
  return (
    <>
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
    </>
  );
};

export default ModalsContainer;
