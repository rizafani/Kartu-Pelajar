import { Student, AttendanceRecord, AttendanceStatus } from '../types';
import { decodeVerificationPayload } from './barcodeGenerator';

export const ATTENDANCE_CUTOFF_HOUR = 7;
export const ATTENDANCE_CUTOFF_MINUTE = 15;

/**
 * Format current date as YYYY-MM-DD
 */
export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for Indonesian display
 * e.g. "Sabtu, 31 Oktober 2026"
 */
export function formatIndonesianDate(dateStrOrObj: string | Date): string {
  const date = typeof dateStrOrObj === 'string' ? new Date(dateStrOrObj) : dateStrOrObj;
  if (isNaN(date.getTime())) return String(dateStrOrObj);

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format time as HH:mm:ss WIB
 */
export function formatIndonesianTime(d: Date = new Date()): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds} WIB`;
}

/**
 * Determine default attendance status based on scan time
 * Before 07:15 -> hadir
 * After 07:15 -> terlambat
 */
export function determineAttendanceStatus(
  d: Date = new Date(),
  cutoffHour = ATTENDANCE_CUTOFF_HOUR,
  cutoffMin = ATTENDANCE_CUTOFF_MINUTE
): AttendanceStatus {
  const currentMinutes = d.getHours() * 60 + d.getMinutes();
  const cutoffMinutes = cutoffHour * 60 + cutoffMin;

  if (currentMinutes <= cutoffMinutes) {
    return 'hadir';
  }
  return 'terlambat';
}

/**
 * Extract NISN from various barcode formats:
 * - Direct NISN digits: "0078129301"
 * - Card URL: "https://.../?verify=0078129301"
 * - Compressed payload: "...?d=H4sI..."
 * - JSON: '{"nisn":"0078129301"}'
 */
export function extractNisnFromBarcode(scannedText: string): string | null {
  if (!scannedText) return null;
  const clean = scannedText.trim();

  // 1. Direct number check (e.g. 10 digits standard NISN, or NIS)
  if (/^\d{4,16}$/.test(clean)) {
    return clean;
  }

  // 2. URL parsing check
  if (clean.includes('verify=') || clean.includes('?verify=')) {
    try {
      const url = new URL(clean, 'https://example.com');
      const param = url.searchParams.get('verify');
      if (param) return param.trim();
    } catch {
      // Regex fallback
      const match = clean.match(/verify=([^&#\s]+)/);
      if (match && match[1]) return decodeURIComponent(match[1]).trim();
    }
  }

  // 3. Payload d=... parameter check
  if (clean.includes('d=')) {
    try {
      const url = new URL(clean, 'https://example.com');
      const dParam = url.searchParams.get('d');
      if (dParam) {
        const decoded = decodeVerificationPayload(dParam);
        if (decoded && decoded.nisn) return decoded.nisn.trim();
      }
    } catch {
      // ignore
    }
  }

  // 4. JSON payload
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed.nisn) return String(parsed.nisn).trim();
      if (parsed.id) return String(parsed.id).trim();
    } catch {
      // ignore
    }
  }

  // 5. If it contains alphanumeric NISN (e.g. "NISN: 0071234567")
  const matchNisnPrefix = clean.match(/(?:nisn|nis)[:\s\-]*([0-9a-zA-Z]+)/i);
  if (matchNisnPrefix && matchNisnPrefix[1]) {
    return matchNisnPrefix[1].trim();
  }

  return clean;
}

/**
 * Find matching student from school database using extracted identifier
 */
export function findStudentByNisnOrId(identifier: string, students: Student[]): Student | null {
  if (!identifier) return null;
  const idNormalized = identifier.trim().toLowerCase();

  return (
    students.find(
      (s) =>
        s.nisn.toLowerCase() === idNormalized ||
        (s.nis && s.nis.toLowerCase() === idNormalized) ||
        s.id.toLowerCase() === idNormalized ||
        s.nama.toLowerCase() === idNormalized
    ) || null
  );
}

/**
 * Create or update an attendance record
 */
export function createAttendanceRecord(
  student: Student,
  dateStr = getTodayDateString(),
  forcedStatus?: AttendanceStatus,
  method: 'barcode_scan' | 'manual_entry' | 'qr_scan' = 'barcode_scan',
  userId?: string
): AttendanceRecord {
  const now = new Date();
  const status = forcedStatus || determineAttendanceStatus(now);

  return {
    id: `att-${dateStr}-${student.id}`,
    studentId: student.id,
    nisn: student.nisn,
    nis: student.nis,
    nama: student.nama,
    kelas: student.kelas,
    jurusan: student.jurusan,
    foto: student.foto,
    date: dateStr,
    timestamp: now.getTime(),
    timeString: formatIndonesianTime(now),
    status,
    method,
    ownerId: userId,
  };
}
