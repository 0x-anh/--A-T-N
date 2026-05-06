import { useState, useEffect, useMemo } from 'react';
import { db, handleFirestoreError } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Bug, UserProfile, Project } from '../types';

export const useProjectData = (user: any, selectedProject: Project | null, userProfiles: UserProfile[], currentTime: Date) => {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !selectedProject) {
      setBugs([]);
      setEvents([]);
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

    const qActivity = query(
      collection(db, 'activity_logs'),
      where('projectId', '==', selectedProject.id),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubscribeActivity = onSnapshot(qActivity, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, 'list', 'activity_logs');
    });

    return () => {
      unsubscribeBugs();
      unsubscribeActivity();
    };
  }, [user, selectedProject]);

  const overdueTasks = useMemo(() => {
    return bugs.filter(b => {
      if (b.status === 'done' || !b.dueDate) return false;
      try {
        const dueDate = new Date(b.dueDate);
        return dueDate < currentTime;
      } catch (e) {
        return false;
      }
    });
  }, [bugs, currentTime]);

  const urgentTasks = useMemo(() => {
    if (!user || !selectedProject) return [];
    const profile = userProfiles.find(u => u.userId === user.uid);
    const isAdminUser = profile?.roles?.includes('admin') || profile?.email === 'jokerducanh@gmail.com' || selectedProject?.ownerId === user.uid;
    
    if (isAdminUser) return overdueTasks;
    return overdueTasks.filter(b => b.assigneeId === user.uid || b.ownerId === user.uid);
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

  return {
    bugs,
    events,
    overdueTasks,
    urgentTasks,
    appStats
  };
};
