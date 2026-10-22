import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Student, CardSettings } from './types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network unreachable.');
      return false;
    }
    // Permissions error on non-existent test document is normal when connected
    return true;
  }
}

// Auth helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Google Sign-in failed', err);
    throw err;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Sign-out failed', err);
    throw err;
  }
}

// Firestore operations for Student
export async function saveStudentToFirestore(student: Student, userId: string): Promise<void> {
  const docPath = `students/${student.id}`;
  try {
    const studentData = {
      ...student,
      ownerId: userId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'students', student.id), studentData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  const docPath = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function batchSaveStudentsToFirestore(
  students: Student[],
  userId: string
): Promise<void> {
  if (students.length === 0) return;
  const pathForBatch = 'students';
  try {
    // Firestore batch supports up to 500 writes
    const chunks: Student[][] = [];
    for (let i = 0; i < students.length; i += 400) {
      chunks.push(students.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const student of chunk) {
        const studentRef = doc(db, 'students', student.id);
        batch.set(studentRef, {
          ...student,
          ownerId: userId,
          updatedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForBatch);
  }
}

// Firestore operations for CardSettings
export async function saveSettingsToFirestore(
  settings: CardSettings,
  userId: string
): Promise<void> {
  const settingId = `school_setting_${userId}`;
  const docPath = `settings/${settingId}`;
  try {
    const settingsData = {
      ...settings,
      id: settingId,
      ownerId: userId,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'settings', settingId), settingsData);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function loadSettingsFromFirestore(userId: string): Promise<CardSettings | null> {
  const settingId = `school_setting_${userId}`;
  const docPath = `settings/${settingId}`;
  try {
    const q = query(collection(db, 'settings'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as CardSettings;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, docPath);
  }
}
