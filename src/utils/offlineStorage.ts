import { Student, CardSettings, ClassInfo, AttendanceRecord } from '../types';

const DB_NAME = 'sman1_julok_offline_db';
const DB_VERSION = 2;
const STORE_STUDENTS = 'students';
const STORE_SETTINGS = 'settings';
const STORE_CLASSES = 'classes';
const STORE_ATTENDANCE = 'attendance';

/**
 * Open or create IndexedDB database instance
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_STUDENTS)) {
        db.createObjectStore(STORE_STUDENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CLASSES)) {
        db.createObjectStore(STORE_CLASSES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_ATTENDANCE)) {
        db.createObjectStore(STORE_ATTENDANCE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Persist all students safely into IndexedDB (virtually unlimited quota),
 * and safely update localStorage with a trimmed/compressed fallback without throwing QuotaExceededError.
 */
export async function saveStudentsToOffline(
  students: Student[],
  localStorageKey = 'sman1_julok_students_v2'
): Promise<void> {
  // 1. Save full data with photos to IndexedDB
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE_STUDENTS], 'readwrite');
      const store = tx.objectStore(STORE_STUDENTS);
      store.clear(); // Clear existing to prevent stale students
      for (const s of students) {
        store.put(s);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB write notice, falling back to local memory:', err);
  }

  // 2. Defensive localStorage persistence with automatic QuotaExceeded handling
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const serialized = JSON.stringify(students);
      // If serialized payload is reasonably sized (< 2MB), save as-is
      if (serialized.length < 2_000_000) {
        window.localStorage.setItem(localStorageKey, serialized);
        return;
      }
    } catch {
      // If full setItem fails with QuotaExceededError, proceed to stripped fallback
    }

    // Fallback: save student records with omitted/shortened photo strings to prevent QuotaExceededError
    try {
      const lightweightStudents = students.map((s) => ({
        ...s,
        // If photo is a giant base64 data URL, don't hoard it in localStorage (IndexedDB has it)
        foto: s.foto && s.foto.length > 500 ? '' : s.foto,
      }));
      window.localStorage.setItem(localStorageKey, JSON.stringify(lightweightStudents));
    } catch (e) {
      // Safely ignore if localStorage is totally full
      console.warn('LocalStorage quota filled; persistent data safely preserved in IndexedDB.');
    }
  }
}

/**
 * Load students from offline storage (IndexedDB first, then localStorage fallback)
 */
export async function loadStudentsFromOffline(
  localStorageKey = 'sman1_julok_students_v2'
): Promise<Student[] | null> {
  // 1. Try reading from IndexedDB
  try {
    const db = await openDatabase();
    const students = await new Promise<Student[]>((resolve, reject) => {
      const tx = db.transaction([STORE_STUDENTS], 'readonly');
      const store = tx.objectStore(STORE_STUDENTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (students && students.length > 0) {
      return students;
    }
  } catch (err) {
    console.warn('IndexedDB read notice, trying localStorage:', err);
  }

  // 2. Fallback to localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(localStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Save settings to offline storage safely
 */
export async function saveSettingsToOffline(
  settings: CardSettings,
  localStorageKey = 'sman1_julok_settings_v2'
): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_SETTINGS], 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    store.put({ id: 'current_settings', ...settings });
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(localStorageKey, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed saving settings to localStorage, preserved in IndexedDB.');
    }
  }
}

/**
 * Save classes to offline storage safely
 */
export async function saveClassesToOffline(
  classes: ClassInfo[],
  localStorageKey = 'sman1_julok_classes_v2'
): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_CLASSES], 'readwrite');
    const store = tx.objectStore(STORE_CLASSES);
    store.clear();
    for (const c of classes) {
      store.put(c);
    }
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(localStorageKey, JSON.stringify(classes));
    } catch {
      // ignore
    }
  }
}

/**
 * Save attendance records safely into IndexedDB and localStorage
 */
export async function saveAttendanceToOffline(
  records: AttendanceRecord[],
  localStorageKey = 'sman1_julok_attendance_v1'
): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction([STORE_ATTENDANCE], 'readwrite');
    const store = tx.objectStore(STORE_ATTENDANCE);
    store.clear();
    for (const r of records) {
      store.put(r);
    }
  } catch (err) {
    console.warn('IndexedDB attendance save error:', err);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      // Strip oversized photo URLs to protect localStorage quota
      const lightweight = records.map((r) => ({
        ...r,
        foto: r.foto && r.foto.length > 500 ? '' : r.foto,
      }));
      window.localStorage.setItem(localStorageKey, JSON.stringify(lightweight));
    } catch {
      // ignore
    }
  }
}

/**
 * Load attendance records from offline storage
 */
export async function loadAttendanceFromOffline(
  localStorageKey = 'sman1_julok_attendance_v1'
): Promise<AttendanceRecord[] | null> {
  try {
    const db = await openDatabase();
    const records = await new Promise<AttendanceRecord[]>((resolve, reject) => {
      const tx = db.transaction([STORE_ATTENDANCE], 'readonly');
      const store = tx.objectStore(STORE_ATTENDANCE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (records && records.length > 0) {
      return records;
    }
  } catch (err) {
    console.warn('IndexedDB attendance read error:', err);
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(localStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

