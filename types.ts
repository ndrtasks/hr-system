
export type Role = 'MANAGER' | 'EMPLOYEE';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  avatar: string;
  department: string;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type Status = 'NEW' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'LATE';

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
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  assigneeId: string;
  createdBy: string;
  department: string;
  comments: Comment[];
  attachments?: Attachment[];
  isRecurring: boolean;
  extensionRequest?: ExtensionRequest;
  lastUpdated?: string; // تاريخ آخر نشاط (للترتيب)
  previousAssignees?: string[]; // قائمة الموظفين السابقين الذين استلموا المهمة
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING';
  read: boolean;
  timestamp: string;
  taskId?: string;
}

export interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  late: number;
  pendingReview: number;
}
