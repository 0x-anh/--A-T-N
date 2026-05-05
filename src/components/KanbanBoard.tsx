import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  updateDoc, doc, addDoc, collection, serverTimestamp, deleteDoc, 
  query, where, orderBy, onSnapshot 
} from 'firebase/firestore';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { db, handleFirestoreError } from '../lib/firebase';
import { 
  Bug, BugStatus, BugPriority, STATUS_COLUMNS, 
  UserProfile, canUserMoveTo 
} from '../types';
import { toast } from 'sonner';

// Import sub-components
import KanbanHeader from './kanban/KanbanHeader';
import KanbanColumn from './kanban/KanbanColumn';
import QuickAddModal from './kanban/QuickAddModal';
import TeamManagementModal from './kanban/TeamManagementModal';
import BugDetailModal from './kanban/BugDetailModal';

interface KanbanBoardProps {
  projectId: string;
  userId: string;
  userProfiles: UserProfile[];
  bugs: Bug[];
  isProjectOwner?: boolean;
}

const KanbanBoard = ({ projectId, userId, userProfiles, bugs, isProjectOwner }: KanbanBoardProps) => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState<BugStatus | null>(null);
  const [newBugTitle, setNewBugTitle] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAddPriority, setQuickAddPriority] = useState<BugPriority>('low');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [selectedBug, setSelectedBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const isAdmin = useMemo(() => {
    const profile = userProfiles.find(u => u.userId === userId);
    return profile?.roles?.includes('admin') || profile?.email === 'jokerducanh@gmail.com' || isProjectOwner;
  }, [userProfiles, userId, isProjectOwner]);

  const filteredBugs = useMemo(() => {
    return bugs.filter(bug => {
      const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOverdue = !showOverdueOnly || (bug.status !== 'done' && bug.dueDate && new Date(bug.dueDate) < new Date());
      return matchesSearch && matchesOverdue;
    });
  }, [bugs, searchTerm, showOverdueOnly]);

  const tasksByStatus = useMemo(() => {
    const groups: Record<BugStatus, Bug[]> = {
      'backlog': [],
      'in-progress': [],
      'in-review': [],
      'done': []
    };
    filteredBugs.forEach(bug => {
      if (groups[bug.status]) groups[bug.status].push(bug);
    });
    return groups;
  }, [filteredBugs]);

  // Firebase Activity & Comments logic
  useEffect(() => {
    if (!selectedBug) return;
    const q = query(
      collection(db, 'bugs', selectedBug.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedBug]);

  const logActivity = async (bugId: string, type: string, content: string) => {
    try {
      await addDoc(collection(db, 'bugs', bugId, 'activities'), {
        type, content, userId, userName: userProfiles.find(u => u.userId === userId)?.displayName || 'Unknown',
        createdAt: serverTimestamp()
      });
    } catch (e) { console.error("Activity log failed"); }
  };

  const handleUpdateBugDetails = async (bugId: string, updates: Partial<Bug>) => {
    try {
      await updateDoc(doc(db, 'bugs', bugId), { ...updates, updatedAt: serverTimestamp() });
      if (selectedBug?.id === bugId) setSelectedBug({ ...selectedBug, ...updates });
    } catch (e) { toast.error("Cập nhật thất bại"); }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const newStatus = destination.droppableId as BugStatus;
    const currentUserProfile = userProfiles.find(u => u.userId === userId);

    if (!isAdmin && !canUserMoveTo(currentUserProfile?.roles, newStatus)) {
      toast.error("Truy cập bị từ chối: Bạn không có quyền chuyển sang trạng thái này");
      return;
    }

    try {
      await updateDoc(doc(db, 'bugs', draggableId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      logActivity(draggableId, 'STATUS_CHANGE', `Chuyển trạng thái từ ${source.droppableId} sang ${newStatus}`);
      toast.success(`Đã chuyển sang ${newStatus.toUpperCase()}`);
    } catch (e) { toast.error("Lỗi đồng bộ dữ liệu"); }
  };

  const handleAddBug = async (status: BugStatus) => {
    if (!newBugTitle.trim()) return;
    try {
      await addDoc(collection(db, 'bugs'), {
        projectId, title: newBugTitle.trim(), status, priority: 'low',
        ownerId: userId, members: [userId], createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      setNewBugTitle('');
      setIsAdding(null);
      toast.success("Nút dữ liệu mới đã được khởi tạo");
    } catch (e) { toast.error("Lỗi khởi tạo"); }
  };

  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim()) return;
    try {
      await addDoc(collection(db, 'bugs'), {
        projectId, title: quickAddTitle.trim(), status: 'backlog', priority: quickAddPriority,
        ownerId: userId, members: [userId], createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      setQuickAddTitle('');
      setShowQuickAdd(false);
      toast.success("Nhiệm vụ chiến lược đã được triển khai");
    } catch (e) { toast.error("Lỗi triển khai"); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedBug) return;
    try {
      await addDoc(collection(db, 'bugs', selectedBug.id, 'comments'), {
        content: newComment.trim(), userId, 
        userName: userProfiles.find(u => u.userId === userId)?.displayName || 'Anonymous',
        createdAt: serverTimestamp()
      });
      setNewComment('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) { toast.error("Gửi phản hồi thất bại"); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 relative overflow-hidden">
      <KanbanHeader 
        viewMode={viewMode} setViewMode={setViewMode}
        showOverdueOnly={showOverdueOnly} setShowOverdueOnly={setShowOverdueOnly}
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        bugs={bugs} setShowQuickAdd={setShowQuickAdd}
      />

      <main className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar p-6 md:p-10">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full min-w-max">
            {STATUS_COLUMNS.map(column => (
              <KanbanColumn 
                key={column.id}
                title={column.label}
                status={column.id}
                tasks={tasksByStatus[column.id]}
                userProfiles={userProfiles}
                onSelect={setSelectedBug}
                isAdding={isAdding === column.id}
                setIsAdding={setIsAdding}
                newBugTitle={newBugTitle}
                setNewBugTitle={setNewBugTitle}
                handleAddBug={handleAddBug}
                userId={userId}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </DragDropContext>
      </main>

      {/* Floating Action Button for Team */}
      <button 
        onClick={() => setShowTeamModal(true)}
        className="fixed bottom-10 right-10 w-16 h-16 bg-white border border-slate-100 rounded-full shadow-2xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:scale-110 transition-all z-30 group"
      >
        <div className="absolute inset-0 bg-indigo-500/5 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
        <span className="relative font-black text-xs">TEAM</span>
      </button>

      <QuickAddModal 
        show={showQuickAdd} onClose={() => setShowQuickAdd(false)}
        title={quickAddTitle} setTitle={setQuickAddTitle}
        priority={quickAddPriority} setPriority={setQuickAddPriority}
        onSubmit={handleQuickAdd}
      />

      <TeamManagementModal 
        show={showTeamModal} onClose={() => setShowTeamModal(false)}
        userProfiles={userProfiles} selectedProject={null} // Project will be handled in detailed hooks later
        isAdmin={isAdmin} userId={userId}
        handleUpdateUserRoles={() => {}} // Placeholder for now
        handleRemoveMember={() => {}} // Placeholder for now
      />

      <BugDetailModal 
        selectedBug={selectedBug} onClose={() => setSelectedBug(null)}
        userProfiles={userProfiles} userId={userId} isAdmin={isAdmin}
        handleUpdateBugDetails={handleUpdateBugDetails}
        handleDeleteBug={async (id) => {
          if (confirm('Xóa?')) {
             await deleteDoc(doc(db, 'bugs', id));
             setSelectedBug(null);
          }
        }}
        logActivity={logActivity}
        comments={comments} newComment={newComment}
        setNewComment={setNewComment} handleAddComment={handleAddComment}
        bottomRef={bottomRef}
      />
    </div>
  );
};

export default KanbanBoard;
