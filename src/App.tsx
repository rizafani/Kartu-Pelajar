/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  IdCard,
  Users,
  FileSpreadsheet,
  FileArchive,
  Printer,
  Sparkles,
  School,
  CheckCircle,
  HelpCircle,
  Sliders,
  Palette,
  Database,
  Cloud,
  CloudCheck,
  RefreshCw,
  LogIn,
  LogOut,
  ShieldCheck,
  GraduationCap,
  Clock,
  Scan,
  History,
  ClipboardCheck,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { CardSettings, PrintSettings, Student, ClassInfo, AttendanceRecord, AttendanceStatus } from './types';
import {
  DEFAULT_CARD_SETTINGS,
  DEFAULT_PRINT_SETTINGS,
  INITIAL_STUDENTS,
  INITIAL_CLASSES,
  SMAN1_JULOK_LOGO_PATH,
  ACEH_GOV_LOGO_PATH,
} from './data/defaults';
import { CardStudio } from './components/CardStudio';
import { StudentTable } from './components/StudentTable';
import { ClassManagement } from './components/ClassManagement';
import { ImportExportModal } from './components/ImportExportModal';
import { ZipPhotoModal } from './components/ZipPhotoModal';
import { AuthTroubleshootModal } from './components/AuthTroubleshootModal';
import { BatchPrintView } from './components/BatchPrintView';
import { SingleCardModal } from './components/SingleCardModal';
import { WebcamModal } from './components/WebcamModal';
import { CardVerificationView } from './components/CardVerificationView';
import { LoginPage } from './components/LoginPage';
import { AttendanceDashboard } from './components/AttendanceDashboard';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { AttendanceNotificationModal } from './components/AttendanceNotificationModal';
import { AttendanceRecordsView } from './components/AttendanceRecordsView';
import { downloadCardAsPng, CardResolution, RESOLUTION_OPTIONS } from './utils/cardExporter';
import { decodeVerificationPayload } from './utils/barcodeGenerator';
import {
  saveStudentsToOffline,
  loadStudentsFromOffline,
  saveSettingsToOffline,
  saveClassesToOffline,
  saveAttendanceToOffline,
  loadAttendanceFromOffline,
} from './utils/offlineStorage';
import {
  auth,
  db,
  testConnection,
  signInWithGoogle,
  checkRedirectAuth,
  signOutUser,
  saveStudentToFirestore,
  deleteStudentFromFirestore,
  clearUserStudentsInFirestore,
  batchSaveStudentsToFirestore,
  saveSettingsToFirestore,
  loadSettingsFromFirestore,
  saveClassToFirestore,
  deleteClassFromFirestore,
  batchSaveClassesToFirestore,
  loadClassesFromFirestore,
  saveAttendanceToFirestore,
  deleteAttendanceFromFirestore,
  batchSaveAttendanceToFirestore,
  loadAttendanceFromFirestore,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  extractNisnFromBarcode,
  findStudentByNisnOrId,
  createAttendanceRecord,
  getTodayDateString,
  formatIndonesianTime,
} from './utils/attendanceHelper';
import { playSuccessChime, playErrorBuzz } from './utils/soundEffects';

const STORAGE_KEY_STUDENTS = 'sman1_julok_students_v2';
const STORAGE_KEY_SETTINGS = 'sman1_julok_settings_v2';
const STORAGE_KEY_CLASSES = 'sman1_julok_classes_v2';
const STORAGE_KEY_ATTENDANCE = 'sman1_julok_attendance_v1';

