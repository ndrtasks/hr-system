import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const getAdminApp = () => {
  if (getApps().length) return getApps()[0];
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('FIREBASE_ADMIN_NOT_CONFIGURED');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
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
    if (!caller.exists || caller.data()?.accessLevel !== 'SUPER_ADMIN') return response.status(403).json({ message: 'تغيير البريد متاح للمدير العام فقط.' });

    const userId = String(request.body?.userId || '').trim();
    const email = String(request.body?.email || '').trim().toLowerCase();
    if (!userId || !/^\S+@\S+\.\S+$/.test(email)) return response.status(400).json({ message: 'البريد الإلكتروني غير صحيح.' });
    const target = await auth.getUser(userId);
    if (target.email?.toLowerCase() === email) return response.status(200).json({ success: true });
    await auth.updateUser(userId, { email, emailVerified: false });
    try {
      await firestore.collection('users').doc(userId).update({ email });
    } catch (error) {
      if (target.email) await auth.updateUser(userId, { email: target.email, emailVerified: target.emailVerified });
      throw error;
    }
    return response.status(200).json({ success: true });
  } catch (error: any) {
    const code = error?.code || error?.message;
    if (code === 'auth/email-already-exists') return response.status(409).json({ message: 'البريد مستخدم في حساب آخر.' });
    if (code === 'FIREBASE_ADMIN_NOT_CONFIGURED') return response.status(503).json({ message: 'بيانات Firebase Admin غير مضافة إلى Vercel.' });
    console.error('account-email', code);
    return response.status(500).json({ message: 'تعذر تحديث البريد الإلكتروني.' });
  }
}
