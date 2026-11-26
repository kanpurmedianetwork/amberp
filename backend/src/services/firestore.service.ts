import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDocs, collection, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBZd0FTAP6GJ_eTXNhqMzRd5BDPGslGA6g',
  authDomain: 'erp0120.firebaseapp.com',
  projectId: 'erp0120',
  storageBucket: 'erp0120.firebasestorage.app',
  messagingSenderId: '33361940877',
  appId: '1:33361940877:web:38a704ce72c8e697ba6dc4',
};

export class FirestoreService {
  private static db: Firestore | null = null;
  private static isInitialized = false;

  public static async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
      const auth = getAuth(app);
      if (!auth.currentUser) {
        await signInWithEmailAndPassword(auth, 'mohit@ambicaengineers.in', 'Ambica@Password2026');
      }
      this.db = getFirestore(app);
      this.isInitialized = true;
      console.log('[Firestore] Connected to Cloud Firestore in erp0120');
    } catch (err: any) {
      console.warn('[Firestore] Failed to initialize Firestore real-time sync:', err.message);
    }
  }

  public static async syncRecord(collectionName: string, id: string, data: any): Promise<void> {
    try {
      await this.init();
      if (!this.db) return;
      const cleanId = String(id).replace(/[\/\\]/g, '_').trim();
      const sanitized = JSON.parse(
        JSON.stringify(data, (key, value) => (value === undefined ? null : value))
      );
      const ref = doc(this.db, collectionName, cleanId);
      await setDoc(ref, sanitized, { merge: true });
    } catch (err: any) {
      console.warn(`[Firestore] Failed to sync document to ${collectionName}/${id}:`, err.message);
    }
  }
}
