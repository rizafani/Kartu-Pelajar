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
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { CardSettings, PrintSettings, Student, ClassInfo } from './types';
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
import { BatchPrintView } from './components/BatchPrintView';
import { SingleCardModal } from './components/SingleCardModal';
import { WebcamModal } from './components/WebcamModal';
import { CardVerificationView } from './components/CardVerificationView';
import { downloadCardAsPng, CardResolution, RESOLUTION_OPTIONS } from './utils/cardExporter';
import { decodeVerificationPayload } from './utils/barcodeGenerator';
import {
  auth,
  db,
  testConnection,
  signInWithGoogle,
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
  handleFirestoreError,
  OperationType,
} from './firebase';

const STORAGE_KEY_STUDENTS = 'sman1_julok_students_v2';
const STORAGE_KEY_SETTINGS = 'sman1_julok_settings_v2';
const STORAGE_KEY_CLASSES = 'sman1_julok_classes_v2';

export default function App() {
  // Authentication & Cloud Database State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [cloudStudentCount, setCloudStudentCount] = useState<number>(0);
  const isInitialCloudLoad = useRef(true);

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

  // Save classes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(classes));
    } catch (e) {
      console.error('Failed saving classes to storage', e);
    }
  }, [classes]);



  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);

  // Active view tab: 'studio' (Designer) vs 'students' (Database Roster) vs 'classes' (Manajemen Kelas)
  const [activeTab, setActiveTab] = useState<'studio' | 'students' | 'classes'>('studio');

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

  // Test connection on initial app boot
  useEffect(() => {
    testConnection().then((connected) => {
      setIsCloudConnected(connected);
      if (connected) {
        console.log('Firebase Firestore connection verified.');
      }
    });
  }, []);

  // Listen to Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        showToast(`Terhubung sebagai ${user.displayName || user.email}`);
        // Load cloud settings and classes if available
        try {
          const [cloudSettings, cloudClasses] = await Promise.all([
            loadSettingsFromFirestore(user.uid),
            loadClassesFromFirestore(user.uid),
          ]);
          if (cloudSettings) {
            setCardSettings((prev) => ({ ...prev, ...cloudSettings }));
          }
          if (cloudClasses && cloudClasses.length > 0) {
            setClasses(cloudClasses);
          }
        } catch (err) {
          console.warn('Could not load remote settings or classes', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Students in realtime from Firestore when user is authenticated
  useEffect(() => {
    if (!currentUser) return;

    const pathForOnSnapshot = 'students';
    const q = query(collection(db, pathForOnSnapshot), where('ownerId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(
      q,
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

          // Only replace local if remote has data
          if (isInitialCloudLoad.current) {
            setStudents(remoteStudents);
            isInitialCloudLoad.current = false;
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, pathForOnSnapshot);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Persist students to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
    } catch (e) {
      console.error('Storage full or error saving students', e);
    }
  }, [students]);

  // Persist card settings to localStorage and Firestore
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(cardSettings));
    } catch (e) {
      console.error('Storage full or error saving settings', e);
    }

    if (currentUser) {
      saveSettingsToFirestore(cardSettings, currentUser.uid).catch((err) => {
        console.warn('Failed auto-saving settings to Cloud', err);
      });
    }
  }, [cardSettings, currentUser]);

  // Cloud Sync Handler: upload all current local students to Firestore
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
      await batchSaveStudentsToFirestore(students, currentUser.uid);
      await batchSaveClassesToFirestore(classes, currentUser.uid);
      await saveSettingsToFirestore(cardSettings, currentUser.uid);
      setCloudStudentCount(students.length);
      showToast(`Berhasil menyinkronkan ${students.length} data siswa & ${classes.length} kelas ke Cloud Firestore!`);
    } catch (err) {
      console.error('Sync failed', err);
      showToast('Gagal menyinkronkan ke database cloud.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Login handler
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Login error', err);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOutUser();
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

          {/* Center Tabs: Studio vs Daftar Siswa */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('studio')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Studio Desain</span>
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
              onClick={() => setActiveTab('classes')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'classes'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Manajemen Kelas ({classes.length})</span>
            </button>
          </div>

          {/* Right Action Buttons & Cloud Database Auth */}
          <div className="flex items-center gap-1.5 sm:gap-2">
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
                  <span className="hidden md:inline">Sinkron Cloud</span>
                </button>
                <div className="h-4 w-[1px] bg-emerald-200" />
                <span className="hidden xl:inline text-[11px] font-semibold text-emerald-900 px-1 max-w-[120px] truncate">
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
                onClick={handleLogin}
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
              className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300 transition-colors cursor-pointer"
              title="Buka Halaman Verifikasi Keaslian Kartu (Simulasi Scan QR)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">Verifikasi QR</span>
            </button>

            <button
              onClick={() => setIsZipModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-bold rounded-xl border border-blue-200 transition-colors cursor-pointer"
              title="Upload Foto Massal dari Berkas ZIP sesuai NIS"
            >
              <FileArchive className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Foto ZIP</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200/80 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Impor Excel</span>
            </button>

            <button
              onClick={() => handleTriggerPrint(selectedStudentIds.length > 0 ? 'selected' : 'all')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>
                Cetak{' '}
                {selectedStudentIds.length > 0
                  ? `(${selectedStudentIds.length})`
                  : `(${students.length})`}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile View Segmented Tab Switcher */}
        <div className="sm:hidden px-4 py-2 border-t border-slate-100 flex items-center gap-2 bg-slate-50">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg text-center ${
              activeTab === 'studio' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Studio
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg text-center ${
              activeTab === 'students' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Siswa ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg text-center ${
              activeTab === 'classes' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            Kelas ({classes.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 flex-1">
        {/* Cloud Database Integration Status Banner */}
        <div className="mb-5 bg-white border border-emerald-200/80 rounded-2xl p-3.5 px-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-900">Database Cloud Firestore:</span>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Aktif & Terhubung
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {currentUser
                  ? `Terhubung ke akun ${currentUser.email}. ${cloudStudentCount > 0 ? `${cloudStudentCount} siswa tersimpan di cloud.` : 'Klik tombol sinkronisasi untuk menyimpan data ke Cloud Firestore.'}`
                  : 'Database cloud telah aktif. Hubungkan akun Google untuk menyinkronkan data siswa & desain antar-perangkat secara otomatis.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
            {currentUser ? (
              <button
                onClick={handleSyncAllToCloud}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Data ke Cloud'}</span>
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Hubungkan Akun Google</span>
              </button>
            )}
          </div>
        </div>

        {activeTab === 'studio' ? (
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
