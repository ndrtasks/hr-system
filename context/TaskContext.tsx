
import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { Task, User, Comment, Status, Notification, Attachment, Role } from '../types';
import { INITIAL_TASKS, USERS } from '../constants';
import { firebaseConfig, emailJSConfig } from '../firebaseConfig';

// Google Gemini API
import { GoogleGenAI } from "@google/genai";

// Firebase Imports (Dynamic loading handled via importmap, but typed here for clarity)
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';

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
  isLiveMode: boolean; // Indicator for Live vs Demo
  login: (userId: string) => void;
  loginWithCredentials: (email: string, pass: string, requiredRole?: Role) => Promise<{ success: boolean; message?: string }>;
  recoverPassword: (email: string) => { success: boolean; message: string };
  logout: () => void;
  addTask: (task: Task) => void;
  updateTaskStatus: (taskId: string, status: Status) => void;
  addComment: (taskId: string, content: string, attachments?: Attachment[]) => void;
  getTaskById: (id: string) => Task | undefined;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  simulateEmail: (toEmail: string, subject: string) => void;
  requestTaskExtension: (taskId: string, newDate: string, reason: string) => void;
  resolveExtensionRequest: (taskId: string, approved: boolean, finalDate?: string) => void;
  toggleLeaderboardVisibility: (show: boolean) => void;
  calculateTimeRemaining: (dueDate: string) => TimeRemaining;
  generateTaskPlan: (title: string, description: string) => Promise<string>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [users, setUsers] = useState<User[]>(USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  
  // System Mode
  const [isLiveMode, setIsLiveMode] = useState(false);
  
  // Firebase Refs
  const dbRef = useRef<any>(null);
  const authRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  // Initialize Firebase
  useEffect(() => {
    const initFirebase = async () => {
      if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
        try {
          console.log("🔥 Initializing Firebase...");
          const app = initializeApp(firebaseConfig);
          const db = getFirestore(app);
          const auth = getAuth(app);
          
          dbRef.current = db;
          authRef.current = auth;
          setIsLiveMode(true);

          // 1. Sync Users
          const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
             const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
             if (fetchedUsers.length > 0) setUsers(fetchedUsers);
          });

          // 2. Sync Tasks
          const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
             const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
             setTasks(fetchedTasks);
          });

          // 3. Sync Auth State
          onAuthStateChanged(auth, async (firebaseUser) => {
             if (firebaseUser) {
               // Try finding in current state
               let foundUser = users.find(u => u.email.toLowerCase() === firebaseUser.email?.toLowerCase());
               
               // If not in state, maybe state hasn't synced yet, try fetching doc directly
               if (!foundUser) {
                   const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
                   if (docSnap.exists()) {
                       foundUser = { id: docSnap.id, ...docSnap.data() } as User;
                   }
               }

               if (foundUser) setCurrentUser(foundUser);
             } else {
               setCurrentUser(null);
             }
          });

          return () => {
            unsubUsers();
            unsubTasks();
          };

        } catch (error) {
          console.error("Firebase Initialization Error:", error);
          setIsLiveMode(false); // Fallback to local
        }
      } else {
        console.log("⚠️ Running in Local Demo Mode (No Firebase Config found)");
        setIsLiveMode(false);
      }
    };

    initFirebase();
  }, []); // Empty dependency array meant to run once on mount, but safe to re-run if logic changes

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(e => console.log('Audio play failed', e));
    }
  };

  const simulateEmail = (toEmail: string, subject: string) => {
    if (isLiveMode && emailJSConfig.serviceId !== "") {
      // Here we would implement EmailJS call
      console.log(`📧 Real Email via EmailJS to [${toEmail}]: ${subject}`);
    } else {
      console.log(`📧 Simulated EMAIL to [${toEmail}]: ${subject}`);
    }
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

  // --- Gemini AI Integration ---
  const generateTaskPlan = async (title: string, description: string): Promise<string> => {
    if (!process.env.API_KEY) {
      return "عذراً، مفتاح Gemini API غير متوفر في البيئة الحالية.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        بصفتك مساعد موارد بشرية وخبير إدارة مشاريع ذكي، قم بتحليل المهمة التالية:
        العنوان: ${title}
        التفاصيل: ${description}

        المطلوب: "اعد لي الخطوات".
        الرجاء إنشاء خطة تنفيذية دقيقة ومباشرة على شكل قائمة مهام (Checklist) قابلة للتنفيذ.
        استخدم تنسيق Markdown للقائمة.
        تجنب المقدمات والخواتم الطويلة، وركز على الخطوات العملية فقط.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || "لم يتمكن النظام من توليد خطوات.";
    } catch (error) {
      console.error("Gemini AI Error:", error);
      return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. يرجى المحاولة لاحقاً.";
    }
  };

  // --- Actions (Hybrid Logic) ---

  const login = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) setCurrentUser(user);
  };

  const loginWithCredentials = async (email: string, pass: string, requiredRole?: Role): Promise<{ success: boolean; message?: string }> => {
    
    // LIVE MODE
    if (isLiveMode && authRef.current) {
      try {
        const userCredential = await signInWithEmailAndPassword(authRef.current, email, pass);
        const userEmail = userCredential.user.email;
        
        // Find user details in Firestore
        // Use state first
        let user = users.find(u => u.email.toLowerCase() === userEmail?.toLowerCase());
        
        // BOOTSTRAP: If user is authenticated but no profile exists, create Admin profile automatically
        // This solves the issue of the very first login after creating FB project
        if (!user && dbRef.current) {
            // Check if this is the first ever user or matches specific admin email
            // For simplicity in this tool, if the user authenticates successfully but has no doc, we treat them as Manager (First Setup)
            // Or explicitly check email
            const isFirstUser = users.length === 0; // Rough check (snapshot might be delayed though)
            const isAdminEmail = email.toLowerCase().includes('ndrtasks') || email.toLowerCase().includes('admin') || email.toLowerCase().includes('manager');
            
            if (isAdminEmail || isFirstUser) {
                console.log("🚀 Bootstrapping First Admin User...");
                const newManager: User = {
                    id: userCredential.user.uid,
                    name: 'مدير النظام',
                    email: email,
                    role: 'MANAGER',
                    avatar: `https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff`,
                    department: 'الإدارة العليا'
                };
                
                await setDoc(doc(dbRef.current, 'users', newManager.id), newManager);
                user = newManager;
                
                // Immediately update local state just in case
                setCurrentUser(newManager);
                return { success: true };
            }
        }
        
        if (!user) {
            await signOut(authRef.current);
            return { success: false, message: 'المستخدم غير موجود في قاعدة البيانات (يرجى مراجعة المدير لإضافة حسابك)' };
        }

        if (requiredRole && user.role !== requiredRole) {
             await signOut(authRef.current);
             return { success: false, message: 'ليس لديك صلاحية الدخول لهذه البوابة' };
        }
        
        setCurrentUser(user);
        return { success: true };
      } catch (error: any) {
        console.error("Login Error:", error);
        return { success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
      }
    } 
    
    // DEMO MODE
    else {
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (!user) return { success: false, message: 'البريد الإلكتروني غير مسجل' };
        
        if (requiredRole && user.role !== requiredRole) {
            return { success: false, message: 'ليس لديك صلاحية الدخول لهذه البوابة' };
        }

        if (user.password === pass || (!user.password && pass === '123456')) {
            setCurrentUser(user);
            return { success: true };
        }
        return { success: false, message: 'كلمة المرور غير صحيحة' };
    }
  };

  const logout = async () => {
    if (isLiveMode && authRef.current) {
        await signOut(authRef.current);
    }
    setCurrentUser(null);
  };

  const recoverPassword = (email: string) => {
      // In Live Mode, we would use sendPasswordResetEmail(auth, email)
      simulateEmail(email, 'إعادة تعيين كلمة المرور');
      return { success: true, message: `تم إرسال التعليمات إلى ${email}` };
  };

  const createNotification = (userId: string, title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING', taskId?: string) => {
    const newNotif: Notification = {
      id: `n_${Date.now()}`,
      userId,
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      taskId
    };
    
    // In Live Mode, we would addDoc to 'notifications' collection
    setNotifications(prev => [newNotif, ...prev]);
    if (currentUser && currentUser.id === userId) playSound();
  };

  const addTask = async (task: Task) => {
    if (isLiveMode && dbRef.current) {
        // Firestore Auto-ID
        const { id, ...taskData } = task; 
        await addDoc(collection(dbRef.current, 'tasks'), taskData);
    } else {
        setTasks(prev => [task, ...prev]);
    }
    
    // Notifications logic remains similar (should be server-side functions in production, but client-side is ok for now)
    createNotification(task.assigneeId, 'مهمة جديدة', `مهمة جديدة: ${task.title}`, 'INFO', task.id);
    const assignee = users.find(u => u.id === task.assigneeId);
    if (assignee) simulateEmail(assignee.email, `مهمة جديدة: ${task.title}`);
  };

  const updateTaskStatus = async (taskId: string, status: Status) => {
    const statusLog: Comment = {
        id: `sys_${Date.now()}`,
        userId: 'system',
        userName: 'النظام',
        userAvatar: '',
        content: `تم تغيير الحالة إلى ${status}`,
        timestamp: new Date().toISOString(),
        isSystem: true
    };

    if (isLiveMode && dbRef.current) {
        const taskRef = doc(dbRef.current, 'tasks', taskId);
        const task = tasks.find(t => t.id === taskId);
        if (task) {
             await updateDoc(taskRef, {
                 status: status,
                 comments: [...task.comments, statusLog]
             });
        }
    } else {
        setTasks(prev => prev.map(t => {
            if (t.id !== taskId) return t;
            return { ...t, status, comments: [...t.comments, statusLog] };
        }));
    }
    
    // Notifications
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        if (status === 'COMPLETED' && task.createdBy !== currentUser?.id) {
             createNotification(task.createdBy, 'إنجاز مهمة', `أكمل ${currentUser?.name} المهمة: ${task.title}`, 'SUCCESS', task.id);
        }
    }
  };

  const addComment = async (taskId: string, content: string, attachments: Attachment[] = []) => {
    if (!currentUser) return;
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      content,
      timestamp: new Date().toISOString(),
      attachments
    };

    if (isLiveMode && dbRef.current) {
         const taskRef = doc(dbRef.current, 'tasks', taskId);
         const task = tasks.find(t => t.id === taskId);
         if (task) {
             await updateDoc(taskRef, {
                 comments: [...task.comments, newComment]
             });
         }
    } else {
        setTasks(prev => prev.map(t => {
            if (t.id === taskId) return { ...t, comments: [...t.comments, newComment] };
            return t;
        }));
    }
  };

  // Extension Logic
  const requestTaskExtension = async (taskId: string, newDate: string, reason: string) => {
     const extensionRequest = {
          requestedDate: newDate,
          reason,
          status: 'PENDING',
          requestDate: new Date().toISOString()
      };

     if (isLiveMode && dbRef.current) {
          const taskRef = doc(dbRef.current, 'tasks', taskId);
          await updateDoc(taskRef, { extensionRequest });
     } else {
          setTasks(prev => prev.map(t => {
              if (t.id !== taskId) return t;
              return { ...t, extensionRequest: extensionRequest as any };
          }));
     }
     // Notify Manager logic...
  };

  const resolveExtensionRequest = async (taskId: string, approved: boolean, finalDate?: string) => {
      const sysComment = {
          id: `sys_${Date.now()}`,
          userId: 'system',
          userName: 'النظام',
          userAvatar: '',
          content: approved ? `تمت الموافقة على التمديد حتى ${finalDate}` : `تم رفض التمديد`,
          timestamp: new Date().toISOString(),
          isSystem: true
      };

      if (isLiveMode && dbRef.current) {
          const taskRef = doc(dbRef.current, 'tasks', taskId);
          const task = tasks.find(t => t.id === taskId);
          if (task) {
              const updates: any = {
                  "extensionRequest.status": approved ? 'APPROVED' : 'REJECTED',
                  comments: [...task.comments, sysComment]
              };
              if (approved && finalDate) updates.dueDate = finalDate;
              await updateDoc(taskRef, updates);
          }
      } else {
          setTasks(prev => prev.map(t => {
              if (t.id !== taskId) return t;
              let updated = { ...t, extensionRequest: { ...t.extensionRequest!, status: approved ? 'APPROVED' : 'REJECTED' } };
              updated.comments = [...updated.comments, sysComment];
              if (approved && finalDate) updated.dueDate = finalDate;
              return updated as Task;
          }));
      }
  };

  // User Management
  const addUser = async (user: User) => {
    if (isLiveMode && dbRef.current && authRef.current) {
         // In a real app, we would create a Cloud Function to create Auth user + Firestore doc
         // Here we simulate by just adding to Firestore (User won't be able to login for real without Auth creation)
         // To make this fully work, you'd typically use a secondary Admin SDK or create the auth user here:
         try {
             // NOTE: This logs out the current user to create the new one (Client SDK limitation)
             // In a real production app, use a backend endpoint.
             // For this prototype, we will just save to Firestore.
             const { id, ...userData } = user;
             await setDoc(doc(dbRef.current, 'users', id), userData);
         } catch (e) {
             console.error("Error adding user", e);
         }
    } else {
        setUsers(prev => [...prev, user]);
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
    if (isLiveMode && dbRef.current) {
        await deleteDoc(doc(dbRef.current, 'users', userId));
    } else {
        setUsers(prev => prev.filter(u => u.id !== userId));
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
      if (!currentUser) return;
      setNotifications(prev => prev.map(n => n.userId === currentUser.id ? { ...n, read: true } : n));
  };

  const toggleLeaderboardVisibility = (show: boolean) => {
      setShowLeaderboard(show);
      // In live mode, save this setting to a 'settings' collection
  };

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  return (
    <TaskContext.Provider value={{ 
        tasks, users, currentUser, notifications, showLeaderboard, isLiveMode,
        login, loginWithCredentials, recoverPassword, logout, 
        addTask, updateTaskStatus, addComment, getTaskById,
        addUser, updateUser, deleteUser,
        markNotificationAsRead, markAllNotificationsAsRead,
        simulateEmail, requestTaskExtension, resolveExtensionRequest,
        toggleLeaderboardVisibility, calculateTimeRemaining,
        generateTaskPlan
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
