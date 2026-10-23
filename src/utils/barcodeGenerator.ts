import QRCode from 'qrcode';
import { Student, CardSettings } from '../types';

/**
 * Generate high quality QR code data URL
 */
export async function generateQrDataUrl(text: string, color = '#0f172a'): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: color,
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR Code:', err);
    return '';
  }
}

/**
 * Get base URL for active verification link
 */
export function getAppBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    const origin = window.location.origin;
    if (origin && origin.startsWith('http') && origin !== 'null' && !origin.includes('about:blank')) {
      const cleanPath = window.location.pathname.replace(/\/$/, '');
      return `${origin}${cleanPath}`;
    }
  }
  // Default to the provided deployment shared app URL
  return 'https://ais-pre-qpz6ffx3eczklto7nc75cz-353035226398.asia-southeast1.run.app';
}

/**
 * Construct an active verification URL that opens the authenticity preview portal
 * Starts with https:// so smartphone cameras immediately prompt to open as a web link
 */
export function buildStudentVerificationUrl(student: Student, settings?: CardSettings): string {
  const baseUrl = getAppBaseUrl();
  const params = new URLSearchParams();
  
  // Mandatory verification identifier
  params.set('verify', student.nisn || student.id);
  
  // Clean readable student parameters so phone cameras can verify instantly anywhere
  if (student.nama) params.set('nama', student.nama);
  if (student.nis) params.set('nis', student.nis);
  if (student.kelas) params.set('kelas', student.kelas);
  if (student.tempatLahir) params.set('tl', student.tempatLahir);
  if (student.tanggalLahir) params.set('tgl', student.tanggalLahir);
  if (student.jenisKelamin) params.set('jk', student.jenisKelamin);
  if (student.masaBerlaku) params.set('mb', student.masaBerlaku);

  return `${baseUrl}/?${params.toString()}`;
}

/**
 * Decode compact verification payload from URL parameter
 */
export function decodeVerificationPayload(encodedStr: string): Partial<Student> | null {
  try {
    const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(encodedStr))));
    const parsed = JSON.parse(jsonStr);
    return {
      id: parsed.id || `verif-${parsed.nisn}`,
      nisn: parsed.nisn,
      nis: parsed.nis || '',
      nama: parsed.nama || 'SISWA TERVERIFIKASI',
      kelas: parsed.kelas || '',
      jurusan: parsed.jurusan || '',
      tempatLahir: parsed.tl || '',
      tanggalLahir: parsed.tgl || '',
      jenisKelamin: parsed.jk === 'P' ? 'P' : 'L',
      alamat: parsed.al || '',
      masaBerlaku: parsed.mb || '06/2028',
    };
  } catch (e) {
    console.warn('Failed decoding verification payload', e);
    return null;
  }
}

/**
 * Resolve QR text string according to CardSettings
 * Always guarantees returning an active https:// link so scanning with any phone camera
 * immediately opens the student's authentic card preview!
 */
export function getQrStringForStudent(student: Student, settings?: CardSettings): string {
  // Always return the active URL verification link so scanning with camera is 100% active
  return buildStudentVerificationUrl(student, settings);
}

/**
 * Generate SVG Barcode (Code128 simulated visual) for high fidelity printing
 */
export function generateBarcodeSvg(code: string, width = 160, height = 36): string {
  // Simple deterministic Code128-like pattern based on ASCII chars
  const cleanCode = (code || '0000000000').trim();
  let barsHtml = '';
  let curX = 4;
  
  // Start pattern
  barsHtml += `<rect x="${curX}" y="0" width="2" height="${height - 10}" fill="#0f172a" />`;
  curX += 3;
  barsHtml += `<rect x="${curX}" y="0" width="1" height="${height - 10}" fill="#0f172a" />`;
  curX += 3;

  for (let i = 0; i < cleanCode.length; i++) {
    const charCode = cleanCode.charCodeAt(i);
    const b1 = (charCode % 3) + 1;
    const s1 = ((charCode >> 1) % 2) + 1;
    const b2 = ((charCode >> 2) % 3) + 1;
    const s2 = ((charCode >> 3) % 2) + 1;

    barsHtml += `<rect x="${curX}" y="0" width="${b1}" height="${height - 10}" fill="#0f172a" />`;
    curX += b1 + s1;
    barsHtml += `<rect x="${curX}" y="0" width="${b2}" height="${height - 10}" fill="#0f172a" />`;
    curX += b2 + s2;
  }

  // Stop pattern
  barsHtml += `<rect x="${curX}" y="0" width="2" height="${height - 10}" fill="#0f172a" />`;
  curX += 4;
  barsHtml += `<rect x="${curX}" y="0" width="1" height="${height - 10}" fill="#0f172a" />`;
  curX += 4;

  const totalWidth = Math.max(curX + 4, width);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="${totalWidth}" height="${height}">
    <rect width="${totalWidth}" height="${height}" fill="#ffffff" rx="2" />
    ${barsHtml}
    <text x="${totalWidth / 2}" y="${height - 1}" font-family="'Space Mono', monospace, Courier" font-size="7.5" font-weight="700" text-anchor="middle" fill="#334155" letter-spacing="1.5">
      ${cleanCode}
    </text>
  </svg>`;
}
