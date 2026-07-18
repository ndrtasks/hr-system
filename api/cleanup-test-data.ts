import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const COLLECTIONS_TO_CLEAR = ['tasks', 'notifications', 'conversations', 'communicationMessages'] as const;

const getAdminApp = () => {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
};

const deleteDocuments = async (firestore: FirebaseFirestore.Firestore, paths: FirebaseFirestore.DocumentReference[]) => {
  for (let index = 0; index < paths.length; index += 450) {
    const batch = firestore.batch();
    paths.slice(index, index + 450).forEach(reference => batch.delete(reference));
    await batch.commit();
  }
};

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') return response.status(405).json({ message: 'الطريقة غير مسموحة.' });
  try {
    const app = getAdminApp();
    const token = request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : '';
    if (!token) return response.status(401).json({ message: 'يلزم تسجيل الدخول.' });

    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const decoded = await auth.verifyIdToken(token);
    const caller = await firestore.collection('users').doc(decoded.uid).get();
    if (!caller.exists || caller.data()?.accessLevel !== 'SUPER_ADMIN') {
      return response.status(403).json({ message: 'تنظيف البيانات متاح للمدير العام فقط.' });
    }

    const userSnapshot = await firestore.collection('users').get();
    const retainedUserIds = new Set(
      userSnapshot.docs
        .filter(item => item.id === decoded.uid || item.data()?.accessLevel === 'SUPER_ADMIN')
        .map(item => item.id)
    );
    retainedUserIds.add(decoded.uid);
    const usersToDelete = userSnapshot.docs.filter(item => !retainedUserIds.has(item.id));

    const collectionSnapshots = await Promise.all(
      COLLECTIONS_TO_CLEAR.map(name => firestore.collection(name).get())
    );
    const departmentSnapshot = await firestore.collection('departments').get();
    const counts = {
      users: usersToDelete.length,
      tasks: collectionSnapshots[0].size,
      notifications: collectionSnapshots[1].size,
      conversations: collectionSnapshots[2].size,
      messages: collectionSnapshots[3].size,
      departmentsRetained: departmentSnapshot.size
    };

    if (request.body?.action === 'preview') {
      return response.status(200).json({ success: true, counts });
    }
    if (request.body?.action !== 'execute' || request.body?.confirmation !== 'حذف بيانات التجربة') {
      return response.status(400).json({ message: 'عبارة التأكيد غير صحيحة.' });
    }

    const authIdsToDelete: string[] = [];
    let pageToken: string | undefined;
    do {
      const page = await auth.listUsers(1000, pageToken);
      page.users.forEach(user => {
        if (!retainedUserIds.has(user.uid)) authIdsToDelete.push(user.uid);
      });
      pageToken = page.pageToken;
    } while (pageToken);
    for (let index = 0; index < authIdsToDelete.length; index += 1000) {
      const result = await auth.deleteUsers(authIdsToDelete.slice(index, index + 1000));
      if (result.failureCount) throw new Error('AUTH_DELETE_PARTIAL_FAILURE');
    }

    const references = [
      ...usersToDelete.map(item => item.ref),
      ...collectionSnapshots.flatMap(snapshot => snapshot.docs.map(item => item.ref))
    ];
    await deleteDocuments(firestore, references);

    for (let index = 0; index < departmentSnapshot.docs.length; index += 450) {
      const batch = firestore.batch();
      departmentSnapshot.docs.slice(index, index + 450).forEach(item => batch.update(item.ref, {
        managerId: FieldValue.delete(),
        managerName: FieldValue.delete(),
        managerJobTitle: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      }));
      await batch.commit();
    }

    return response.status(200).json({ success: true, counts, message: 'تم تنظيف بيانات التجربة مع الاحتفاظ بالمدير العام والأقسام.' });
  } catch (error: any) {
    const code = error?.code || error?.message;
    if (code === 'FIREBASE_ADMIN_NOT_CONFIGURED') return response.status(503).json({ message: 'بيانات Firebase Admin غير مضافة إلى Vercel.' });
    console.error('cleanup-test-data', code);
    return response.status(500).json({ message: 'تعذر إكمال التنظيف. لم تُحذف الأقسام أو حساب المدير العام.' });
  }
}
