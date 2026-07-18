// Secure server-side deletion of Firebase Authentication and related Firestore data.
// Deployment retry: account deletion runtime fix.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const getAdminApp = () => {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
};

const assignedIds = (data: FirebaseFirestore.DocumentData) => Array.from(new Set([
  ...(Array.isArray(data.assigneeIds) ? data.assigneeIds : []),
  ...(data.assigneeId ? [data.assigneeId] : [])
])).filter(Boolean) as string[];

const commitOperations = async (
  firestore: FirebaseFirestore.Firestore,
  operations: Array<{ type: 'delete' | 'update'; ref: FirebaseFirestore.DocumentReference; data?: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> }>
) => {
  for (let index = 0; index < operations.length; index += 400) {
    const batch = firestore.batch();
    operations.slice(index, index + 400).forEach(operation => {
      if (operation.type === 'delete') batch.delete(operation.ref);
      else batch.update(operation.ref, operation.data || {});
    });
    await batch.commit();
  }
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') return response.status(405).json({ message: 'الطريقة غير مسموحة.' });
  try {
    const app = getAdminApp();
    const token = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : '';
    const targetId = String(request.body?.userId || '');
    if (!token) return response.status(401).json({ message: 'يلزم تسجيل الدخول.' });
    if (!targetId) return response.status(400).json({ message: 'الحساب المطلوب غير محدد.' });

    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const decoded = await auth.verifyIdToken(token);
    if (decoded.uid === targetId) return response.status(400).json({ message: 'لا يمكن حذف حسابك أثناء تسجيل الدخول.' });

    const [callerSnapshot, targetSnapshot] = await Promise.all([
      firestore.collection('users').doc(decoded.uid).get(),
      firestore.collection('users').doc(targetId).get()
    ]);
    if (!callerSnapshot.exists) return response.status(403).json({ message: 'ملف حسابك غير موجود.' });
    if (!targetSnapshot.exists) return response.status(404).json({ message: 'الحساب المطلوب غير موجود أو حُذف مسبقًا.' });

    const caller = callerSnapshot.data() || {};
    const target = targetSnapshot.data() || {};
    const isSuperAdmin = caller.accessLevel === 'SUPER_ADMIN';
    const isAllowedDepartmentManager = caller.role === 'MANAGER'
      && caller.accessLevel === 'DEPARTMENT_MANAGER'
      && target.role === 'EMPLOYEE'
      && caller.department === target.department;
    if (!isSuperAdmin && !isAllowedDepartmentManager) {
      return response.status(403).json({ message: 'لا تملك صلاحية حذف هذا الحساب.' });
    }
    if (target.accessLevel === 'SUPER_ADMIN') {
      return response.status(403).json({ message: 'لا يمكن حذف حساب المدير العام من هنا.' });
    }
    if (request.body?.confirmation !== `حذف ${target.email}`) {
      return response.status(400).json({ message: 'تأكيد الحذف غير صحيح.' });
    }

    const [tasksSnapshot, notificationsSnapshot, conversationsSnapshot, messagesSnapshot, usersSnapshot] = await Promise.all([
      firestore.collection('tasks').get(),
      firestore.collection('notifications').where('userId', '==', targetId).get(),
      firestore.collection('conversations').where('participantIds', 'array-contains', targetId).get(),
      firestore.collection('communicationMessages').where('participantIds', 'array-contains', targetId).get(),
      firestore.collection('users').get()
    ]);
    const users = new Map(usersSnapshot.docs.map(item => [item.id, item.data()]));
    const operations: Array<{ type: 'delete' | 'update'; ref: FirebaseFirestore.DocumentReference; data?: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> }> = [];
    let deletedTasks = 0;
    let updatedTasks = 0;

    tasksSnapshot.docs.forEach(item => {
      const task = item.data();
      const ids = assignedIds(task);
      if (!ids.includes(targetId)) return;
      const remainingIds = ids.filter(id => id !== targetId);
      if (!remainingIds.length) {
        operations.push({ type: 'delete', ref: item.ref });
        deletedTasks += 1;
        return;
      }
      const participantStatuses = { ...(task.participantStatuses || {}) };
      delete participantStatuses[targetId];
      const departments = Array.from(new Set(remainingIds.map(id => users.get(id)?.department).filter(Boolean)));
      const comments = [...(Array.isArray(task.comments) ? task.comments : []), {
        id: `system_user_delete_${Date.now()}_${item.id}`,
        userId: 'system', userName: 'النظام', userAvatar: '', isSystem: true,
        content: `تمت إزالة ${target.name || target.email} من المهمة بعد حذف الحساب.`,
        timestamp: new Date().toISOString()
      }];
      operations.push({
        type: 'update', ref: item.ref, data: {
          assigneeId: remainingIds[0],
          assigneeIds: remainingIds,
          participantStatuses,
          departments,
          department: departments[0] || task.department,
          previousAssignees: Array.from(new Set([...(task.previousAssignees || []), targetId])),
          comments,
          lastUpdated: FieldValue.serverTimestamp()
        }
      });
      updatedTasks += 1;
    });

    notificationsSnapshot.docs.forEach(item => operations.push({ type: 'delete', ref: item.ref }));
    conversationsSnapshot.docs.forEach(item => {
      const remaining = (item.data().participantIds || []).filter((id: string) => id !== targetId);
      operations.push(remaining.length < 2
        ? { type: 'delete', ref: item.ref }
        : { type: 'update', ref: item.ref, data: { participantIds: remaining, updatedAt: FieldValue.serverTimestamp() } });
    });
    messagesSnapshot.docs.forEach(item => {
      const remaining = (item.data().participantIds || []).filter((id: string) => id !== targetId);
      operations.push(!remaining.length
        ? { type: 'delete', ref: item.ref }
        : { type: 'update', ref: item.ref, data: { participantIds: remaining } });
    });
    if (target.role === 'MANAGER' && target.departmentId) {
      operations.push({ type: 'update', ref: firestore.collection('departments').doc(target.departmentId), data: {
        managerId: FieldValue.delete(), managerName: FieldValue.delete(), managerJobTitle: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp()
      }});
    }
    operations.push({ type: 'delete', ref: targetSnapshot.ref });

    try {
      await auth.deleteUser(targetId);
    } catch (error: any) {
      if (error?.code !== 'auth/user-not-found') throw error;
    }
    await commitOperations(firestore, operations);

    return response.status(200).json({
      success: true,
      message: `تم حذف حساب ${target.name || target.email} بالكامل.`,
      summary: { deletedTasks, updatedTasks, notifications: notificationsSnapshot.size }
    });
  } catch (error: any) {
    const code = error?.code || error?.message;
    if (code === 'FIREBASE_ADMIN_NOT_CONFIGURED') return response.status(503).json({ message: 'بيانات Firebase Admin غير مضافة إلى Vercel.' });
    console.error('delete-account', code);
    const safeMessage = code === 'auth/insufficient-permission'
      ? 'حساب Firebase Admin لا يملك صلاحية حذف المستخدمين.'
      : code === 'app/invalid-credential'
        ? 'بيانات Firebase Admin غير صحيحة. راجع متغيرات Vercel.'
        : 'تعذر حذف الحساب بالكامل. راجع سجل الخادم ثم حاول مرة أخرى.';
    return response.status(500).json({ message: safeMessage });
  }
}
