import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
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
import { Student, CardSettings, ClassInfo, AttendanceRecord } from './types';
import { optimizeStudentPhoto, optimizeTransparentPng } from './utils/imageCompressor';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from configuration
// Configure with experimentalForceLongPolling to prevent 10s backend unreachable timeout in cloud/proxy environments
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

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

// Connection test on boot with fast timeout protection
export async function testConnection(): Promise<boolean> {
  try {
    const probe = getDocFromServer(doc(db, 'test', 'connection'));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 3500)
    );
    await Promise.race([probe, timeout]);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('the client is offline') ||
        error.message.includes('timeout') ||
        error.message.includes('Could not reach'))
    ) {
      console.warn('Firebase client is offline or network unreachable.');
      return false;
    }
    // Permissions error on non-existent test document is normal when connected
    return true;
  }
}

// Auth helpers
export async function signInWithGoogle(useRedirect = false): Promise<User | null> {
  try {
    if (useRedirect) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    console.error('Google Sign-in failed', err);
    throw err;
  }
}

export async function checkRedirectAuth(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (err) {
    console.warn('Redirect auth check error:', err);
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

// Helper to safely strip undefined values and prepare Student object for Firestore
function prepareStudentForFirestore(student: Student, userId: string): Record<string, any> {
  return {
    id: student.id,
    nisn: student.nisn || '',
    nis: student.nis || '',
    nama: student.nama || 'Siswa',
    tempatLahir: student.tempatLahir || '',
    tanggalLahir: student.tanggalLahir || '',
    jenisKelamin: student.jenisKelamin || 'L',
    kelas: student.kelas || '',
    jurusan: student.jurusan || '',
    alamat: student.alamat || '',
    golonganDarah: student.golonganDarah || '-',
    foto: student.foto || '',
    masaBerlaku: student.masaBerlaku || '06/2028',
    ownerId: userId,
    updatedAt: new Date().toISOString(),
  };
}

// Firestore operations for Student
export async function saveStudentToFirestore(student: Student, userId: string): Promise<void> {
  const docPath = `students/${student.id}`;
  try {
    let studentToSave = student;
    // Defensive check: if photo data URL exceeds 200KB, optimize it before sending to Firestore
    if (student.foto && student.foto.length > 200000) {
      try {
        const compressed = await optimizeStudentPhoto(student.foto);
        studentToSave = { ...student, foto: compressed };
      } catch (e) {
        console.warn('Defensive photo compression notice:', e);
      }
    }
    const studentData = prepareStudentForFirestore(studentToSave, userId);
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

export async function clearUserStudentsInFirestore(userId: string): Promise<void> {
  const pathForClear = 'students';
  try {
    const q = query(collection(db, 'students'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const chunks: string[][] = [];
    let currentChunk: string[] = [];
    snap.docs.forEach((d) => {
      currentChunk.push(d.id);
      if (currentChunk.length >= 400) {
        chunks.push(currentChunk);
        currentChunk = [];
      }
    });
    if (currentChunk.length > 0) chunks.push(currentChunk);

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const id of chunk) {
        batch.delete(doc(db, 'students', id));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, pathForClear);
  }
}

export async function batchSaveStudentsToFirestore(
  students: Student[],
  userId: string
): Promise<void> {
  if (students.length === 0) return;
  const pathForBatch = 'students';
  try {
    // Ensure any oversized photos are compressed so batch write never hits Firestore limit
    const safeStudents = await Promise.all(
      students.map(async (student) => {
        if (student.foto && student.foto.length > 200000) {
          try {
            const compressed = await optimizeStudentPhoto(student.foto);
            return { ...student, foto: compressed };
          } catch {
            return student;
          }
        }
        return student;
      })
    );

    // Firestore batch supports up to 500 writes
    const chunks: Student[][] = [];
    for (let i = 0; i < safeStudents.length; i += 400) {
      chunks.push(safeStudents.slice(i, i + 400));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const student of chunk) {
        const studentRef = doc(db, 'students', student.id);
        const studentData = prepareStudentForFirestore(student, userId);
        batch.set(studentRef, studentData);
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
    const cleanSettings: Record<string, any> = {
      id: settingId,
      ownerId: userId,
      updatedAt: new Date().toISOString(),
    };
    for (const [k, v] of Object.entries(settings)) {
      if (v !== undefined) {
        cleanSettings[k] = v;
      }
    }

    // Defensive check: optimize transparent logos/stamps if oversized
    if (cleanSettings.schoolLogo && typeof cleanSettings.schoolLogo === 'string' && cleanSettings.schoolLogo.length > 200000) {
      try { cleanSettings.schoolLogo = await optimizeTransparentPng(cleanSettings.schoolLogo, 600); } catch {}
    }
    if (cleanSettings.pancasilaLogo && typeof cleanSettings.pancasilaLogo === 'string' && cleanSettings.pancasilaLogo.length > 200000) {
      try { cleanSettings.pancasilaLogo = await optimizeTransparentPng(cleanSettings.pancasilaLogo, 600); } catch {}
    }
    if (cleanSettings.stempelUrl && typeof cleanSettings.stempelUrl === 'string' && cleanSettings.stempelUrl.length > 200000) {
      try { cleanSettings.stempelUrl = await optimizeTransparentPng(cleanSettings.stempelUrl, 600); } catch {}
    }
    if (cleanSettings.tandaTanganUrl && typeof cleanSettings.tandaTanganUrl === 'string' && cleanSettings.tandaTanganUrl.length > 200000) {
      try { cleanSettings.tandaTanganUrl = await optimizeTransparentPng(cleanSettings.tandaTanganUrl, 600); } catch {}
    }

    await setDoc(doc(db, 'settings', settingId), cleanSettings);
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

// Firestore operations for Classes
export function prepareClassForFirestore(cls: ClassInfo, userId: string): Record<string, any> {
  const clean: Record<string, any> = {
    id: cls.id,
    nama: cls.nama,
    tingkat: cls.tingkat || 'X',
    fase: cls.fase || '',
    jurusan: cls.jurusan || '',
    waliKelas: cls.waliKelas || '',
    nipWaliKelas: cls.nipWaliKelas || '',
    tahunAjaran: cls.tahunAjaran || '2024/2025',
    ruangan: cls.ruangan || '',
    keterangan: cls.keterangan || '',
    ownerId: userId,
    updatedAt: new Date().toISOString(),
  };
  return clean;
}

export async function saveClassToFirestore(cls: ClassInfo, userId: string): Promise<void> {
  const docPath = `classes/${cls.id}`;
  try {
    const data = prepareClassForFirestore(cls, userId);
    await setDoc(doc(db, 'classes', cls.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteClassFromFirestore(classId: string): Promise<void> {
  const docPath = `classes/${classId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function batchSaveClassesToFirestore(
  classesList: ClassInfo[],
  userId: string
): Promise<void> {
  if (classesList.length === 0) return;
  const pathForBatch = 'classes';
  try {
    const batch = writeBatch(db);
    for (const cls of classesList) {
      const classRef = doc(db, 'classes', cls.id);
      batch.set(classRef, prepareClassForFirestore(cls, userId));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForBatch);
  }
}

export async function loadClassesFromFirestore(userId: string): Promise<ClassInfo[]> {
  const docPath = 'classes';
  try {
    const q = query(collection(db, 'classes'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ClassInfo);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, docPath);
    return [];
  }
}

// Attendance Firestore Handlers
export function prepareAttendanceForFirestore(
  record: AttendanceRecord,
  userId: string
): Record<string, any> {
  const clean: Record<string, any> = {
    id: record.id,
    studentId: record.studentId,
    nisn: record.nisn,
    nama: record.nama,
    kelas: record.kelas || '',
    date: record.date,
    timestamp: record.timestamp || Date.now(),
    timeString: record.timeString || '',
    status: record.status || 'hadir',
    ownerId: userId,
  };
  if (record.nis) clean.nis = record.nis;
  if (record.jurusan) clean.jurusan = record.jurusan;
  if (record.foto && record.foto.length < 500000) clean.foto = record.foto;
  if (record.keterangan) clean.keterangan = record.keterangan;
  if (record.method) clean.method = record.method;
  return clean;
}

export async function saveAttendanceToFirestore(
  record: AttendanceRecord,
  userId: string
): Promise<void> {
  const docPath = `attendance/${record.id}`;
  try {
    const data = prepareAttendanceForFirestore(record, userId);
    await setDoc(doc(db, 'attendance', record.id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

export async function deleteAttendanceFromFirestore(recordId: string): Promise<void> {
  const docPath = `attendance/${recordId}`;
  try {
    await deleteDoc(doc(db, 'attendance', recordId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function batchSaveAttendanceToFirestore(
  records: AttendanceRecord[],
  userId: string
): Promise<void> {
  if (records.length === 0) return;
  const pathForBatch = 'attendance';
  try {
    const batch = writeBatch(db);
    for (const rec of records) {
      const recRef = doc(db, 'attendance', rec.id);
      batch.set(recRef, prepareAttendanceForFirestore(rec, userId));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathForBatch);
  }
}

export async function loadAttendanceFromFirestore(
  userId: string,
  date?: string
): Promise<AttendanceRecord[]> {
  const docPath = 'attendance';
  try {
    let q = query(collection(db, 'attendance'), where('ownerId', '==', userId));
    if (date) {
      q = query(
        collection(db, 'attendance'),
        where('ownerId', '==', userId),
        where('date', '==', date)
      );
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AttendanceRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, docPath);
    return [];
  }
}

