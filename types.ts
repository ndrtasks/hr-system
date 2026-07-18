
export type Role = 'MANAGER' | 'EMPLOYEE';
export type AccessLevel = 'SUPER_ADMIN' | 'DEPARTMENT_MANAGER';
export type LoginPortal = 'SUPER_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export interface Department {
  id: string;
  name: string;
  managerId?: string;
  managerName?: string;
  managerJobTitle?: string;
  createdAt?: any;
}

export type ConversationType = 'DIRECT' | 'GROUP' | 'ANNOUNCEMENT';

export interface Conversation {
  id: string;
  title: string;
  type: ConversationType;
  participantIds: string[];
  createdBy: string;
  createdAt: any;
  lastMessage?: string;
  lastUpdated: any;
}

export interface CommunicationMessage {
  id: string;
  conversationId: string;
  participantIds: string[];
  senderId: string;
  senderName: string;
  content: string;
  timestamp: any;
  readBy: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  accessLevel?: AccessLevel;
  avatar: string;
  department: string;
  departmentId?: string;
  managerId?: string;
  jobTitle?: string;
}

export const isManagerUser = (user?: User | null) => user?.role === 'MANAGER';
export const isSuperAdminUser = (user?: User | null) => user?.role === 'MANAGER' && user?.accessLevel === 'SUPER_ADMIN';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type Status = 'NEW' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'LATE';
export type ParticipantStatus = 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'PENDING_REOPEN' | 'COMPLETED';

export interface ParticipantProgress {
  status: ParticipantStatus;
  completedAt?: string;
  approvedById?: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'IMAGE' | 'FILE';
  size: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: string;
  isSystem?: boolean;
  attachments?: Attachment[];
}

export interface ExtensionRequest {
  requestedDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestDate: string;
  requestedById?: string;
  requestedByName?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  assigneeId: string;
  assigneeIds?: string[];
  participantStatuses?: Record<string, ParticipantProgress>;
  createdBy: string;
  department: string;
  departments?: string[];
  comments: Comment[];
  attachments?: Attachment[];
  isRecurring: boolean;
  extensionRequest?: ExtensionRequest;
  lastUpdated?: any; // وقت آخر نشاط؛ يحفظه خادم Firestore في الوضع المباشر
  previousAssignees?: string[]; // قائمة الموظفين السابقين الذين استلموا المهمة
}

export const getTaskAssigneeIds = (task: Task): string[] => {
  if (task.assigneeIds?.length) return task.assigneeIds;
  return task.assigneeId ? [task.assigneeId] : [];
};

export const getParticipantStatus = (task: Task, userId: string): ParticipantStatus => {
  // إغلاق المدير للمهمة يعني اكتمالها لجميع المشاركين.
  if (task.status === 'COMPLETED') return 'COMPLETED';
  const saved = task.participantStatuses?.[userId]?.status;
  // توافق انتقالي: الإنجازات المسجلة قبل إضافة اعتماد المدير تعامل كطلبات اعتماد.
  if (saved === 'COMPLETED' && !task.participantStatuses?.[userId]?.approvedById) return 'PENDING_APPROVAL';
  if (saved) return saved;
  return 'IN_PROGRESS';
};

export const getTaskLastActivityTime = (task: Task): number => {
  const serverTime = task.lastUpdated?.toMillis?.() ?? (task.lastUpdated?.seconds ? task.lastUpdated.seconds * 1000 : 0);
  if (serverTime) return serverTime;
  const timestamps = [
    task.lastUpdated,
    task.extensionRequest?.requestDate,
    ...task.comments.map(comment => comment.timestamp)
  ].filter(Boolean).map(value => new Date(value as string).getTime()).filter(Number.isFinite);
  return timestamps.length ? Math.max(...timestamps) : 0;
};

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
  read: boolean;
  timestamp: string;
  taskId?: string;
  conversationId?: string;
}

export interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  late: number;
  pendingReview: number;
}
