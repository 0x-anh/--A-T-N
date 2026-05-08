import { useState, useEffect } from 'react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { Project, UserProfile, UserRole } from '../types';
import { toast } from 'sonner';

export const useProjects = (userId: string | undefined, userProfiles: UserProfile[]) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [sentInvitations, setSentInvitations] = useState<any[]>([]);

  // Get current user profile
  const currentUserProfile = userProfiles.find(u => u.userId === userId);
  const isSystemAdmin = currentUserProfile?.email === 'jokerducanh@gmail.com';

  useEffect(() => {
    if (!userId) {
      setProjects([]);
      setSelectedProject(null);
      setPendingInvitations([]);
      setSentInvitations([]);
      return;
    }

    // Fetch projects
    const qProjects = query(
      collection(db, 'projects'), 
      where('members', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );
    
    const unsubProjects = onSnapshot(qProjects, (snapshot) => {
      const projList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Project[];
      setProjects(projList);
      
      setSelectedProject(currentSelected => {
        if (projList.length === 0) return null;
        
        if (!currentSelected) {
          const lastId = localStorage.getItem('lastProjectId');
          const found = projList.find(p => p.id === lastId);
          return found || projList[0];
        }
        
        // Find the same project in the new list to get updated data
        const updated = projList.find(p => p.id === currentSelected.id);
        return updated || projList[0]; // Fallback to first if selected one is gone (e.g. removed)
      });
    });

    // Fetch pending invitations for this user (Received)
    const qInvites = query(
      collection(db, 'invitations'),
      where('targetUserId', '==', userId),
      where('status', '==', 'pending')
    );

    const unsubInvites = onSnapshot(qInvites, (snapshot) => {
      setPendingInvitations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch invitations sent FROM this project (to track progress)
    let unsubSentInvites = () => {};
    if (selectedProject?.id) {
      const qSent = query(
        collection(db, 'invitations'),
        where('projectId', '==', selectedProject.id),
        where('status', '==', 'pending')
      );
      unsubSentInvites = onSnapshot(qSent, (snapshot) => {
        setSentInvitations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => {
      unsubProjects();
      unsubInvites();
      unsubSentInvites();
    };
  }, [userId, selectedProject?.id]);

  useEffect(() => {
    if (selectedProject) {
      localStorage.setItem('lastProjectId', selectedProject.id);
    }
  }, [selectedProject]);

  const handleInviteMember = async (inviteUserEmail: string) => {
    if (!inviteUserEmail.trim() || !userId || !selectedProject) return;
    try {
      const targetUser = userProfiles.find(u => u.email === inviteUserEmail.trim());
      if (!targetUser) {
        toast.error("Không tìm thấy nhân sự trong hệ thống.");
        return;
      }
      
      if (selectedProject.members.includes(targetUser.userId)) {
        toast.error("Nhân sự này đã là thành viên dự án.");
        return;
      }

      const projectRef = doc(db, 'projects', selectedProject.id);

      // EVERYONE (including Owners) now sends a formal invitation for a professional flow
      await addDoc(collection(db, 'invitations'), {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        inviterId: userId,
        inviterName: currentUserProfile?.displayName || 'Admin',
        targetUserId: targetUser.userId,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      toast.success(`Đã gửi lời mời hệ thống tới ${targetUser.displayName}.`);
      return true;
    } catch (e: any) {
      console.error("Invite error:", e);
      toast.error(`Yêu cầu thất bại: Lỗi hệ thống (${e.code || e.message})`);
      return false;
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    let invite: any = null;
    try {
      invite = pendingInvitations.find(i => i.id === invitationId);
      if (!invite) return;

      const inviteRef = doc(db, 'invitations', invitationId);
      const projectRef = doc(db, 'projects', invite.projectId);

      // 1. Update invitation status
      await updateDoc(inviteRef, {
        status: 'accepted',
        respondedAt: serverTimestamp()
      });

      // 2. Add user to project members
      await updateDoc(projectRef, {
        members: arrayUnion(userId)
      });

      // 3. Log the activity for the Owner to see
      await addDoc(collection(db, 'activity_logs'), {
        projectId: invite.projectId,
        projectName: invite.projectName,
        userId: userId,
        userName: currentUserProfile?.displayName || 'Thành viên mới',
        userEmail: currentUserProfile?.email || '',
        userPhoto: currentUserProfile?.photoURL || '',
        action: 'INVITATION_ACCEPTED',
        details: `${currentUserProfile?.displayName} đã chấp nhận lời mời tham gia dự án.`,
        createdAt: serverTimestamp()
      });

      toast.success(`Đã gia nhập dự án: ${invite.projectName}`);
      return true;
    } catch (e) {
      handleFirestoreError(e, 'update', invite ? `projects/${invite.projectId}` : 'projects');
      toast.error("Lỗi xác nhận lời mời.");
      return false;
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    let invite: any = null;
    try {
      invite = pendingInvitations.find(i => i.id === invitationId);
      if (!invite) return;

      const inviteRef = doc(db, 'invitations', invitationId);

      // 1. Update invitation status
      await updateDoc(inviteRef, {
        status: 'declined',
        respondedAt: serverTimestamp()
      });

      // 2. Log the activity
      await addDoc(collection(db, 'activity_logs'), {
        projectId: invite.projectId,
        projectName: invite.projectName,
        userId: userId,
        userName: currentUserProfile?.displayName || 'Nhân sự',
        userEmail: currentUserProfile?.email || '',
        userPhoto: currentUserProfile?.photoURL || '',
        action: 'INVITATION_DECLINED',
        details: `${currentUserProfile?.displayName} đã từ chối lời mời tham gia dự án.`,
        createdAt: serverTimestamp()
      });

      toast.info("Đã từ chối lời mời gia nhập.");
      return true;
    } catch (e) {
      handleFirestoreError(e, 'update', 'invitations');
      toast.error("Lỗi thực thi lệnh từ chối.");
      return false;
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!userId || !selectedProject || memberId === selectedProject.ownerId) return;
    const isOwner = userId === selectedProject.ownerId;
    if (!isOwner && !isSystemAdmin) {
      toast.error("Yêu cầu quyền quản trị viên dự án.");
      return;
    }

    const memberProfile = userProfiles.find(u => u.userId === memberId);
    const displayName = memberProfile?.displayName || "Nhân sự";

    try {
      const projectRef = doc(db, 'projects', selectedProject.id);
      const batch = writeBatch(db);

      // 1. Queue project member removal in batch
      batch.update(projectRef, { 
        members: arrayRemove(memberId) 
      });

      // 2. DEEP SCRUB: Scan EVERY bug in this project to ensure NO trace remains
      console.log(`[ZENITH_DEEP_SCRUB] Khởi động quét toàn diện dự án cho ID: ${memberId}`);
      const bugsRef = collection(db, 'bugs');
      const qProjectBugs = query(
        bugsRef, 
        where('projectId', '==', selectedProject.id)
      );
      
      const projectBugsSnapshot = await getDocs(qProjectBugs);
      console.log(`[ZENITH_DEEP_SCRUB] Quét ${projectBugsSnapshot.size} nhiệm vụ cho ID: ${memberId}`);
      
      let scrubbedCount = 0;

      projectBugsSnapshot.forEach(bugDoc => {
        const bugData = bugDoc.data();
        let needsUpdate = false;
        const updates: any = {};

        // Force scrub assigneeId
        if (bugData.assigneeId === memberId) {
          updates.assigneeId = '';
          needsUpdate = true;
        }

        // Force scrub members array
        if (bugData.members && bugData.members.includes(memberId)) {
          updates.members = bugData.members.filter((id: string) => id !== memberId);
          needsUpdate = true;
        }

        if (needsUpdate) {
          batch.update(bugDoc.ref, {
            ...updates,
            updatedAt: serverTimestamp()
          });
          scrubbedCount++;
        }
      });
      
      console.log(`[ZENITH_DEEP_SCRUB] Hoàn tất: Đã dọn sạch dấu vết tại ${scrubbedCount} nhiệm vụ.`);

      // 3. ATOMIC COMMIT: Execute everything at once
      await batch.commit();

      // 4. LOG THE REMOVAL AFTER COMMIT SUCCESS
      await addDoc(collection(db, 'activity_logs'), {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        userId: userId,
        userName: currentUserProfile?.displayName || 'Admin',
        userEmail: currentUserProfile?.email || '',
        userPhoto: currentUserProfile?.photoURL || '',
        action: 'MEMBER_REMOVED',
        details: `Hệ thống đã thực thi lệnh ATOMIC_SCRUB cho nhân sự ${displayName}. Đã dọn sạch ${scrubbedCount} nhiệm vụ.`,
        createdAt: serverTimestamp()
      });

      toast.success(`Hệ thống đã dọn sạch dấu vết của ${displayName}.`);
      return true;
    } catch (e) {
      handleFirestoreError(e, 'update', `projects/${selectedProject.id}`);
      toast.error("Lỗi vận hành hệ thống: Không thể xóa.");
      return false;
    }
  };

  const handleUpdateUserRoles = async (targetUserId: string, currentRoles: UserRole[], clickedRole: UserRole) => {
    if (!userId || !isSystemAdmin) {
      toast.error("Yêu cầu quyền quản trị viên hệ thống.");
      return;
    }
    
    const targetProfile = userProfiles.find(u => u.userId === targetUserId);
    const displayName = targetProfile?.displayName || "Nhân sự";
    
    try {
      const isRemoving = currentRoles.includes(clickedRole);
      const newRoles = isRemoving 
        ? currentRoles.filter(r => r !== clickedRole)
        : [...currentRoles.filter(r => r !== clickedRole), clickedRole]; // Basic toggle logic
      
      if (newRoles.length === 0) {
        toast.error("Nhân sự phải có ít nhất một vai trò.");
        return;
      }

      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { roles: newRoles });
      
      const roleLabel = t(`members.${clickedRole}`);
      toast.success(`Đã ${isRemoving ? 'gỡ' : 'cấp'} vai trò ${roleLabel} cho ${displayName}.`);
      
      // Log the admin action
      await addDoc(collection(db, 'activity_logs'), {
        projectId: selectedProject?.id || 'GLOBAL',
        projectName: selectedProject?.name || 'SYSTEM',
        userId: userId,
        userName: currentUserProfile?.displayName || 'Admin',
        action: 'ROLE_UPDATED',
        details: `Đã ${isRemoving ? 'gỡ' : 'cấp'} vai trò ${roleLabel} cho nhân sự ${displayName}.`,
        createdAt: serverTimestamp()
      });

      return true;
    } catch (e) {
      toast.error("Cập nhật vai trò thất bại.");
      return false;
    }
  };

  return {
    projects,
    selectedProject,
    setSelectedProject,
    pendingInvitations,
    sentInvitations,
    handleInviteMember,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleRemoveMember,
    handleUpdateUserRoles
  };
};