export default function App() {
  // Authentication & Cloud Database State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudStudentCount, setCloudStudentCount] = useState<number>(0);
  const [authErrorModalData, setAuthErrorModalData] = useState<{
    code: string;
    message: string;
    domain: string;
  } | null>(null);
  const isRemoteSettingsUpdate = useRef(false);
  const isFirstAuthCheck = useRef(true);

  // Students state with LocalStorage persistence
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed reading students from storage', e);
    }
    return INITIAL_STUDENTS;
  });

  // Card settings state with LocalStorage persistence
  const [cardSettings, setCardSettings] = useState<CardSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Default to the official Indonesian government template if empty or if obsolete template was stored
        const validTemplates = ['resmi_kedinasan', 'garuda_emas', 'cyber_smart_id', 'batik_nusantara', 'minimalis_modern', 'kartu_hijau_islami'];
        if (!parsed.templateStyle || !validTemplates.includes(parsed.templateStyle)) {
          parsed.templateStyle = 'resmi_kedinasan';
        }
        // Ensure new uploaded Aceh Government and School logos are used
        if (!parsed.schoolLogo || parsed.schoolLogo.startsWith('data:image/svg')) {
          parsed.schoolLogo = SMAN1_JULOK_LOGO_PATH;
        }
        if (!parsed.pancasilaLogo || parsed.pancasilaLogo.startsWith('data:image/svg')) {
          parsed.pancasilaLogo = ACEH_GOV_LOGO_PATH;
        }
        parsed.qrContent = 'url';
        return { ...DEFAULT_CARD_SETTINGS, ...parsed, qrContent: 'url' };
      }
    } catch (e) {
      console.error('Failed reading card settings from storage', e);
    }
    return DEFAULT_CARD_SETTINGS;
  });

  // Classes state with LocalStorage persistence and defaults
  const [classes, setClasses] = useState<ClassInfo[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CLASSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed reading classes from storage', e);
    }
    return INITIAL_CLASSES;
  });

  // Save classes to offline storage
  useEffect(() => {
    saveClassesToOffline(classes, STORAGE_KEY_CLASSES).catch((e) => {
      console.warn('Notice saving classes to offline storage', e);
    });
  }, [classes]);



  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);

  // Active view tab: 'attendance' (Presensi Digital) vs 'records' (Rekap Kehadiran) vs 'students' (Database Roster) vs 'studio' (Designer) vs 'classes' (Manajemen Kelas)
  const [activeTab, setActiveTab] = useState<'attendance' | 'records' | 'students' | 'studio' | 'classes'>('attendance');

  // Attendance System State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [scanNotification, setScanNotification] = useState<{
    record: AttendanceRecord;
    student: Student;
  } | null>(null);

  // Load and save attendance to offline storage (IndexedDB)
  useEffect(() => {
    loadAttendanceFromOffline(STORAGE_KEY_ATTENDANCE)
      .then((saved) => {
        if (saved && saved.length > 0) {
          setAttendanceRecords(saved);
        }
      })
      .catch((e) => console.warn('Attendance load offline notice:', e));
  }, []);

  useEffect(() => {
    saveAttendanceToOffline(attendanceRecords, STORAGE_KEY_ATTENDANCE).catch((e) =>
      console.warn('Attendance save offline notice:', e)
    );
  }, [attendanceRecords]);

  // Inter-tab filter navigation states
  const [focusedClassForStudio, setFocusedClassForStudio] = useState<string>('all');
  const [focusedClassForStudents, setFocusedClassForStudents] = useState<string>('all');

  // Selected students for batch print
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [previewStudentId, setPreviewStudentId] = useState<string>(
    students[0]?.id || 'std-1'
  );

  // Modals & Fullscreen Print View
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isBatchPrintOpen, setIsBatchPrintOpen] = useState(false);
  const [singlePreviewStudent, setSinglePreviewStudent] = useState<Student | null>(null);
  const [webcamStudent, setWebcamStudent] = useState<Student | null>(null);

  // Success Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Active QR verification lookup state from URL (?verify=nisn)
  const [verificationNisn, setVerificationNisn] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('verify');
    }
    return null;
  });

  // Listen to popstate when browser back/forward buttons are pressed
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setVerificationNisn(params.get('verify'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenVerification = (student: Student) => {
    setVerificationNisn(student.nisn);
    const newUrl = `${window.location.pathname}?verify=${encodeURIComponent(student.nisn)}`;
    window.history.pushState({}, '', newUrl);
  };

  // Load cached students from IndexedDB on startup
  useEffect(() => {
    loadStudentsFromOffline(STORAGE_KEY_STUDENTS)
      .then((saved) => {
        if (saved && saved.length > 0) {
          setStudents(saved);
        }
      })
      .catch((err) => {
        console.warn('Notice loading students from IndexedDB:', err);
      });
  }, []);

  // Test connection on initial app boot and check redirect auth result
  useEffect(() => {
    testConnection().then((connected) => {
      setIsCloudConnected(connected);
      if (connected) {
        console.log('Firebase Firestore connection verified.');
      }
    });

    checkRedirectAuth()
      .then((user) => {
        if (user) {
          setCurrentUser(user);
          showToast(`Terhubung sebagai ${user.displayName || user.email}`);
        }
      })
      .catch((err) => {
        console.warn('Redirect auth check notice:', err);
      })
      .finally(() => {
        setAuthInitialized(true);
      });
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
      if (user) {
        showToast(`Terhubung sebagai ${user.displayName || user.email}`);
      }
    });
    return () => unsubscribe();
  }, []);

  // Continuous Real-Time Synchronization across Devices (Firestore onSnapshot)
  useEffect(() => {
    if (!currentUser) return;

    // 1. Real-time Students Listener across Devices
    const qStudents = query(collection(db, 'students'), where('ownerId', '==', currentUser.uid));
    const unsubStudents = onSnapshot(
      qStudents,
      (snapshot) => {
        setCloudStudentCount(snapshot.size);
        if (!snapshot.empty) {
          const remoteStudents: Student[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: data.id || d.id,
              nisn: data.nisn || '',
              nis: data.nis || '',
              nama: data.nama || '',
              tempatLahir: data.tempatLahir || '',
              tanggalLahir: data.tanggalLahir || '',
              jenisKelamin: data.jenisKelamin || 'L',
              kelas: data.kelas || '',
              jurusan: data.jurusan || '',
              alamat: data.alamat || '',
              golonganDarah: data.golonganDarah || '-',
              foto: data.foto || '',
              masaBerlaku: data.masaBerlaku || '06/2028',
            };
          });

          // Continuously keep local students up-to-date with remote Firestore
          setStudents(remoteStudents);
        } else if (isFirstAuthCheck.current && students.length > 0) {
          // If remote is empty, automatically seed cloud with local data so other devices can access it immediately
          batchSaveStudentsToFirestore(students, currentUser.uid).catch((err) =>
            console.warn('Initial student cloud push error:', err)
          );
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'students');
      }
    );

    // 2. Real-time Classes Listener across Devices
    const qClasses = query(collection(db, 'classes'), where('ownerId', '==', currentUser.uid));
    const unsubClasses = onSnapshot(
      qClasses,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteClasses = snapshot.docs.map((d) => d.data() as ClassInfo);
          setClasses(remoteClasses);
        } else if (isFirstAuthCheck.current && classes.length > 0) {
          batchSaveClassesToFirestore(classes, currentUser.uid).catch((err) =>
            console.warn('Initial class cloud push error:', err)
          );
        }
      },
      (error) => {
        console.warn('Classes real-time sync warning:', error);
      }
    );

    // 3. Real-time Settings Listener across Devices
    const settingDocRef = doc(db, 'settings', `school_setting_${currentUser.uid}`);
    const unsubSettings = onSnapshot(
      settingDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const remote = docSnap.data() as CardSettings;
          isRemoteSettingsUpdate.current = true;
          setCardSettings((prev) => ({ ...prev, ...remote }));
        } else if (isFirstAuthCheck.current) {
          saveSettingsToFirestore(cardSettings, currentUser.uid).catch((err) =>
            console.warn('Initial settings cloud push error:', err)
          );
        }
      },
      (error) => {
        console.warn('Settings real-time sync warning:', error);
      }
    );

    // 4. Real-time Attendance Listener across Devices
    const qAttendance = query(collection(db, 'attendance'), where('ownerId', '==', currentUser.uid));
    const unsubAttendance = onSnapshot(
      qAttendance,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteRecords = snapshot.docs.map((d) => d.data() as AttendanceRecord);
          setAttendanceRecords(remoteRecords);
        } else if (isFirstAuthCheck.current && attendanceRecords.length > 0) {
          batchSaveAttendanceToFirestore(attendanceRecords, currentUser.uid).catch((err) =>
            console.warn('Initial attendance cloud push error:', err)
          );
        }
      },
      (error) => {
        console.warn('Attendance real-time sync notice:', error);
      }
    );

    isFirstAuthCheck.current = false;

    return () => {
      unsubStudents();
      unsubClasses();
      unsubSettings();
      unsubAttendance();
    };
  }, [currentUser]);

  // Persist students to IndexedDB (and quota-safe localStorage) to prevent QuotaExceededError
  useEffect(() => {
    saveStudentsToOffline(students, STORAGE_KEY_STUDENTS).catch((e) => {
      console.warn('Notice saving students to offline storage', e);
    });
  }, [students]);

  // Persist card settings to offline storage and auto-sync to Firestore (with loop-prevention)
  useEffect(() => {
    saveSettingsToOffline(cardSettings, STORAGE_KEY_SETTINGS).catch((e) => {
      console.warn('Notice saving settings to offline storage', e);
    });

    if (currentUser) {
      if (isRemoteSettingsUpdate.current) {
        isRemoteSettingsUpdate.current = false;
        return;
      }
      saveSettingsToFirestore(cardSettings, currentUser.uid).catch((err) => {
        console.warn('Failed auto-saving settings to Cloud', err);
      });
    }
  }, [cardSettings, currentUser]);

  // Cloud Sync Handler: upload all current local students, classes, and attendance to Firestore
  const handleSyncAllToCloud = async () => {
    if (!currentUser) {
      showToast('Silakan masuk dengan akun Google terlebih dahulu.');
      try {
        await signInWithGoogle();
      } catch (err) {
        showToast('Login Google dibatalkan.');
      }
      return;
    }

    try {
      setIsSyncing(true);
      await Promise.all([
        batchSaveStudentsToFirestore(students, currentUser.uid),
        batchSaveClassesToFirestore(classes, currentUser.uid),
        saveSettingsToFirestore(cardSettings, currentUser.uid),
        batchSaveAttendanceToFirestore(attendanceRecords, currentUser.uid),
      ]);
      setCloudStudentCount(students.length);
      showToast(
        `Berhasil menyinkronkan ${students.length} siswa, ${classes.length} kelas, & ${attendanceRecords.length} catatan absensi!`
      );
    } catch (err) {
      console.error('Sync failed', err);
      showToast('Gagal menyinkronkan ke database cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Mass Photo Apply Handler from ZIP
  const handleApplyPhotosFromZip = async (updatedStudents: Student[]) => {
    setStudents(updatedStudents);
    const changedCount = updatedStudents.filter((s) => {
      const orig = students.find((o) => o.id === s.id);
      return orig ? orig.foto !== s.foto : !!s.foto;
    }).length;

    showToast(`Berhasil menerapkan ${changedCount} foto ke data siswa.`);
    setIsZipModalOpen(false);

    if (currentUser) {
      try {
        setIsSyncing(true);
        const changed = updatedStudents.filter((s) => {
          const orig = students.find((o) => o.id === s.id);
          return orig ? orig.foto !== s.foto : !!s.foto;
        });
        if (changed.length > 0) {
          await batchSaveStudentsToFirestore(changed, currentUser.uid);
          showToast(`${changed.length} foto siswa tersinkronkan ke Cloud Firestore!`);
        }
      } catch (err) {
        console.error('Failed saving photos to Firestore', err);
        showToast('Foto tersimpan di memori browser lokal.');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // Quick verification lookup from login or search
  const handleOpenVerificationByNisn = (nisn: string) => {
    setVerificationNisn(nisn);
    const newUrl = `${window.location.pathname}?verify=${encodeURIComponent(nisn)}`;
    window.history.pushState({}, '', newUrl);
  };

  // Today's attendance records memo
  const todayDateStr = getTodayDateString();
  const todayAttendanceRecords = React.useMemo(() => {
    return attendanceRecords.filter((r) => r.date === todayDateStr);
  }, [attendanceRecords, todayDateStr]);

  // Handler when barcode is scanned by camera or manual USB input
  const handleBarcodeDetected = (scannedText: string) => {
    const nisn = extractNisnFromBarcode(scannedText);
    if (!nisn) {
      playErrorBuzz();
      showToast('Format barcode tidak valid atau kosong.');
      return;
    }

    const student = findStudentByNisnOrId(nisn, students);
    if (!student) {
      playErrorBuzz();
      showToast(`Siswa dengan NISN "${nisn}" tidak ditemukan di database sekolah.`);
      return;
    }

    const today = getTodayDateString();
    const existing = attendanceRecords.find(
      (r) => r.date === today && (r.studentId === student.id || r.nisn === student.nisn)
    );

    let recordToNotify: AttendanceRecord;
    if (existing) {
      recordToNotify = existing;
      showToast(`${student.nama} sudah tercatat absen hari ini pada ${existing.timeString}.`);
    } else {
      recordToNotify = createAttendanceRecord(
        student,
        today,
        undefined,
        'barcode_scan',
        currentUser?.uid
      );
      setAttendanceRecords((prev) => [recordToNotify, ...prev.filter((r) => r.id !== recordToNotify.id)]);
      if (currentUser) {
        saveAttendanceToFirestore(recordToNotify, currentUser.uid).catch((err) => {
          console.warn('Failed saving attendance to cloud', err);
        });
      }
      showToast(`Presensi ${student.nama} (${student.kelas}) berhasil dicatat!`);
    }

    playSuccessChime();
    setScanNotification({ record: recordToNotify, student });
  };

  // Handler to manually update attendance record status (Hadir/Terlambat/Izin/Sakit/Alpa)
  const handleUpdateRecordStatus = async (
    recordId: string,
    newStatus: AttendanceStatus,
    student: Student,
    dateStr: string,
    keterangan?: string
  ) => {
    const existing = attendanceRecords.find((r) => r.id === recordId);
    let updatedRecord: AttendanceRecord;
    if (existing) {
      updatedRecord = {
        ...existing,
        status: newStatus,
        keterangan: keterangan !== undefined ? keterangan : existing.keterangan,
      };
    } else {
      updatedRecord = {
        id: recordId,
        studentId: student.id,
        nisn: student.nisn,
        nis: student.nis,
        nama: student.nama,
        kelas: student.kelas,
        jurusan: student.jurusan,
        foto: student.foto,
        date: dateStr,
        timestamp: Date.now(),
        timeString: formatIndonesianTime(new Date()),
        status: newStatus,
        keterangan,
        method: 'manual_entry',
        ownerId: currentUser?.uid,
      };
    }

    setAttendanceRecords((prev) => [
      updatedRecord,
      ...prev.filter((r) => r.id !== updatedRecord.id),
    ]);

    if (scanNotification && scanNotification.record.id === recordId) {
      setScanNotification({ record: updatedRecord, student });
    }

    showToast(`Status kehadiran ${student.nama} diperbarui menjadi ${newStatus.toUpperCase()}.`);

    if (currentUser) {
      try {
        await saveAttendanceToFirestore(updatedRecord, currentUser.uid);
      } catch (err) {
        console.error('Failed saving status update to Firestore', err);
      }
    }
  };

  // Handler to mark all unmarked students as Alpa
  const handleMarkAllUnmarkedAsAlpa = async (dateStr: string, classFilter: string) => {
    const targetStudents = students.filter((s) => {
      if (classFilter !== 'all' && (s.kelas || '').trim() !== classFilter) return false;
      return true;
    });

    const existingNisns = new Set(
      attendanceRecords
        .filter((r) => r.date === dateStr)
        .map((r) => r.nisn.toLowerCase())
    );

    const unmarked = targetStudents.filter(
      (s) => !existingNisns.has(s.nisn.toLowerCase())
    );

    if (unmarked.length === 0) {
      showToast('Semua siswa sudah memiliki status kehadiran pada tanggal ini.');
      return;
    }

    const newAlpaRecords: AttendanceRecord[] = unmarked.map((s) => ({
      id: `att-${dateStr}-${s.id}`,
      studentId: s.id,
      nisn: s.nisn,
      nis: s.nis,
      nama: s.nama,
      kelas: s.kelas,
      jurusan: s.jurusan,
      foto: s.foto,
      date: dateStr,
      timestamp: Date.now(),
      timeString: '07:30:00 WIB',
      status: 'alpa',
      keterangan: 'Tidak hadir tanpa keterangan',
      method: 'manual_entry',
      ownerId: currentUser?.uid,
    }));

    setAttendanceRecords((prev) => [...newAlpaRecords, ...prev]);
    showToast(`${newAlpaRecords.length} siswa ditandai sebagai Alpa.`);

    if (currentUser) {
      try {
        await batchSaveAttendanceToFirestore(newAlpaRecords, currentUser.uid);
      } catch (err) {
        console.error('Failed saving alpa batch to cloud', err);
      }
    }
  };

  // Login handler with error diagnostics & troubleshooting modal
  const handleLogin = async (useRedirect: boolean | unknown = false) => {
    const shouldRedirect = useRedirect === true;
    try {
      setIsLoggingIn(true);
      showToast('Menghubungkan ke Akun Google...');
      const user = await signInWithGoogle(shouldRedirect);
      if (user) {
        showToast(`Selamat datang, ${user.displayName || user.email}!`);
      }
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      const errCode = err?.code || 'auth/unknown';
      const errMsg = err?.message || String(err);

      if (errCode === 'auth/popup-closed-by-user') {
        showToast('Login Google dibatalkan.');
        return;
      }

      setAuthErrorModalData({
        code: errCode,
        message: errMsg,
        domain: typeof window !== 'undefined' ? window.location.hostname : '',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOutUser();
      setIsGuestMode(false);
      showToast('Telah keluar dari akun.');
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  // Handlers for student management with automatic Firestore syncing
  const handleAddStudent = async (newStudent: Student) => {
    setStudents((prev) => [newStudent, ...prev]);
    showToast(`Siswa "${newStudent.nama}" berhasil ditambahkan.`);
    if (currentUser) {
      try {
        await saveStudentToFirestore(newStudent, currentUser.uid);
      } catch (err) {
        console.error('Failed saving student to Firestore', err);
      }
    }
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === updatedStudent.id ? updatedStudent : s))
    );
    showToast(`Data siswa "${updatedStudent.nama}" diperbarui.`);
    if (currentUser) {
      try {
        await saveStudentToFirestore(updatedStudent, currentUser.uid);
      } catch (err) {
        console.error('Failed updating student in Firestore', err);
      }
    }
  };

  const handleDeleteStudent = async (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setSelectedStudentIds((prev) => prev.filter((item) => item !== id));
    showToast('Data siswa telah dihapus.');
    if (currentUser) {
      try {
        await deleteStudentFromFirestore(id);
      } catch (err) {
        console.error('Failed deleting student from Firestore', err);
      }
    }
  };

  const handleDeleteSelectedStudents = async (ids: string[]) => {
    setStudents((prev) => prev.filter((s) => !ids.includes(s.id)));
    setSelectedStudentIds([]);
    showToast(`${ids.length} siswa berhasil dihapus.`);
    if (currentUser) {
      for (const id of ids) {
        try {
          await deleteStudentFromFirestore(id);
        } catch (err) {
          console.error('Failed deleting student from Firestore', err);
        }
      }
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStudents = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedStudentIds(students.map((s) => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleImportStudents = async (newStudents: Student[], replaceExisting: boolean) => {
    if (replaceExisting) {
      setStudents(newStudents);
      setSelectedStudentIds([]);
      if (newStudents.length > 0) {
        setPreviewStudentId(newStudents[0].id);
      }
    } else {
      setStudents((prev) => [...newStudents, ...prev]);
    }

    // Auto-discover any new classes found in imported student roster
    const currentClassNames = new Set(classes.map((c) => c.nama.trim().toLowerCase()));
    const discoveredClasses: ClassInfo[] = [];

    newStudents.forEach((s) => {
      const clsName = (s.kelas || '').trim();
      if (
        clsName &&
        !currentClassNames.has(clsName.toLowerCase()) &&
        !discoveredClasses.some((d) => d.nama.toLowerCase() === clsName.toLowerCase())
      ) {
        let tingkat: 'X' | 'XI' | 'XII' | 'Lainnya' = 'Lainnya';
        if (clsName.startsWith('X-') || clsName.startsWith('X ')) tingkat = 'X';
        else if (clsName.startsWith('XI-') || clsName.startsWith('XI ')) tingkat = 'XI';
        else if (clsName.startsWith('XII-') || clsName.startsWith('XII ')) tingkat = 'XII';

        const safeId = `cls-${Date.now()}-${discoveredClasses.length}-${clsName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        discoveredClasses.push({
          id: safeId,
          nama: clsName,
          tingkat,
          fase: tingkat === 'X' ? 'Fase E (Umum)' : tingkat === 'XI' || tingkat === 'XII' ? 'Fase F' : 'Umum',
          jurusan: s.jurusan || 'Umum',
          tahunAjaran: '2024/2025',
          keterangan: 'Terdaftar otomatis dari import siswa',
        });
      }
    });

    if (discoveredClasses.length > 0) {
      setClasses((prev) => [...prev, ...discoveredClasses]);
      if (currentUser) {
        batchSaveClassesToFirestore(discoveredClasses, currentUser.uid).catch((err) =>
          console.error('Failed saving newly discovered classes', err)
        );
      }
    }

    showToast(`Berhasil mengimpor ${newStudents.length} data siswa.`);
    if (currentUser) {
      try {
        if (replaceExisting) {
          await clearUserStudentsInFirestore(currentUser.uid);
        }
        await batchSaveStudentsToFirestore(newStudents, currentUser.uid);
      } catch (err) {
        console.error('Failed batch saving imported students to Firestore', err);
      }
    }
  };

  // Launch Batch Print view
  const handleTriggerPrint = (mode: 'selected' | 'all' = 'all') => {
    if (mode === 'selected' && selectedStudentIds.length === 0) {
      showToast('Pilih setidaknya satu siswa terlebih dahulu untuk dicetak.');
      return;
    }
    setIsBatchPrintOpen(true);
  };

  const handlePrintSingle = (student: Student) => {
    setSelectedStudentIds([student.id]);
    setIsBatchPrintOpen(true);
  };

  const handleExportSingleCard = async (
    student: Student,
    side: 'front' | 'back' | 'both',
    resolution: CardResolution = 'high'
  ) => {
    if (side === 'both') {
      await downloadCardAsPng(student, cardSettings, 'front', resolution);
      await downloadCardAsPng(student, cardSettings, 'back', resolution);
    } else {
      await downloadCardAsPng(student, cardSettings, side, resolution);
    }
    const resConfig = RESOLUTION_OPTIONS.find((r) => r.id === resolution) || RESOLUTION_OPTIONS[1];
    showToast(`Gambar kartu ${student.nama} (${resConfig.badge}) berhasil diunduh.`);
  };

  // Handlers for Class Management
  const handleAddClass = async (newClass: ClassInfo) => {
    const safeId =
      newClass.id && /^[a-zA-Z0-9_-]+$/.test(newClass.id)
        ? newClass.id
        : `cls-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const classToSave: ClassInfo = {
      ...newClass,
      id: safeId,
      nama: newClass.nama.trim(),
    };

    setClasses((prev) => [...prev, classToSave]);
    showToast(`Kelas "${classToSave.nama}" berhasil ditambahkan.`);
    if (currentUser) {
      try {
        await saveClassToFirestore(classToSave, currentUser.uid);
      } catch (err) {
        console.error('Failed saving class to Firestore', err);
      }
    }
  };

  const handleUpdateClass = async (updatedClass: ClassInfo, oldName?: string) => {
    setClasses((prev) => prev.map((c) => (c.id === updatedClass.id ? updatedClass : c)));
    showToast(`Data kelas "${updatedClass.nama}" diperbarui.`);

    // If class was renamed and oldName was provided, update all students belonging to oldName
    if (oldName && oldName !== updatedClass.nama) {
      const affectedStudents = students.filter((s) => (s.kelas || '').trim() === oldName);
      if (affectedStudents.length > 0) {
        setStudents((prev) =>
          prev.map((s) => ((s.kelas || '').trim() === oldName ? { ...s, kelas: updatedClass.nama } : s))
        );
        showToast(`${affectedStudents.length} siswa dialihkan ke kelas "${updatedClass.nama}".`);
        if (currentUser) {
          try {
            const updatedStudents = affectedStudents.map((s) => ({ ...s, kelas: updatedClass.nama }));
            await batchSaveStudentsToFirestore(updatedStudents, currentUser.uid);
          } catch (err) {
            console.error('Failed updating students class in Firestore', err);
          }
        }
      }
    }

    if (currentUser) {
      try {
        await saveClassToFirestore(updatedClass, currentUser.uid);
      } catch (err) {
        console.error('Failed updating class in Firestore', err);
      }
    }
  };

  const handleDeleteClass = async (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    const className = cls?.nama;

    // 1. Remove class from state
    setClasses((prev) => prev.filter((c) => c.id !== classId));

    // 2. Unassign students that belonged to the deleted class
    if (className) {
      const affectedStudents = students.filter((s) => (s.kelas || '').trim() === className);
      if (affectedStudents.length > 0) {
        setStudents((prev) =>
          prev.map((s) => ((s.kelas || '').trim() === className ? { ...s, kelas: '' } : s))
        );
        if (currentUser) {
          try {
            const updatedStudents = affectedStudents.map((s) => ({ ...s, kelas: '' }));
            await batchSaveStudentsToFirestore(updatedStudents, currentUser.uid);
          } catch (err) {
            console.error('Failed unassigning students from deleted class in Firestore', err);
          }
        }
      }
    }

    showToast(`Kelas "${className || classId}" berhasil dihapus.`);
    if (currentUser) {
      try {
        await deleteClassFromFirestore(classId);
      } catch (err) {
        console.error('Failed deleting class from Firestore', err);
      }
    }
  };

  const handleBulkMoveStudents = async (
    fromClass: string,
    toClass: string,
    studentIds?: string[]
  ) => {
    const targetIds =
      studentIds && studentIds.length > 0
        ? studentIds
        : students.filter((s) => (s.kelas || '').trim() === fromClass).map((s) => s.id);

    if (targetIds.length === 0) return;

    setStudents((prev) =>
      prev.map((s) => (targetIds.includes(s.id) ? { ...s, kelas: toClass } : s))
    );
    showToast(`${targetIds.length} siswa berhasil dipindahkan ke Kelas ${toClass}.`);

    if (currentUser) {
      try {
        const movedStudents = students
          .filter((s) => targetIds.includes(s.id))
          .map((s) => ({ ...s, kelas: toClass }));
        await batchSaveStudentsToFirestore(movedStudents, currentUser.uid);
      } catch (err) {
        console.error('Failed moving students in Firestore', err);
      }
    }
  };

  // Inter-tab Class Navigation Handlers
  const handleNavigateToStudentsFromClass = (className: string) => {
    setFocusedClassForStudents(className);
    setActiveTab('students');
  };

  const handleNavigateToStudioFromClass = (className: string) => {
    setFocusedClassForStudio(className);
    setActiveTab('studio');
  };

  const handleNavigateToBatchPrintFromClass = (className: string) => {
    const matched = students.filter((s) => (s.kelas || '').trim() === className);
    if (matched.length === 0) {
      showToast(`Belum ada siswa di kelas ${className}.`);
      return;
    }
    setSelectedStudentIds(matched.map((s) => s.id));
    setIsBatchPrintOpen(true);
  };

  const handleTriggerMassDownloadZipFromClass = (className: string) => {
    setFocusedClassForStudio(className);
    setActiveTab('studio');
  };

  // Students to display in batch print
  const studentsToPrint =
    selectedStudentIds.length > 0
      ? students.filter((s) => selectedStudentIds.includes(s.id))
      : students;

  // Resolve student for verification view
  const verifiedStudentFromUrl = React.useMemo(() => {
    if (typeof window === 'undefined' || !verificationNisn) return null;
    const params = new URLSearchParams(window.location.search);
    const namaParam = params.get('nama');
    if (namaParam) {
      return {
        id: `verif-${verificationNisn}`,
        nisn: verificationNisn,
        nis: params.get('nis') || '',
        nama: namaParam,
        kelas: params.get('kelas') || 'X-1',
        jurusan: params.get('jurusan') || 'Fase E (Umum)',
        tempatLahir: params.get('tl') || 'BUKET SEURAJA',
        tanggalLahir: params.get('tgl') || '2009-11-07',
        jenisKelamin: (params.get('jk') === 'P' ? 'P' : 'L') as 'L' | 'P',
        alamat: params.get('alamat') || 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur',
        masaBerlaku: params.get('mb') || '06/2028',
      } as Student;
    }
    const dataParam = params.get('d');
    if (dataParam) {
      const decoded = decodeVerificationPayload(dataParam);
      if (decoded && (decoded.nisn === verificationNisn || !decoded.nisn)) {
        return decoded as Student;
      }
    }
    return null;
  }, [verificationNisn]);

  const activeVerifiedStudent = React.useMemo(() => {
    if (!verificationNisn) return null;
    const cleanNisn = verificationNisn.trim().toLowerCase();
    const found = students.find(
      (s) =>
        s.nisn.toLowerCase() === cleanNisn ||
        (s.nis && s.nis.toLowerCase() === cleanNisn) ||
        s.id.toLowerCase() === cleanNisn
    );
    if (found) return found;
    if (verifiedStudentFromUrl) return verifiedStudentFromUrl;
    return null;
  }, [verificationNisn, students, verifiedStudentFromUrl]);

  // Render Fullscreen Digital Card Verification Portal if ?verify=... is in URL
  if (verificationNisn) {
    return (
      <CardVerificationView
        student={activeVerifiedStudent}
        settings={cardSettings}
        nisnQuery={verificationNisn}
        allStudents={students}
        onSelectStudent={(std) => {
          setVerificationNisn(std.nisn);
          const newUrl = `${window.location.pathname}?verify=${encodeURIComponent(std.nisn)}`;
          window.history.pushState({}, '', newUrl);
        }}
        onBackToDashboard={() => {
          setVerificationNisn(null);
          window.history.pushState({}, '', window.location.pathname);
        }}
      />
    );
  }

  // Render initial loading screen while checking auth
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 mb-4 animate-pulse">
          <img src={SMAN1_JULOK_LOGO_PATH} alt="SMAN 1 Julok" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-white font-bold text-base mb-1">SMA NEGERI 1 JULOK</h2>
        <p className="text-slate-400 text-xs">Memuat sistem kartu pelajar & presensi digital...</p>
      </div>
    );
  }

  // Render Login Page as the default landing page when user is not logged in
  if (!currentUser && !isGuestMode) {
    return (
      <>
        <LoginPage
          onLogin={handleLogin}
          isLoggingIn={isLoggingIn}
          authError={authErrorModalData}
          onClearAuthError={() => setAuthErrorModalData(null)}
          onQuickVerify={handleOpenVerificationByNisn}
          onContinueAsGuest={() => setIsGuestMode(true)}
          schoolName={cardSettings.schoolName || 'SMA NEGERI 1 JULOK'}
          totalStudents={students.length}
          totalClasses={classes.length}
        />

        {/* Diagnostic Modal if popup/redirect issues occur */}
        <AuthTroubleshootModal
          isOpen={!!authErrorModalData}
          onClose={() => setAuthErrorModalData(null)}
          errorCode={authErrorModalData?.code || ''}
          errorMessage={authErrorModalData?.message || ''}
          domain={authErrorModalData?.domain || ''}
          onRetryWithRedirect={() => handleLogin(true)}
          onRetryWithPopup={() => handleLogin(false)}
          students={students}
          classes={classes}
          cardSettings={cardSettings}
          onRestoreBackup={({ students: restoredStudents, classes: restoredClasses, settings: restoredSettings }) => {
            if (restoredStudents && restoredStudents.length > 0) setStudents(restoredStudents);
            if (restoredClasses && restoredClasses.length > 0) setClasses(restoredClasses);
            if (restoredSettings) setCardSettings((prev) => ({ ...prev, ...restoredSettings }));
            showToast('Data cadangan berhasil dipulihkan!');
          }}
        />
      </>
    );
  }

  // Render Fullscreen Batch Print View if active
  if (isBatchPrintOpen) {
    return (
      <BatchPrintView
        students={studentsToPrint}
        settings={cardSettings}
        printSettings={printSettings}
        onUpdatePrintSettings={setPrintSettings}
        onClose={() => setIsBatchPrintOpen(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Guest Mode Notification Banner */}
      {isGuestMode && !currentUser && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-blue-800/40 shadow-xs z-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span className="font-semibold text-blue-200">Mode Pratinjau / Tamu:</span>
            <span className="text-slate-300 hidden sm:inline">
              Data hanya tersimpan di perangkat ini. Masuk dengan Akun Google untuk sinkronisasi otomatis ke cloud.
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => handleLogin(false)}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-blue-600" />
              <span>Masuk dengan Google</span>
            </button>
            <button
              onClick={() => setIsGuestMode(false)}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Ke Halaman Login
            </button>
          </div>
        </div>
      )}
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand & Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-900 p-1 flex items-center justify-center shadow-xs flex-shrink-0">
              <img
                src={cardSettings.schoolLogo}
                alt="Logo SMAN 1 Julok"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  SMA NEGERI 1 JULOK
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Database className="w-2.5 h-2.5" />
                  Cloud DB Aktif
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 font-medium truncate max-w-[200px] sm:max-w-none">
                Sistem Pembuat & Cetak Kartu Pelajar Otomatis
              </p>
            </div>
          </div>

          {/* Center Tabs: Absensi vs Rekap vs Siswa vs Studio vs Kelas */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'attendance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Absensi Siswa</span>
            </button>

            <button
              onClick={() => setActiveTab('records')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'records'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Rekap Kehadiran</span>
            </button>

            <button
              onClick={() => setActiveTab('students')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Data Siswa ({students.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('studio')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Studio Kartu</span>
            </button>

            <button
              onClick={() => setActiveTab('classes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'classes'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Kelas ({classes.length})</span>
            </button>
          </div>

          {/* Right Action Buttons & Cloud Database Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick Scan Barcode Trigger */}
            <button
              onClick={() => setIsScannerModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-extrabold rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
              title="Buka Pemindai Barcode Kamera"
            >
              <Scan className="w-4 h-4 animate-pulse" />
              <span className="hidden sm:inline">Pindai Barcode</span>
            </button>

            {/* Cloud Database Sync & Account */}
            {currentUser ? (
              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-xl p-1">
                <button
                  onClick={handleSyncAllToCloud}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  title="Sinkronkan semua data lokal ke Cloud Firestore"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden xl:inline">Sinkron Cloud</span>
                </button>
                <div className="h-4 w-[1px] bg-emerald-200" />
                <span className="hidden 2xl:inline text-[11px] font-semibold text-emerald-900 px-1 max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Keluar akun"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleLogin(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-2xs transition-all cursor-pointer"
                title="Hubungkan akun Google untuk menyimpan data ke Cloud Firestore"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Hubungkan Akun Google</span>
                <span className="md:hidden">Google</span>
              </button>
            )}

            <button
              onClick={() => {
                const std = students.find((s) => s.id === previewStudentId) || students[0];
                if (std) handleOpenVerification(std);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition-colors cursor-pointer"
              title="Buka Halaman Verifikasi Keaslian Kartu (Simulasi Scan QR)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Verifikasi QR</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition-colors cursor-pointer"
              title="Impor Data Siswa Excel (.xlsx / .xls / .csv)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Impor Excel</span>
            </button>

            <button
              onClick={() => handleTriggerPrint(selectedStudentIds.length > 0 ? 'selected' : 'all')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Cetak Kartu</span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Segmented Tab Switcher */}
        <div className="lg:hidden px-3 py-2 border-t border-slate-100 flex items-center gap-1 bg-slate-50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${
              activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            Absensi
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${
              activeTab === 'records' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Rekap
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${
              activeTab === 'students' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Siswa ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${
              activeTab === 'studio' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${
              activeTab === 'classes' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Kelas ({classes.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 flex-1">
        {/* Multi-Device Cloud Real-Time Sync Status Banner */}
        <div className={`mb-5 rounded-2xl p-3.5 px-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border transition-colors ${
          currentUser
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-2xs ${
              currentUser ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold">
                  {currentUser ? 'Sinkronisasi Antar-Perangkat (Cloud Real-Time):' : 'Status Sinkronisasi Multi-Perangkat:'}
                </span>
                {currentUser ? (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Tersambung Real-Time
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded-full border border-amber-200 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Mode Lokal (Perangkat Ini Saja)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {currentUser
                  ? `Terhubung ke akun ${currentUser.email}. Seluruh perubahan data siswa (${students.length}), foto, dan kelas (${classes.length}) otomatis tersinkronkan langsung ke HP, Laptop, atau PC lain yang Anda buka.`
                  : 'Buka di HP, Laptop, atau Komputer lain? Masuk dengan Akun Google untuk mengakses data siswa, foto, dan kelas yang sama secara realtime tanpa hilang.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
            {currentUser ? (
              <button
                onClick={handleSyncAllToCloud}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleLogin(false)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk Google untuk Sinkron</span>
                </button>
                <button
                  onClick={() =>
                    setAuthErrorModalData({
                      code: 'PANDUAN_SINKRONISASI',
                      message: 'Status autentikasi dan opsi cadangan data lintas-perangkat.',
                      domain: typeof window !== 'undefined' ? window.location.hostname : '',
                    })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
                  title="Bantuan Sinkronisasi & Opsi Ekspor/Impor Cadangan Offline"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Bantuan & Cadangan</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'attendance' ? (
          <AttendanceDashboard
            students={students}
            classes={classes}
            todayRecords={todayAttendanceRecords}
            onOpenScanner={() => setIsScannerModalOpen(true)}
            onNavigateToRecords={() => setActiveTab('records')}
            onNavigateToStudio={() => setActiveTab('studio')}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onQuickManualScan={handleBarcodeDetected}
            isSyncing={isSyncing}
          />
        ) : activeTab === 'records' ? (
          <AttendanceRecordsView
            students={students}
            classes={classes}
            allRecords={attendanceRecords}
            onUpdateRecordStatus={handleUpdateRecordStatus}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onMarkAllUnmarkedAsAlpa={handleMarkAllUnmarkedAsAlpa}
            onOpenCardStudioForStudent={(stdId) => {
              setPreviewStudentId(stdId);
              setActiveTab('studio');
            }}
          />
        ) : activeTab === 'studio' ? (
          <div className="space-y-6">
            {/* Quick Hero Notification banner */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Kustomisasi Kartu Pelajar Tingkat SMA
                </div>
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                  Kartu Pelajar Resmi SMA Negeri 1 Julok • Standar CR-80
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Sesuaikan warna tema, kop dinas, pas foto, QR code verifikasi NISN, dan stempel
                  resmi kepala sekolah. Pratinjau langsung diperbarui secara realtime dan siap dicetak
                  ke kertas A4 maupun kartu PVC.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs transition-colors cursor-pointer border border-white/20"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Impor Excel</span>
                </button>
                <button
                  onClick={() => setActiveTab('students')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Kelola Siswa</span>
                </button>
              </div>
            </div>

            {/* Studio Workspace */}
            <CardStudio
              settings={cardSettings}
              onUpdateSettings={setCardSettings}
              students={students}
              classes={classes}
              initialClass={focusedClassForStudio}
              selectedStudentId={previewStudentId}
              onSelectStudentId={setPreviewStudentId}
              onExportSingleCard={handleExportSingleCard}
              onOpenVerification={handleOpenVerification}
            />
          </div>
        ) : activeTab === 'students' ? (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Basis Data Siswa SMA Negeri 1 Julok
                </h2>
                <p className="text-xs text-slate-500">
                  Kelola profil, unggah pas foto melalui file atau kamera, dan pilih siswa untuk
                  dicetak.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('classes')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                  <span>Manajemen Kelas ({classes.length})</span>
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Impor / Ekspor Excel</span>
                </button>
              </div>
            </div>

            {/* Student Table */}
            <StudentTable
              students={students}
              classes={classes}
              initialClassFilter={focusedClassForStudents}
              onAddStudent={handleAddStudent}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onDeleteSelectedStudents={handleDeleteSelectedStudents}
              selectedStudentIds={selectedStudentIds}
              onToggleSelectStudent={handleToggleSelectStudent}
              onSelectAllStudents={handleSelectAllStudents}
              onOpenCardPreview={(s) => setSinglePreviewStudent(s)}
              onOpenWebcamForStudent={(s) => setWebcamStudent(s)}
              onOpenZipModal={() => setIsZipModalOpen(true)}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onTriggerPrint={handleTriggerPrint}
              onOpenVerification={handleOpenVerification}
              onNavigateToClasses={() => setActiveTab('classes')}
            />
          </div>
        ) : (
          /* Manajemen Kelas Tab */
          <ClassManagement
            classes={classes}
            students={students}
            onAddClass={handleAddClass}
            onUpdateClass={handleUpdateClass}
            onDeleteClass={handleDeleteClass}
            onBulkMoveStudents={handleBulkMoveStudents}
            onNavigateToStudents={handleNavigateToStudentsFromClass}
            onNavigateToStudio={handleNavigateToStudioFromClass}
            onNavigateToBatchPrint={handleNavigateToBatchPrintFromClass}
            onTriggerMassDownloadZip={handleTriggerMassDownloadZipFromClass}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <School className="w-4 h-4 text-blue-700" />
            <span>SMA Negeri 1 Julok, Kabupaten Aceh Timur, Aceh</span>
          </div>
          <div className="text-[11px] text-slate-400">
            NPSN: 10102146 • Akreditasi A • Sistem Generator Kartu Pelajar Digital 2026
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ImportExportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        students={students}
        onImportStudents={handleImportStudents}
        onUpdateStudents={setStudents}
      />

      <ZipPhotoModal
        isOpen={isZipModalOpen}
        onClose={() => setIsZipModalOpen(false)}
        students={students}
        onApplyPhotos={handleApplyPhotosFromZip}
      />

      <SingleCardModal
        isOpen={!!singlePreviewStudent}
        student={singlePreviewStudent}
        settings={cardSettings}
        onClose={() => setSinglePreviewStudent(null)}
        onPrintSingle={handlePrintSingle}
        onExportSingleCard={handleExportSingleCard}
        onOpenVerification={handleOpenVerification}
      />

      <WebcamModal
        isOpen={!!webcamStudent}
        student={webcamStudent}
        onClose={() => setWebcamStudent(null)}
        onPhotoCaptured={(std, photoUrl) => {
          handleUpdateStudent({ ...std, foto: photoUrl });
        }}
      />

      <AuthTroubleshootModal
        isOpen={!!authErrorModalData}
        onClose={() => setAuthErrorModalData(null)}
        errorCode={authErrorModalData?.code || ''}
        errorMessage={authErrorModalData?.message || ''}
        domain={authErrorModalData?.domain || ''}
        onRetryWithRedirect={() => handleLogin(true)}
        onRetryWithPopup={() => handleLogin(false)}
        students={students}
        classes={classes}
        cardSettings={cardSettings}
        onRestoreBackup={({ students: restoredStudents, classes: restoredClasses, settings: restoredSettings }) => {
          if (restoredStudents && restoredStudents.length > 0) setStudents(restoredStudents);
          if (restoredClasses && restoredClasses.length > 0) setClasses(restoredClasses);
          if (restoredSettings) setCardSettings((prev) => ({ ...prev, ...restoredSettings }));
          showToast('Data cadangan berhasil dipulihkan!');
        }}
      />

      {/* Barcode Camera & USB Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
        onBarcodeDetected={handleBarcodeDetected}
      />

      {/* Barcode Scan Result Notification Modal with Student Photo & Status */}
      <AttendanceNotificationModal
        isOpen={!!scanNotification}
        onClose={() => setScanNotification(null)}
        record={scanNotification?.record || null}
        student={scanNotification?.student || null}
        onUpdateStatus={(newStatus, note) => {
          if (scanNotification) {
            handleUpdateRecordStatus(
              scanNotification.record.id,
              newStatus,
              scanNotification.student,
              scanNotification.record.date,
              note
            );
          }
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 transition-all animate-bounce-once">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
