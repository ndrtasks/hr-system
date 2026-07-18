

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { Task, User, Comment, Status, Notification, Attachment, Role, Department, LoginPortal, Conversation, CommunicationMessage, ConversationType, getTaskAssigneeIds, getTaskLastActivityTime, isSuperAdminUser } from '../types';
import { INITIAL_TASKS, USERS } from '../constants';
import { firebaseConfig, emailJSConfig } from '../firebaseConfig';

// Firebase Imports
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail, deleteUser as deleteAuthUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDoc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, query, where, Unsubscribe, serverTimestamp, arrayUnion } from 'firebase/firestore';

// EmailJS
import emailjs from '@emailjs/browser';

interface TimeRemaining {
    days: number;
    hours: number;
    isLate: boolean;
    label: string;
    severity: 'SAFE' | 'WARNING' | 'CRITICAL' | 'LATE';
}

const getTimestampValue = (value: any): number => value?.toMillis?.()
  ?? (value?.seconds ? value.seconds * 1000 : new Date(value || 0).getTime());

interface TaskContextType {
  tasks: Task[];
  users: User[];
  departments: Department[];
  conversations: Conversation[];
  communicationMessages: CommunicationMessage[];
  currentUser: User | null;
  notifications: Notification[];
  showLeaderboard: boolean;
  isLiveMode: boolean;
  taskReadStatus: Record<string, string>;
  login: (userId: string) => void;
  loginWithCredentials: (email: string, pass: string, portal: LoginPortal) => Promise<{ success: boolean; message?: string }>;
  recoverPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  addTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: Status) => void;
  resolveParticipantCompletion: (taskId: string, participantId: string, approved: boolean) => Promise<void>;
  resolveParticipantReopen: (taskId: string, participantId: string, approved: boolean) => Promise<void>;
  updateTaskDetails: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTaskAssignee: (taskId: string, newAssigneeId: string) => Promise<void>;
  sendTaskReminder: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, attachments?: Attachment[]) => void;
  getTaskById: (id: string) => Task | undefined;
  addUser: (user: User) => Promise<{ success: boolean; message?: string }>;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  addDepartment: (name: string) => Promise<{ success: boolean; message: string }>;
  updateDepartment: (departmentId: string, name: string) => Promise<{ success: boolean; message: string }>;
  deleteDepartment: (departmentId: string) => Promise<{ success: boolean; message: string }>;
  createConversation: (title: string, participantIds: string[], type: ConversationType, openingMessage: string) => Promise<{ success: boolean; message: string }>;
  sendCommunicationMessage: (conversationId: string, content: string) => Promise<{ success: boolean; message: string }>;
  markConversationRead: (conversationId: string) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  markTaskAsRead: (taskId: string) => void;
  sendEmailNotification: (toEmail: string, subject: string, messageBody?: string) => void;
  requestTaskExtension: (taskId: string, newDate: string, reason: string) => void;
  resolveExtensionRequest: (taskId: string, approved: boolean, finalDate?: string) => void;
  toggleLeaderboardVisibility: (show: boolean) => void;
  calculateTimeRemaining: (dueDate: string) => TimeRemaining;
  simulateEmail: (toEmail: string, subject: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [users, setUsers] = useState<User[]>(USERS);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [communicationMessages, setCommunicationMessages] = useState<CommunicationMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  
  // حالة القراءة مستقلة لكل حساب حتى لو استخدم أكثر من مستخدم نفس الجهاز.
  const [taskReadStatus, setTaskReadStatus] = useState<Record<string, string>>({});
  
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  const dbRef = useRef<any>(null);
  const authRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataUnsubscribersRef = useRef<Unsubscribe[]>([]);
  const pendingLoginPortalRef = useRef<LoginPortal | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  useEffect(() => {
    const initFirebase = async () => {
      if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
        try {
          console.log("🔥 Initializing Firebase...");
          const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
          const auth = getAuth(app);
          
          let db;
          try {
             db = initializeFirestore(app, {
                localCache: persistentLocalCache({
                  tabManager: persistentMultipleTabManager()
                })
             });
          } catch (e) {
             db = getFirestore(app);
          }
          
          dbRef.current = db;
          authRef.current = auth;
          setIsLiveMode(true);

          setUsers([]); 
          setTasks([]);
          setNotifications([]); 

          const subscribeToUserData = (profile: User) => {
            dataUnsubscribersRef.current.forEach(unsubscribe => unsubscribe());
            dataUnsubscribersRef.current = [];

            const isManager = profile.role === 'MANAGER';
            const isSuperAdmin = isSuperAdminUser(profile);
            const usersSource = isSuperAdmin
              ? collection(db, 'users')
              : query(collection(db, 'users'), where('department', '==', profile.department));
            const taskSources = isSuperAdmin
              ? [collection(db, 'tasks')]
              : isManager
                ? [query(collection(db, 'tasks'), where('department', '==', profile.department))]
                : [
                    query(collection(db, 'tasks'), where('assigneeIds', 'array-contains', profile.id)),
                    query(collection(db, 'tasks'), where('assigneeId', '==', profile.id))
                  ];
            const notificationsSource = query(collection(db, 'notifications'), where('userId', '==', profile.id));
            const conversationsSource = query(collection(db, 'conversations'), where('participantIds', 'array-contains', profile.id));
            const messagesSource = query(collection(db, 'communicationMessages'), where('participantIds', 'array-contains', profile.id));

            const unsubUsers = onSnapshot(usersSource, (snapshot) => {
              const fetchedUsers = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as User));
              setUsers(fetchedUsers.length ? fetchedUsers : [profile]);
            }, error => {
              console.warn('تعذر تحميل أعضاء القسم', error);
              setUsers([profile]);
            });

            const taskSnapshots = new Map<number, Task[]>();
            const publishTasks = () => {
                const uniqueTasks = new Map<string, Task>();
                taskSnapshots.forEach(items => items.forEach(task => uniqueTasks.set(task.id, task)));
                const fetchedTasks = Array.from(uniqueTasks.values());
                fetchedTasks.sort((a, b) => getTaskLastActivityTime(b) - getTaskLastActivityTime(a));
                setTasks(fetchedTasks);
            };
            const unsubTasks = taskSources.map((source, index) => onSnapshot(source, snapshot => {
                taskSnapshots.set(index, snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Task)));
                publishTasks();
            }, error => console.error('تعذر تحميل مهام المستخدم', error)));

            const unsubNotifications = onSnapshot(notificationsSource, (snapshot) => {
             const fetchedNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
             fetchedNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
             setNotifications(fetchedNotifs);
            }, error => console.warn('تعذر تحميل الإشعارات', error));

            const unsubConversations = onSnapshot(conversationsSource, snapshot => {
                const items = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Conversation));
                items.sort((a, b) => getTimestampValue(b.lastUpdated) - getTimestampValue(a.lastUpdated));
                setConversations(items);
            }, error => console.warn('تعذر تحميل المحادثات', error));

            const unsubMessages = onSnapshot(messagesSource, snapshot => {
                const items = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as CommunicationMessage));
                items.sort((a, b) => getTimestampValue(a.timestamp) - getTimestampValue(b.timestamp));
                setCommunicationMessages(items);
            }, error => console.warn('تعذر تحميل رسائل التواصل', error));

            const departmentsSource = isSuperAdmin
              ? collection(db, 'departments')
              : query(collection(db, 'departments'), where('name', '==', profile.department));
            const unsubDepartments = onSnapshot(departmentsSource, snapshot => {
                setDepartments(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Department)));
            }, error => console.warn('تعذر تحميل الأقسام', error));

            dataUnsubscribersRef.current = [unsubUsers, ...unsubTasks, unsubNotifications, unsubDepartments, unsubConversations, unsubMessages];
          };

          onAuthStateChanged(auth, async (firebaseUser) => {
             if (firebaseUser) {
               if (firebaseUser.email?.toLowerCase() === 'ndrtasks@gmail.com') {
                   if (pendingLoginPortalRef.current && pendingLoginPortalRef.current !== 'SUPER_ADMIN') {
                       await signOut(auth);
                       setCurrentUser(null);
                       return;
                   }
                   const adminUser: User = {
                        id: firebaseUser.uid,
                        name: 'مدير النظام',
                        email: firebaseUser.email!,
                        role: 'MANAGER',
                        accessLevel: 'SUPER_ADMIN',
                        avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
                        department: 'الإدارة العليا'
                   };
                   try { await setDoc(doc(db, 'users', firebaseUser.uid), adminUser, { merge: true }); } catch (e) {}
                   setCurrentUser(adminUser);
                   subscribeToUserData(adminUser);
               } else {
                   try {
                       const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
                       if (docSnap.exists()) {
                           const storedProfile = { id: docSnap.id, ...docSnap.data() } as User;
                           const profile = storedProfile.role === 'MANAGER' && !storedProfile.accessLevel
                             ? { ...storedProfile, accessLevel: 'DEPARTMENT_MANAGER' as const }
                             : storedProfile;
                           const actualPortal: LoginPortal = profile.role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE';
                           if (pendingLoginPortalRef.current && pendingLoginPortalRef.current !== actualPortal) {
                               await signOut(auth);
                               setCurrentUser(null);
                               return;
                           }
                           setCurrentUser(profile);
                           subscribeToUserData(profile);
                       } else {
                           console.warn('تم رفض الدخول: لا يوجد ملف صلاحيات مرتبط بالحساب.');
                           await signOut(auth);
                           setCurrentUser(null);
                       }
                   } catch (e) {
                       console.error('تعذر التحقق من صلاحية الحساب؛ تم إلغاء الجلسة.', e);
                       await signOut(auth);
                       setCurrentUser(null);
                   }
               }
             } else {
               setCurrentUser(null);
             }
          });

          return () => {
            dataUnsubscribersRef.current.forEach(unsubscribe => unsubscribe());
          };

        } catch (error) {
          console.error("Firebase Initialization Error:", error);
          setIsLiveMode(false);
        }
      } else {
        console.log("⚠️ Running in Local Demo Mode");
        setIsLiveMode(false);
      }
    };

    initFirebase();
  }, []);

  useEffect(() => {
      if (!currentUser || notifications.length === 0) return;
      const latestNotif = notifications[0];
      const isRecent = new Date().getTime() - new Date(latestNotif.timestamp).getTime() < 5000;
      if (latestNotif.userId === currentUser.id && !latestNotif.read && isRecent) {
          playSound();
      }
  }, [notifications, currentUser]);

  useEffect(() => {
      if (!currentUser) {
          setTaskReadStatus({});
          return;
      }
      const saved = localStorage.getItem(`taskReadStatus:${currentUser.id}`);
      try {
          setTaskReadStatus(saved ? JSON.parse(saved) : {});
      } catch (_) {
          setTaskReadStatus({});
      }
  }, [currentUser?.id]);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(e => console.log('Audio play failed'));
    }
  };

  const sendEmailNotification = (toEmail: string, subject: string, messageBody: string = '') => {
    if (isLiveMode && emailJSConfig.serviceId && emailJSConfig.publicKey) {
        const templateParams = {
            to_email: toEmail,
            subject: subject,
            message: messageBody || subject,
            to_name: users.find(u => u.email === toEmail)?.name || 'المستخدم',
        };
        emailjs.send(emailJSConfig.serviceId, emailJSConfig.templateId, templateParams, emailJSConfig.publicKey)
            .then(() => console.log('✅ EMAIL SENT'), (err) => console.log('❌ EMAIL FAILED', err));
    }
  };

  const simulateEmail = (toEmail: string, subject: string) => {
      sendEmailNotification(toEmail, subject);
  };

  const calculateTimeRemaining = (dueDate: string): TimeRemaining => {
      const now = new Date();
      const due = new Date(dueDate);
      due.setHours(23, 59, 59, 999);
      const diff = due.getTime() - now.getTime();
      const isLate = diff < 0;
      const absDiff = Math.abs(diff);
      const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      let label = '';
      let severity: 'SAFE' | 'WARNING' | 'CRITICAL' | 'LATE' = 'SAFE';

      if (isLate) {
          label = days > 0 ? `متأخرة منذ ${days} يوم` : `متأخرة منذ ${hours} ساعة`;
          severity = 'LATE';
      } else {
          if (days > 2) { label = `متبقي ${days} يوم`; severity = 'SAFE'; }
          else if (days > 0) { label = `متبقي ${days} يوم و ${hours} ساعة`; severity = 'WARNING'; }
          else { label = `متبقي ${hours} ساعة فقط`; severity = 'CRITICAL'; }
      }
      return { days, hours, isLate, label, severity };
  };

  // Helper to find task
  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  const login = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) setCurrentUser(user);
  };

  const loginWithCredentials = async (email: string, pass: string, portal: LoginPortal): Promise<{ success: boolean; message?: string }> => {
    if (isLiveMode && authRef.current) {
      const normalizedRequestedEmail = email.trim().toLowerCase();
      if (portal === 'SUPER_ADMIN' && normalizedRequestedEmail !== 'ndrtasks@gmail.com') {
          return { success: false, message: 'بوابة المدير العام مخصصة حصريًا لحساب مالك النظام.' };
      }
      if (portal !== 'SUPER_ADMIN' && normalizedRequestedEmail === 'ndrtasks@gmail.com') {
          return { success: false, message: 'حساب مالك النظام يدخل من بوابة المدير العام فقط.' };
      }
      pendingLoginPortalRef.current = portal;
      try {
        const credential = await signInWithEmailAndPassword(authRef.current, email, pass);
        const normalizedEmail = credential.user.email?.toLowerCase() || email.toLowerCase();
        let actualPortal: LoginPortal;
        if (normalizedEmail === 'ndrtasks@gmail.com') {
            actualPortal = 'SUPER_ADMIN';
        } else {
            const profileSnapshot = await getDoc(doc(dbRef.current, 'users', credential.user.uid));
            if (!profileSnapshot.exists()) {
                await signOut(authRef.current);
                return { success: false, message: 'لا يوجد ملف صلاحيات لهذا الحساب. راجع مدير النظام.' };
            }
            actualPortal = profileSnapshot.data().role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE';
        }
        if (actualPortal !== portal) {
            await signOut(authRef.current);
            const portalNames = { SUPER_ADMIN: 'بوابة المدير العام', MANAGER: 'بوابة الإدارة', EMPLOYEE: 'بوابة الموظفين' };
            return { success: false, message: `هذا الحساب مخصص لـ ${portalNames[actualPortal]}.` };
        }
        return { success: true };
      } catch (error: any) {
        return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
      } finally {
        pendingLoginPortalRef.current = null;
      }
    }
    return { success: false, message: 'النظام غير متصل' };
  };

  const logout = async () => {
    if (isLiveMode && authRef.current) await signOut(authRef.current);
    setCurrentUser(null);
  };

  const recoverPassword = async (email: string) => {
      if (isLiveMode && authRef.current) {
          try {
            await sendPasswordResetEmail(authRef.current, email);
            return { success: true, message: `تم إرسال رابط إعادة تعيين كلمة المرور من Google إلى ${email}.` };
          } catch (error: any) { return { success: false, message: "فشل إرسال الرابط." }; }
      }
      return { success: false, message: "النظام غير متصل" };
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
      const firebaseUser = authRef.current?.currentUser;
      if (!isLiveMode || !firebaseUser?.email) return { success: false, message: 'النظام غير متصل بحساب Firebase.' };
      if (newPassword.length < 8) return { success: false, message: 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.' };
      if (currentPassword === newPassword) return { success: false, message: 'اختر كلمة مرور جديدة مختلفة عن الحالية.' };
      try {
          const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
          await reauthenticateWithCredential(firebaseUser, credential);
          await updatePassword(firebaseUser, newPassword);
          return { success: true, message: 'تم تغيير كلمة المرور بنجاح.' };
      } catch (error: any) {
          const messages: Record<string, string> = {
              'auth/invalid-credential': 'كلمة المرور الحالية غير صحيحة.',
              'auth/wrong-password': 'كلمة المرور الحالية غير صحيحة.',
              'auth/weak-password': 'كلمة المرور الجديدة ضعيفة.',
              'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلاً ثم حاول مجددًا.',
              'auth/requires-recent-login': 'يلزم تسجيل الخروج والدخول مجددًا قبل تغيير كلمة المرور.',
              'auth/network-request-failed': 'تعذر الاتصال. تحقق من الإنترنت وحاول مجددًا.'
          };
          return { success: false, message: messages[error?.code] || 'تعذر تغيير كلمة المرور.' };
      }
  };

  const createNotification = async (userId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING', taskId?: string) => {
    const newNotif: Notification = { id: `n_${Date.now()}`, userId, title, message, type, read: false, timestamp: new Date().toISOString(), taskId };
    if (isLiveMode && dbRef.current) {
        const { id, ...notifData } = newNotif;
        await addDoc(collection(dbRef.current, 'notifications'), notifData);
    }
  };

  const getManagerId = () => {
      const manager = users.find(u => u.role === 'MANAGER');
      return manager ? manager.id : null;
  };

  const markTaskAsRead = (taskId: string) => {
      if (!currentUser) return;
      const now = new Date().toISOString();
      setTaskReadStatus(previous => {
          const updatedStatus = { ...previous, [taskId]: now };
          localStorage.setItem(`taskReadStatus:${currentUser.id}`, JSON.stringify(updatedStatus));
          return updatedStatus;
      });
  };

  const addTask = async (task: Task) => {
    if (!currentUser) return;
    const effectiveTask = isSuperAdminUser(currentUser) ? task : { ...task, department: currentUser.department, createdBy: currentUser.id };
    const lastUpdated = new Date().toISOString();
    if (isLiveMode && dbRef.current) {
        const { id, ...taskData } = effectiveTask;
        await addDoc(collection(dbRef.current, 'tasks'), { ...taskData, lastUpdated: serverTimestamp() });
    } else {
        setTasks(prev => [task, ...prev]);
    }
    markTaskAsRead(task.id);
    getTaskAssigneeIds(effectiveTask).forEach(assigneeId => {
      createNotification(assigneeId, 'مهمة جديدة', `مهمة جديدة: ${effectiveTask.title}`, 'INFO', effectiveTask.id);
      const assignee = users.find(u => u.id === assigneeId);
      if (assignee) sendEmailNotification(assignee.email, `مهمة جديدة: ${task.title}`, `تم إسناد مهمة جديدة إليك ضمن فريق عمل.`);
    });
  };

  const updateTaskStatus = async (taskId: string, status: Status) => {
    const task = getTaskById(taskId);
    if (!task || !currentUser) return;
    const statusLog: Comment = { id: `sys_${Date.now()}`, userId: 'system', userName: 'النظام', userAvatar: '', content: `تم تغيير الحالة إلى ${status}`, timestamp: new Date().toISOString(), isSystem: true };
    const lastUpdated = new Date().toISOString();

    // الموظف يحدّث إنجازه الشخصي فقط، بدون التأثير على بقية المشاركين.
    if (currentUser.role === 'EMPLOYEE' && getTaskAssigneeIds(task).includes(currentUser.id)) {
      const currentParticipantStatus = getParticipantStatus(task, currentUser.id);
      const requestingReopen = status === 'IN_PROGRESS' && currentParticipantStatus === 'COMPLETED';
      const participantStatuses = {
        ...(task.participantStatuses || {}),
        [currentUser.id]: {
          status: status === 'COMPLETED' ? 'PENDING_APPROVAL' as const : requestingReopen ? 'PENDING_REOPEN' as const : 'IN_PROGRESS' as const
        }
      };
      const allSubmitted = getTaskAssigneeIds(task).every(id => ['PENDING_APPROVAL', 'COMPLETED'].includes(participantStatuses[id]?.status));
      const taskStatus: Status = allSubmitted ? 'PENDING_REVIEW' : 'IN_PROGRESS';
      const personalLog: Comment = { ...statusLog, content: status === 'COMPLETED' ? `أرسل ${currentUser.name} إنجازه لاعتماد المدير` : requestingReopen ? `طلب ${currentUser.name} إعادة فتح دوره` : `سحب ${currentUser.name} طلب الاعتماد` };
      const updates = { participantStatuses, status: taskStatus, comments: [...task.comments, personalLog], lastUpdated };
      if (isLiveMode && dbRef.current) await updateDoc(doc(dbRef.current, 'tasks', taskId), { ...updates, lastUpdated: serverTimestamp() });
      else setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      if (status === 'COMPLETED' && task.createdBy !== currentUser.id) {
        createNotification(task.createdBy, 'إنجاز مشارك', `أكمل ${currentUser.name} دوره في: ${task.title}`, 'SUCCESS', task.id);
      }
      markTaskAsRead(taskId);
      return;
    }

    if (isLiveMode && dbRef.current) {
        const taskRef = doc(dbRef.current, 'tasks', taskId);
        await updateDoc(taskRef, { status, comments: [...(getTaskById(taskId)?.comments || []), statusLog], lastUpdated: serverTimestamp() });
    } else {
        setTasks(prev => prev.map(t => t.id !== taskId ? t : { ...t, status, comments: [...t.comments, statusLog], lastUpdated }));
    }
    markTaskAsRead(taskId);
    
    if (task && status === 'COMPLETED' && task.createdBy !== currentUser?.id) {
         let targetManagerId = task.createdBy;
         if (!users.find(u => u.id === targetManagerId)) targetManagerId = getManagerId() || targetManagerId;
         createNotification(targetManagerId, 'إنجاز مهمة', `أكمل ${currentUser?.name} المهمة: ${task.title}`, 'SUCCESS', task.id);
         const manager = users.find(u => u.id === targetManagerId);
         if (manager) sendEmailNotification(manager.email, `تم إنجاز مهمة: ${task.title}`);
    }
  };

  const resolveParticipantCompletion = async (taskId: string, participantId: string, approved: boolean) => {
      const task = getTaskById(taskId);
      if (!task || currentUser?.role !== 'MANAGER') return;
      const participant = users.find(user => user.id === participantId);
      const lastUpdated = new Date().toISOString();
      const participantStatuses = {
          ...(task.participantStatuses || {}),
          [participantId]: approved
            ? { status: 'COMPLETED' as const, completedAt: lastUpdated, approvedById: currentUser.id }
            : { status: 'IN_PROGRESS' as const }
      };
      const allApproved = getTaskAssigneeIds(task).every(id => participantStatuses[id]?.status === 'COMPLETED' && Boolean(participantStatuses[id]?.approvedById));
      const stillPending = getTaskAssigneeIds(task).some(id => participantStatuses[id]?.status === 'PENDING_APPROVAL' || (participantStatuses[id]?.status === 'COMPLETED' && !participantStatuses[id]?.approvedById));
      const nextStatus: Status = allApproved ? 'COMPLETED' : stillPending ? 'PENDING_REVIEW' : 'IN_PROGRESS';
      const log: Comment = {
          id: `sys_participant_${Date.now()}`,
          userId: 'system', userName: 'النظام', userAvatar: '', isSystem: true,
          content: approved ? `اعتمد المدير إنجاز ${participant?.name || 'الموظف'}` : `أعاد المدير دور ${participant?.name || 'الموظف'} للتنفيذ`,
          timestamp: lastUpdated
      };
      const updates = { participantStatuses, status: nextStatus, comments: [...task.comments, log], lastUpdated };
      if (isLiveMode && dbRef.current) await updateDoc(doc(dbRef.current, 'tasks', taskId), { ...updates, lastUpdated: serverTimestamp() });
      else setTasks(previous => previous.map(item => item.id === taskId ? { ...item, ...updates } : item));
      createNotification(participantId, approved ? 'تم اعتماد إنجازك' : 'تمت إعادة المهمة', approved ? `اعتمد المدير دورك في: ${task.title}` : `أعاد المدير دورك للتنفيذ في: ${task.title}`, approved ? 'SUCCESS' : 'WARNING', task.id);
      markTaskAsRead(taskId);
  };

  const resolveParticipantReopen = async (taskId: string, participantId: string, approved: boolean) => {
      const task = getTaskById(taskId);
      if (!task || currentUser?.role !== 'MANAGER') return;
      const participant = users.find(user => user.id === participantId);
      const lastUpdated = new Date().toISOString();
      const participantStatuses = {
          ...(task.participantStatuses || {}),
          [participantId]: approved
            ? { status: 'IN_PROGRESS' as const }
            : { status: 'COMPLETED' as const, completedAt: task.participantStatuses?.[participantId]?.completedAt || lastUpdated, approvedById: currentUser.id }
      };
      const nextStatus: Status = approved ? 'IN_PROGRESS' : task.status;
      const log: Comment = { id: `sys_reopen_${Date.now()}`, userId: 'system', userName: 'النظام', userAvatar: '', isSystem: true, content: approved ? `وافق المدير على إعادة فتح دور ${participant?.name || 'الموظف'}` : `رفض المدير إعادة فتح دور ${participant?.name || 'الموظف'}`, timestamp: lastUpdated };
      const updates = { participantStatuses, status: nextStatus, comments: [...task.comments, log], lastUpdated };
      if (isLiveMode && dbRef.current) await updateDoc(doc(dbRef.current, 'tasks', taskId), { ...updates, lastUpdated: serverTimestamp() });
      else setTasks(previous => previous.map(item => item.id === taskId ? { ...item, ...updates } : item));
      createNotification(participantId, approved ? 'تمت الموافقة على إعادة الفتح' : 'تم رفض إعادة الفتح', `${approved ? 'وافق' : 'رفض'} المدير طلبك في: ${task.title}`, approved ? 'SUCCESS' : 'WARNING', task.id);
      markTaskAsRead(taskId);
  };

  const deleteTask = async (taskId: string) => {
      if (isLiveMode && dbRef.current) {
          await deleteDoc(doc(dbRef.current, 'tasks', taskId));
      } else {
          setTasks(prev => prev.filter(t => t.id !== taskId));
      }
  };

  const updateTaskDetails = async (taskId: string, updates: Partial<Task>) => {
      const task = getTaskById(taskId);
      if (!task || currentUser?.role !== 'MANAGER') return;
      const previousIds = getTaskAssigneeIds(task);
      const nextIds = updates.assigneeIds?.length ? updates.assigneeIds : previousIds;
      const participantStatuses = Object.fromEntries(nextIds.map(id => [id, task.participantStatuses?.[id] || { status: 'IN_PROGRESS' }]));
      const addedIds = nextIds.filter(id => !previousIds.includes(id));
      const removedIds = previousIds.filter(id => !nextIds.includes(id));
      const lastUpdated = new Date().toISOString();
      const log: Comment = { id: `sys_edit_${Date.now()}`, userId: 'system', userName: 'النظام', userAvatar: '', isSystem: true, content: 'قام المدير بتحديث بيانات المهمة', timestamp: lastUpdated };
      const payload = { ...updates, assigneeId: nextIds[0], assigneeIds: nextIds, participantStatuses, comments: [...task.comments, log], lastUpdated };
      if (isLiveMode && dbRef.current) await updateDoc(doc(dbRef.current, 'tasks', taskId), { ...payload, lastUpdated: serverTimestamp() });
      else setTasks(previous => previous.map(item => item.id === taskId ? { ...item, ...payload } as Task : item));
      addedIds.forEach(id => createNotification(id, 'تمت إضافتك إلى مهمة', `تمت إضافتك إلى: ${updates.title || task.title}`, 'INFO', task.id));
      removedIds.forEach(id => createNotification(id, 'تمت إزالتك من مهمة', `تمت إزالتك من: ${updates.title || task.title}`, 'WARNING', task.id));
      markTaskAsRead(taskId);
  };

  const updateTaskAssignee = async (taskId: string, newAssigneeId: string) => {
      const task = getTaskById(taskId);
      if(!task) return;

      const oldAssigneeId = task.assigneeId;
      // ✅ Ensure old assignee is added to history
      const currentHistory = task.previousAssignees || [];
      const updatedPreviousAssignees = oldAssigneeId && !currentHistory.includes(oldAssigneeId)
          ? [...currentHistory, oldAssigneeId]
          : currentHistory;

      const sysComment: Comment = { id: `sys_reassign_${Date.now()}`, userId: 'system', userName: 'النظام', userAvatar: '', content: `تم تحويل المهمة إلى موظف آخر`, timestamp: new Date().toISOString(), isSystem: true };
      const lastUpdated = new Date().toISOString();

      if (isLiveMode && dbRef.current) {
          const taskRef = doc(dbRef.current, 'tasks', taskId);
          await updateDoc(taskRef, { 
              assigneeId: newAssigneeId,
              previousAssignees: updatedPreviousAssignees,
              comments: [...task.comments, sysComment],
              lastUpdated: serverTimestamp() // This triggers notification for everyone including old assignee
          });
      } else {
          setTasks(prev => prev.map(t => {
              if (t.id !== taskId) return t;
              return { ...t, assigneeId: newAssigneeId, previousAssignees: updatedPreviousAssignees, comments: [...t.comments, sysComment], lastUpdated };
          }));
      }
      
      markTaskAsRead(taskId);

      // Notify New Assignee
      createNotification(newAssigneeId, 'مهمة محولة', `تم تحويل المهمة إليك: ${task.title}`, 'INFO', task.id);
      const newAssignee = users.find(u => u.id === newAssigneeId);
      if (newAssignee) sendEmailNotification(newAssignee.email, `مهمة محولة: ${task.title}`);
      
      // Notify Old Assignee
      if (oldAssigneeId) {
          createNotification(oldAssigneeId, 'تم نقل المهمة', `تم نقل المهمة: ${task.title} لموظف آخر (محسوبة كمكتملة).`, 'INFO', task.id);
      }
  };

  const sendTaskReminder = async (taskId: string) => {
      const task = getTaskById(taskId);
      if (!task) return;
      getTaskAssigneeIds(task).forEach(id => {
        if (task.participantStatuses?.[id]?.status === 'COMPLETED') return;
        const assignee = users.find(u => u.id === id);
        if (assignee) sendEmailNotification(assignee.email, `🔔 تذكير بالمهمة: ${task.title}`, `هذا تذكير لمتابعة المهمة: ${task.title}.`);
      });
  };

  const addComment = async (taskId: string, content: string, attachments: Attachment[] = []) => {
    if (!currentUser) return;
    const newComment: Comment = { id: `c_${Date.now()}`, userId: currentUser.id, userName: currentUser.name, userAvatar: currentUser.avatar, content, timestamp: new Date().toISOString(), attachments };
    const lastUpdated = new Date().toISOString();

    if (isLiveMode && dbRef.current) {
         const taskRef = doc(dbRef.current, 'tasks', taskId);
         const task = getTaskById(taskId);
         if (task) {
             await updateDoc(taskRef, { comments: [...task.comments, newComment], lastUpdated: serverTimestamp() });
             markTaskAsRead(taskId);

             // Smart Notifications logic
             const recipients = new Set<string>();
             // كل المشاركين يشاهدون نفس المحادثة ويتلقون تحديثاتها.
             getTaskAssigneeIds(task).forEach(id => { if (id !== currentUser.id) recipients.add(id); });
             // Always notify manager/creator if I am not him
             if (task.createdBy !== currentUser.id) recipients.add(task.createdBy);
             // Notify previous assignees? Optional, but good for context. Let's stick to current active participants.

             recipients.forEach(rid => {
                 createNotification(rid, 'تعليق جديد', `أضاف ${currentUser.name} تعليقاً على: ${task.title}`, 'INFO', task.id);
                 const user = users.find(u => u.id === rid);
                 if (user) sendEmailNotification(user.email, `تعليق جديد: ${task.title}`);
             });
         }
    } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, comments: [...t.comments, newComment], lastUpdated } : t));
        markTaskAsRead(taskId);
    }
  };

  const requestTaskExtension = async (taskId: string, newDate: string, reason: string) => {
     const extensionRequest = { requestedDate: newDate, reason, status: 'PENDING', requestDate: new Date().toISOString(), requestedById: currentUser?.id, requestedByName: currentUser?.name };
     const lastUpdated = new Date().toISOString();
     if (isLiveMode && dbRef.current) {
          const taskRef = doc(dbRef.current, 'tasks', taskId);
          await updateDoc(taskRef, { extensionRequest, lastUpdated: serverTimestamp() });
     }
     markTaskAsRead(taskId);
     const task = getTaskById(taskId);
     if (task) {
         let targetManagerId = task.createdBy;
         if (!users.find(u => u.id === targetManagerId)) targetManagerId = getManagerId() || targetManagerId;
         createNotification(targetManagerId, 'طلب تمديد', `طلب تمديد للمهمة: ${task.title}`, 'WARNING', task.id);
     }
  };

  const resolveExtensionRequest = async (taskId: string, approved: boolean, finalDate?: string) => {
      const sysComment = { id: `sys_${Date.now()}`, userId: 'system', userName: 'النظام', userAvatar: '', content: approved ? `تمت الموافقة على التمديد حتى ${finalDate}` : `تم رفض التمديد`, timestamp: new Date().toISOString(), isSystem: true };
      const lastUpdated = new Date().toISOString();
      if (isLiveMode && dbRef.current) {
          const taskRef = doc(dbRef.current, 'tasks', taskId);
          const task = getTaskById(taskId);
          if (task) {
              const updates: any = { "extensionRequest.status": approved ? 'APPROVED' : 'REJECTED', comments: [...task.comments, sysComment], lastUpdated: serverTimestamp() };
              if (approved && finalDate) updates.dueDate = finalDate;
              await updateDoc(taskRef, updates);
          }
      }
      markTaskAsRead(taskId);
      const task = getTaskById(taskId);
      if (task) getTaskAssigneeIds(task).forEach(id => createNotification(id, 'رد على طلب التمديد', approved ? 'تمت الموافقة' : 'تم الرفض', approved ? 'SUCCESS' : 'WARNING', task.id));
  };

  const addUser = async (user: User) => {
    if (!currentUser || currentUser.role !== 'MANAGER') return { success: false, message: 'لا توجد صلاحية لإضافة حسابات.' };
    const safeUser: User = isSuperAdminUser(currentUser)
      ? { ...user, accessLevel: user.role === 'MANAGER' ? 'DEPARTMENT_MANAGER' : undefined }
      : { ...user, role: 'EMPLOYEE', accessLevel: undefined, department: currentUser.department, departmentId: currentUser.departmentId, managerId: currentUser.id };
    if (isLiveMode && dbRef.current && authRef.current) {
         let createdAuthUser: any = null;
         let secondaryAuth: any = null;
         try {
             const secondaryApp = getApps().find(app => app.name === 'secondary') || initializeApp(firebaseConfig, 'secondary');
             secondaryAuth = getAuth(secondaryApp);
             const userCred = await createUserWithEmailAndPassword(secondaryAuth, safeUser.email, safeUser.password || '123456');
             createdAuthUser = userCred.user;
             await setDoc(doc(dbRef.current, 'users', userCred.user.uid), { ...safeUser, id: userCred.user.uid, password: '' }); // Don't store password in plain text
             if (safeUser.role === 'MANAGER') {
                 const department = departments.find(item => item.name === safeUser.department);
                 if (department) await updateDoc(doc(dbRef.current, 'departments', department.id), { managerId: userCred.user.uid });
             }
             sendEmailNotification(safeUser.email, 'تم إنشاء حسابك', `كلمة المرور: ${safeUser.password || '123456'}`);
             return { success: true };
         } catch (error: any) {
             // Prevent an orphan Authentication account when saving the Firestore profile fails.
             if (createdAuthUser) {
                 try { await deleteAuthUser(createdAuthUser); } catch (_) {}
             }

             const messages: Record<string, string> = {
                 'auth/email-already-in-use': 'البريد الإلكتروني مسجل مسبقا في Firebase',
                 'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة',
                 'auth/weak-password': 'كلمة المرور ضعيفة ويجب ألا تقل عن 6 أحرف',
                 'auth/network-request-failed': 'تعذر الاتصال بـ Firebase، تحقق من الإنترنت وحاول مرة أخرى',
                 'permission-denied': 'لا توجد صلاحية لحفظ بيانات الموظف في Firestore'
             };
             return {
                 success: false,
                 message: messages[error?.code] || messages[error?.message] || `تعذر إنشاء الحساب (${error?.code || 'خطأ غير معروف'})`
             };
         } finally {
             if (secondaryAuth) {
                 try { await signOut(secondaryAuth); } catch (_) {}
             }
         }
    } else {
        setUsers(prev => [...prev, safeUser]);
        return { success: true };
    }
  };

  const updateUser = async (updatedUser: User) => {
    if (!currentUser || currentUser.role !== 'MANAGER') return;
    const existing = users.find(user => user.id === updatedUser.id);
    if (!isSuperAdminUser(currentUser) && (!existing || existing.department !== currentUser.department || existing.role !== 'EMPLOYEE')) return;
    const safeUpdatedUser = isSuperAdminUser(currentUser)
      ? updatedUser
      : { ...updatedUser, role: 'EMPLOYEE' as const, accessLevel: undefined, department: currentUser.department, departmentId: currentUser.departmentId, managerId: currentUser.id };
    if (isLiveMode && dbRef.current) {
        const { id, ...data } = safeUpdatedUser;
        await setDoc(doc(dbRef.current, 'users', id), data, { merge: true });
    } else {
        setUsers(prev => prev.map(u => u.id === safeUpdatedUser.id ? safeUpdatedUser : u));
    }
    if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);
  };

  const deleteUser = async (userId: string) => {
    const target = users.find(user => user.id === userId);
    if (!currentUser || currentUser.role !== 'MANAGER' || userId === currentUser.id) return;
    if (!isSuperAdminUser(currentUser) && (!target || target.role !== 'EMPLOYEE' || target.department !== currentUser.department)) return;
    if (isLiveMode && dbRef.current) await deleteDoc(doc(dbRef.current, 'users', userId));
    else setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const addDepartment = async (name: string) => {
      const cleanName = name.trim();
      if (!isSuperAdminUser(currentUser)) return { success: false, message: 'إنشاء الأقسام متاح للمدير العام فقط.' };
      if (!cleanName) return { success: false, message: 'أدخل اسم القسم.' };
      if (departments.some(department => department.name.toLowerCase() === cleanName.toLowerCase())) return { success: false, message: 'هذا القسم موجود مسبقًا.' };
      if (isLiveMode && dbRef.current) await addDoc(collection(dbRef.current, 'departments'), { name: cleanName, createdAt: serverTimestamp() });
      else setDepartments(previous => [...previous, { id: `department_${Date.now()}`, name: cleanName, createdAt: new Date().toISOString() }]);
      return { success: true, message: 'تم إنشاء القسم بنجاح.' };
  };

  const updateDepartment = async (departmentId: string, name: string) => {
      const cleanName = name.trim();
      if (!isSuperAdminUser(currentUser)) return { success: false, message: 'تعديل الأقسام متاح للمدير العام فقط.' };
      const oldDepartment = departments.find(department => department.id === departmentId);
      if (!oldDepartment || !cleanName) return { success: false, message: 'بيانات القسم غير صحيحة.' };
      if (isLiveMode && dbRef.current) {
          await updateDoc(doc(dbRef.current, 'departments', departmentId), { name: cleanName });
          await Promise.all(users.filter(user => user.department === oldDepartment.name).map(user => updateDoc(doc(dbRef.current!, 'users', user.id), { department: cleanName })));
          await Promise.all(tasks.filter(task => task.department === oldDepartment.name).map(task => updateDoc(doc(dbRef.current!, 'tasks', task.id), { department: cleanName })));
      } else {
          setDepartments(previous => previous.map(item => item.id === departmentId ? { ...item, name: cleanName } : item));
          setUsers(previous => previous.map(user => user.department === oldDepartment.name ? { ...user, department: cleanName } : user));
          setTasks(previous => previous.map(task => task.department === oldDepartment.name ? { ...task, department: cleanName } : task));
      }
      return { success: true, message: 'تم تحديث اسم القسم.' };
  };

  const deleteDepartment = async (departmentId: string) => {
      if (!isSuperAdminUser(currentUser)) return { success: false, message: 'حذف الأقسام متاح للمدير العام فقط.' };
      const department = departments.find(item => item.id === departmentId);
      if (!department) return { success: false, message: 'القسم غير موجود.' };
      if (users.some(user => user.department === department.name) || tasks.some(task => task.department === department.name)) return { success: false, message: 'انقل الموظفين والمهام من القسم قبل حذفه.' };
      if (isLiveMode && dbRef.current) await deleteDoc(doc(dbRef.current, 'departments', departmentId));
      else setDepartments(previous => previous.filter(item => item.id !== departmentId));
      return { success: true, message: 'تم حذف القسم.' };
  };

  const createConversation = async (title: string, participantIds: string[], type: ConversationType, openingMessage: string) => {
      if (!currentUser || !isSuperAdminUser(currentUser)) return { success: false, message: 'إنشاء المحادثات متاح للمدير العام فقط.' };
      const recipients = Array.from(new Set(participantIds)).filter(id => id !== currentUser.id && users.some(user => user.id === id));
      if (!title.trim() || !openingMessage.trim() || recipients.length === 0) return { success: false, message: 'اختر مستلمًا واحدًا على الأقل وأدخل عنوانًا ورسالة.' };
      const allParticipants = [currentUser.id, ...recipients];
      if (isLiveMode && dbRef.current) {
          const conversationRef = await addDoc(collection(dbRef.current, 'conversations'), {
              title: title.trim(), type, participantIds: allParticipants, createdBy: currentUser.id,
              createdAt: serverTimestamp(), lastMessage: openingMessage.trim(), lastUpdated: serverTimestamp()
          });
          await addDoc(collection(dbRef.current, 'communicationMessages'), {
              conversationId: conversationRef.id, participantIds: allParticipants, senderId: currentUser.id,
              senderName: currentUser.name, content: openingMessage.trim(), timestamp: serverTimestamp(), readBy: [currentUser.id]
          });
          await Promise.all(recipients.map(id => createNotification(id, type === 'ANNOUNCEMENT' ? 'تعميم من المدير العام' : 'رسالة جديدة من المدير العام', title.trim(), 'INFO')));
      }
      return { success: true, message: 'تم إرسال الرسالة بنجاح.' };
  };

  const sendCommunicationMessage = async (conversationId: string, content: string) => {
      const conversation = conversations.find(item => item.id === conversationId);
      if (!currentUser || !conversation || !conversation.participantIds.includes(currentUser.id)) return { success: false, message: 'لا توجد صلاحية لهذه المحادثة.' };
      if (!content.trim()) return { success: false, message: 'اكتب الرسالة أولًا.' };
      if (isLiveMode && dbRef.current) {
          await addDoc(collection(dbRef.current, 'communicationMessages'), {
              conversationId, participantIds: conversation.participantIds, senderId: currentUser.id,
              senderName: currentUser.name, content: content.trim(), timestamp: serverTimestamp(), readBy: [currentUser.id]
          });
          await updateDoc(doc(dbRef.current, 'conversations', conversationId), { lastMessage: content.trim(), lastUpdated: serverTimestamp() });
          await Promise.all(conversation.participantIds.filter(id => id !== currentUser.id).map(id => createNotification(id, `رسالة جديدة من ${currentUser.name}`, conversation.title, 'INFO')));
      }
      return { success: true, message: 'تم الإرسال.' };
  };

  const markConversationRead = async (conversationId: string) => {
      if (!currentUser || !isLiveMode || !dbRef.current) return;
      const unread = communicationMessages.filter(message => message.conversationId === conversationId && !message.readBy?.includes(currentUser.id));
      await Promise.all(unread.map(message => updateDoc(doc(dbRef.current!, 'communicationMessages', message.id), { readBy: arrayUnion(currentUser.id) })));
  };

  const markNotificationAsRead = async (id: string) => {
    if (isLiveMode && dbRef.current) await updateDoc(doc(dbRef.current, 'notifications', id), { read: true });
    else setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = async () => {
      if (!currentUser) return;
      if (isLiveMode && dbRef.current) {
          const myUnread = notifications.filter(n => n.userId === currentUser.id && !n.read);
          await Promise.all(myUnread.map(n => updateDoc(doc(dbRef.current, 'notifications', n.id), { read: true })));
      } else {
          setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, read: true } : n));
      }
  };

  const toggleLeaderboardVisibility = (show: boolean) => setShowLeaderboard(show);

  return (
    <TaskContext.Provider value={{ 
        tasks, users, departments, conversations, communicationMessages, currentUser, notifications, showLeaderboard, isLiveMode, taskReadStatus,
        login, loginWithCredentials, recoverPassword, changePassword, logout,
        addTask, updateTaskStatus, resolveParticipantCompletion, resolveParticipantReopen, updateTaskDetails, addComment, getTaskById, deleteTask, updateTaskAssignee,
        addUser, updateUser, deleteUser, addDepartment, updateDepartment, deleteDepartment, createConversation, sendCommunicationMessage, markConversationRead, sendTaskReminder,
        markNotificationAsRead, markAllNotificationsAsRead, markTaskAsRead,
        sendEmailNotification, simulateEmail, requestTaskExtension, resolveExtensionRequest,
        toggleLeaderboardVisibility, calculateTimeRemaining
    }}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (!context) throw new Error("useTaskContext must be used within a TaskProvider");
  return context;
};
