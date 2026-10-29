import { Student, ClassInfo, CardSettings } from '../types';

export interface AppCompleteBackup {
  version: string;
  exportedAt: string;
  schoolName: string;
  studentsCount: number;
  classesCount: number;
  students: Student[];
  classes: ClassInfo[];
  settings: CardSettings;
}

/**
 * Export all students, classes, and card settings into a single downloadable JSON backup
 */
export function exportCompleteBackup(
  students: Student[],
  classes: ClassInfo[],
  settings: CardSettings
) {
  const backupData: AppCompleteBackup = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    schoolName: settings.schoolName || 'SMA Negeri 1 Julok',
    studentsCount: students.length,
    classesCount: classes.length,
    students,
    classes,
    settings,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cadangan_Lengkap_Kartu_Pelajar_SMAN1_Julok_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate an uploaded JSON backup file
 */
export async function importCompleteBackup(
  file: File
): Promise<{ students: Student[]; classes: ClassInfo[]; settings?: Partial<CardSettings> }> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('Berkas cadangan tidak valid (Format JSON rusak).');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Format berkas cadangan tidak dikenali.');
  }

  const students: Student[] = Array.isArray(parsed.students) ? parsed.students : [];
  const classes: ClassInfo[] = Array.isArray(parsed.classes) ? parsed.classes : [];
  const settings: Partial<CardSettings> | undefined =
    parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : undefined;

  if (students.length === 0 && classes.length === 0) {
    throw new Error('Berkas cadangan kosong (tidak ada data siswa atau kelas yang ditemukan).');
  }

  return { students, classes, settings };
}
