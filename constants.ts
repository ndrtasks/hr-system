
import { User, Task, Comment } from './types';

export const USERS: User[] = [
  {
    id: 'u1',
    name: 'مدير النظام',
    email: 'ndrtasks@gmail.com',
    role: 'MANAGER',
    avatar: 'https://i.pravatar.cc/150?u=u1',
    department: 'الإدارة العامة'
  },
  {
    id: 'u2',
    name: 'نادر النادر',
    email: 'nader@company.com',
    role: 'EMPLOYEE',
    avatar: 'https://i.pravatar.cc/150?u=u2',
    department: 'الموارد البشرية'
  },
  {
    id: 'u3',
    name: 'سارة محمد',
    email: 'sara@company.com',
    role: 'EMPLOYEE',
    avatar: 'https://i.pravatar.cc/150?u=u3',
    department: 'التصميم'
  },
  {
    id: 'u4',
    name: 'خالد أحمد',
    email: 'khaled@company.com',
    role: 'EMPLOYEE',
    avatar: 'https://i.pravatar.cc/150?u=u4',
    department: 'التطوير'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 't1',
    title: 'تسليم الحضور والانصراف لشهر أكتوبر',
    description: 'يجب مراجعة سجلات البصمة ومطابقتها مع الإجازات المرضية والسنوية قبل إرسالها للمالية.',
    priority: 'HIGH',
    status: 'NEW',
    dueDate: '2025-10-30',
    assigneeId: 'u3',
    createdBy: 'u1',
    department: 'الموارد البشرية',
    isRecurring: true,
    comments: []
  },
  {
    id: 't2',
    title: 'تصميم لوجو للشركة وهوية تجارية',
    description: 'تصميم شعار جديد يعكس رؤية الشركة لعام 2030 مع دليل استخدام الهوية.',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    dueDate: '2025-11-05',
    assigneeId: 'u4',
    createdBy: 'u1',
    department: 'التصميم',
    isRecurring: false,
    comments: [
      {
        id: 'c1',
        userId: 'u1',
        userName: 'مدير النظام',
        userAvatar: 'https://i.pravatar.cc/150?u=u1',
        content: 'تأكد من استخدام ألوان الشركة الرسمية',
        timestamp: new Date(Date.now() - 86400000).toISOString()
      }
    ]
  },
  {
    id: 't3',
    title: 'تجربة الإشعارات',
    description: 'اختبار نظام الإشعارات الجديد للتأكد من وصول التنبيهات للموظفين.',
    priority: 'LOW',
    status: 'PENDING_REVIEW',
    dueDate: '2025-10-25',
    assigneeId: 'u2',
    createdBy: 'u1',
    department: 'IT',
    isRecurring: false,
    comments: [
      {
        id: 'c2',
        userId: 'u2',
        userName: 'نادر النادر',
        userAvatar: 'https://i.pravatar.cc/150?u=u2',
        content: 'تم الانتهاء من الاختبار، بانتظار الاعتماد',
        timestamp: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  },
   {
    id: 't4',
    title: 'الوصف الوظيفي',
    description: 'تحديث الوصف الوظيفي لقسم المبيعات.',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    dueDate: '2025-10-20',
    assigneeId: 'u3',
    createdBy: 'u1',
    department: 'الموارد البشرية',
    isRecurring: false,
    comments: []
  }
];

export const PRIORITY_COLORS = {
  LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  HIGH: 'bg-red-500/10 text-red-400 border-red-500/20'
};

export const STATUS_LABELS = {
  NEW: 'جديدة',
  IN_PROGRESS: 'قيد التنفيذ',
  PENDING_REVIEW: 'بانتظار الاعتماد',
  COMPLETED: 'مكتملة',
  LATE: 'متأخرة'
};

export const STATUS_COLORS = {
  NEW: 'bg-blue-500',
  IN_PROGRESS: 'bg-indigo-500',
  PENDING_REVIEW: 'bg-orange-500',
  COMPLETED: 'bg-green-500',
  LATE: 'bg-red-500'
};
