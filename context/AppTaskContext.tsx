

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { Task, User, Comment, Status, Notification, Attachment, Role, getTaskAssigneeIds } from '../types';
import { INITIAL_TASKS, USERS } from '../constants';
import { firebaseConfig, emailJSConfig } from '../firebaseConfig';

// Firebase Imports
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail, deleteUser as deleteAuthUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDoc, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, query, where, Unsubscribe } from 'firebase/firestore';

// Google Gemini API
import { GoogleGenAI } from "@google/genai";

// EmailJS
import emailjs from '@emailjs/browser';

// ---------------------------------------------------------------------------
// 🛑 إعدادات المدير المالك (Super Admin)
const ADMIN_KEYWORD = "ndrtasks"; 
// ---------------------------------------------------------------------------

// 🛑 مفتاح الذكاء الاصطناعي (Gemini)
const GEMINI_API_KEY = ""; 
// ---------------------------------------------------------------------------

interface TimeRemaining {
    days: number;
    hours: number;
    isLate: boolean;
    label: string;
    severity: 'SAFE' | 'WARNING' | 'CRITICAL' | 'LATE';
}

interface TaskContextType {
  tasks: Task[];
  users: User[];
  currentUser: User | null;
  notifications: Notification[];
  showLeaderboard: boolean;
  isLiveMode: boolean;
  taskReadStatus: Record<string, string>;
  login: (userId: string) => void;
  loginWithCredentials: (email: string, pass: string, requiredRole?: Role) => Promise<{ success: boolean; message?: string }>;
  recoverPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  addTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: Status) => void;
  resolveParticipantCompletion: (taskId: string, participantId: string, approved: boolean) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateTaskAssignee: (taskId: string, newAssigneeId: string) => Promise<void>;
  sendTaskReminder: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, attachments?: Attachment[]) => void;
  getTaskById: (id: string) => Task | undefined;
  addUser: (user: User) => Promise<{ success: boolean; message?: string }>;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  markTaskAsRead: (taskId: string) => void;
  sendEmailNotification: (toEmail: string, subject: string, messageBody?: string) => void;
  requestTaskExtension: (taskId: string, newDate: string, reason: string) => void;
  resolveExtensionRequest: (taskId: string, approved: boolean, finalDate?: string) => void;
  toggleLeaderboardVisibility: (show: boolean) => void;
  calculateTimeRemaining: (dueDate: string) => TimeRemaining;
  generateAIResponse: (type: 'PLAN' | 'IMPROVE' | 'EMAIL', title: string, description: string, assigneeName?: string) => Promise<string>;
  simulateEmail: (toEmail: string, subject: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [users, setUsers] = useState<User[]>(USERS);
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
            const usersSource = isManager
              ? collection(db, 'users')
              : query(collection(db, 'users'), where('department', '==', profile.department));
            const tasksSource = isManager
              ? collection(db, 'tasks')
              : query(collection(db, 'tasks'), where('assigneeIds', 'array-contains', profile.id));
            const notificationsSource = query(collection(db, 'notifications'), where('userId', '==', profile.id));

            const unsubUsers = onSnapshot(usersSource, (snapshot) => {
              const fetchedUsers = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as User));
              setUsers(fetchedUsers.length ? fetchedUsers : [profile]);
            }, error => {
              console.warn('تعذر تحميل أعضاء القسم', error);
              setUsers([profile]);
            });

            const unsubTasks = onSnapshot(tasksSource, (snapshot) => {
             const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
             // STRICT SORTING
             fetchedTasks.sort((a, b) => {
                 const dateA = new Date(a.lastUpdated || 0).getTime();
                 const dateB = new Date(b.lastUpdated || 0).getTime();
                 return dateB - dateA;
             });
             setTasks(fetchedTasks);
            }, error => console.error('تعذر تحميل مهام المستخدم', error));

            const unsubNotifications = onSnapshot(notificationsSource, (snapshot) => {
             const fetchedNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
             fetchedNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
             setNotifications(fetchedNotifs);
            }, error => console.warn('تعذر تحميل الإشعارات', error));

            dataUnsubscribersRef.current = [unsubUsers, unsubTasks, unsubNotifications];
          };

          onAuthStateChanged(auth, async (firebaseUser) => {
             if (firebaseUser) {
               if (firebaseUser.email?.toLowerCase().includes(ADMIN_KEYWORD.toLowerCase()) || firebaseUser.email?.toLowerCase().includes('admin')) {
                   const adminUser: User = {
                        id: firebaseUser.uid,
                        name: 'مدير النظام',
                        email: firebaseUser.email!,
                        role: 'MANAGER',
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
                           const profile = { id: docSnap.id, ...docSnap.data() } as User;
                           setCurrentUser(profile);
                           subscribeToUserData(profile);
                       } else {
                           const tempUser: User = {
                               id: firebaseUser.uid,
                               name: firebaseUser.email?.split('@')[0] || 'المستخدم',
                               email: firebaseUser.email || '',
                               role: 'EMPLOYEE',
                               avatar: `https://ui-avatars.com/api/?name=${firebaseUser.email?.charAt(0)}`,
                               department: 'عام'
                           };
                           await setDoc(doc(db, 'users', firebaseUser.uid), tempUser);
                           setCurrentUser(tempUser);
                           subscribeToUserData(tempUser);
                       }
                   } catch (e) {
                       const fallbackProfile: User = {
                           id: firebaseUser.uid,
                           name: firebaseUser.email?.split('@')[0] || 'المستخدم',
                           email: firebaseUser.email || '',
                           role: 'EMPLOYEE',
                           avatar: `https://ui-avatars.com/api/?name=${firebaseUser.email?.charAt(0)}`,
                           department: 'عام'
                       };
                       setCurrentUser(fallbackProfile);
                       subscribeToUserData(fallbackProfile);
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

  const generateAIResponse = async (type: 'PLAN' | 'IMPROVE' | 'EMAIL', title: string, description: string, assigneeName: string = 'الموظف'): Promise<string> => {
    const apiKey = GEMINI_API_KEY || firebaseConfig.apiKey; 
    if (!apiKey) return "عذراً، لم يتم تكوين مفتاح Gemini API.";

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      let prompt = '';
      if (type === 'PLAN') prompt = `بصفتك خبير إدارة مهام، قم بإنشاء "خطة تنفيذية" للمهمة: ${title} - ${description}. المطلوب: قائمة نقاط (Checklist) باللغة العربية.`;
      else if (type === 'IMPROVE') prompt = `أعد صياغة وصف المهمة التالية ليكون احترافياً: ${title} - ${description}`;
      else if (type === 'EMAIL') prompt = `اكتب مسودة بريد إلكتروني رسمي للموظف "${assigneeName}" بخصوص المهمة: ${title}.`;

      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      return response.text || "لم يتمكن النظام من توليد النص.";
    } catch (error) { return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي."; }
  };

  const login = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) setCurrentUser(user);
  };

  const loginWithCredentials = async (email: string, pass: string, requiredRole?: Role): Promise<{ success: boolean; message?: string }> => {
    if (isLiveMode && authRef.current) {
      try {
        await signInWithEmailAndPassword(authRef.current, email, pass);
        return { success: true };
      } catch (error: any) {
        if (error.code === 'auth/user-not-found' && (email.toLowerCase().includes(ADMIN_KEYWORD.toLowerCase()) || email.toLowerCase().includes('admin'))) {
            try {
                const newUserCred = await createUserWithEmailAndPassword(authRef.current, email, pass);
                const adminUser: User = {
                    id: newUserCred.user.uid,
                    name: 'مدير النظام',
                    email: email,
                    role: 'MANAGER',
                    avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff',
                    department: 'الإدارة العليا'
                };
                await setDoc(doc(dbRef.current, 'users', newUserCred.user.uid), adminUser);
                setCurrentUser(adminUser);
                return { success: true };
            } catch (createError: any) { return { success: false, message: 'فشل إنشاء حساب المدير' }; }
        }
        return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
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
    const lastUpdated = new Date().toISOString();
    if (isLiveMode && dbRef.current) {
        const { id, ...taskData } = task; 
        await addDoc(collection(dbRef.current, 'tasks'), { ...taskData, lastUpdated });
    } else {
        setTasks(prev => [task, ...prev]);
    }
    markTaskAsRead(task.id);
    getTaskAssigneeIds(task).forEach(assigneeId => {
      createNotification(assigneeId, 'مهمة جديدة', `مهمة جديدة: ${task.title}`, 'INFO', task.id);
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
      const participantStatuses = {
        ...(task.participantStatuses || {}),
        [currentUser.id]: {
          status: status === 'COMPLETED' ? 'PENDING_APPROVAL' as const : 'IN_PROGRESS' as const
        }
      };
      const allSubmitted = getTaskAssigneeIds(task).every(id => ['PENDING_APPROVAL', 'COMPLETED'].includes(participantStatuses[id]?.status));
      const taskStatus: Status = allSubmitted ? 'PENDING_REVIEW' : 'IN_PROGRESS';
      const personalLog: Comment = { ...statusLog, content: status === 'COMPLETED' ? `أرسل ${currentUser.name} إنجازه لاعتماد المدير` : `أعاد ${currentUser.name} فتح الجزء الخاص به` };
      const updates = { participantStatuses, status: taskStatus, comments: [...task.comments, personalLog], lastUpdated };
      if (isLiveMode && dbRef.current) await updateDoc(doc(dbRef.current, 'tasks', taskId), updates);
      else setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      if (status === 'COMPLETED' && task.createdBy !== currentUser.id) {
        createNotification(task.createdBy, 'إنجاز مشارك', `أكمل ${currentUser.name} دوره في: ${task.title}`, 'SUCCESS', task.id);
      }
      markTaskAsRead(taskId);
      return;
    }

    if (isLiveMode && dbRef.current) {
        const taskRef = doc(dbRef.current, 'tasks', taskId);
        await updateDoc(taskRef, { status, comments: [...(getTaskById(taskId)?.comments || []), statusLog], lastUpdated });
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
      if (isLiveMode && dbRef.current) await updateDoc(doc(dbRef.current, 'tasks', taskId), updates);
      else setTasks(previous => previous.map(item => item.id === taskId ? { ...item, ...updates } : item));
      createNotification(participantId, approved ? 'تم اعتماد إنجازك' : 'تمت إعادة المهمة', approved ? `اعتمد المدير دورك في: ${task.title}` : `أعاد المدير دورك للتنفيذ في: ${task.title}`, approved ? 'SUCCESS' : 'WARNING', task.id);
      markTaskAsRead(taskId);
  };

  const deleteTask = async (taskId: string) => {
      if (isLiveMode && dbRef.current) {
          await deleteDoc(doc(dbRef.current, 'tasks', taskId));
      } else {
          setTasks(prev => prev.filter(t => t.id !== taskId));
      }
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
              lastUpdated // This triggers notification for everyone including old assignee
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
             await updateDoc(taskRef, { comments: [...task.comments, newComment], lastUpdated });
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
          await updateDoc(taskRef, { extensionRequest, lastUpdated });
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
              const updates: any = { "extensionRequest.status": approved ? 'APPROVED' : 'REJECTED', comments: [...task.comments, sysComment], lastUpdated };
              if (approved && finalDate) updates.dueDate = finalDate;
              await updateDoc(taskRef, updates);
          }
      }
      markTaskAsRead(taskId);
      const task = getTaskById(taskId);
      if (task) getTaskAssigneeIds(task).forEach(id => createNotification(id, 'رد على طلب التمديد', approved ? 'تمت الموافقة' : 'تم الرفض', approved ? 'SUCCESS' : 'WARNING', task.id));
  };

  const addUser = async (user: User) => {
    if (isLiveMode && dbRef.current && authRef.current) {
         let createdAuthUser: any = null;
         let secondaryAuth: any = null;
         try {
             const secondaryApp = getApps().find(app => app.name === 'secondary') || initializeApp(firebaseConfig, 'secondary');
             secondaryAuth = getAuth(secondaryApp);
             const userCred = await createUserWithEmailAndPassword(secondaryAuth, user.email, user.password || '123456');
             createdAuthUser = userCred.user;
             await setDoc(doc(dbRef.current, 'users', userCred.user.uid), { ...user, id: userCred.user.uid, password: '' }); // Don't store password in plain text
             sendEmailNotification(user.email, 'تم إنشاء حسابك', `كلمة المرور: ${user.password || '123456'}`);
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
        setUsers(prev => [...prev, user]);
        return { success: true };
    }
  };

  const updateUser = async (updatedUser: User) => {
    if (isLiveMode && dbRef.current) {
        const { id, ...data } = updatedUser;
        await setDoc(doc(dbRef.current, 'users', id), data, { merge: true });
    } else {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    }
    if (currentUser?.id === updatedUser.id) setCurrentUser(updatedUser);
  };

  const deleteUser = async (userId: string) => {
    if (isLiveMode && dbRef.current) await deleteDoc(doc(dbRef.current, 'users', userId));
    else setUsers(prev => prev.filter(u => u.id !== userId));
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
        tasks, users, currentUser, notifications, showLeaderboard, isLiveMode, taskReadStatus,
        login, loginWithCredentials, recoverPassword, logout, 
        addTask, updateTaskStatus, resolveParticipantCompletion, addComment, getTaskById, deleteTask, updateTaskAssignee,
        addUser, updateUser, deleteUser, sendTaskReminder,
        markNotificationAsRead, markAllNotificationsAsRead, markTaskAsRead,
        sendEmailNotification, simulateEmail, requestTaskExtension, resolveExtensionRequest,
        toggleLeaderboardVisibility, calculateTimeRemaining,
        generateAIResponse 
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
