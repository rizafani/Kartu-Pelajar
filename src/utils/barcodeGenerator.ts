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
 * Resolve QR text string according to CardSettings
 */
export function getQrStringForStudent(student: Student, settings: CardSettings): string {
  switch (settings.qrContent) {
    case 'nis':
      return student.nis || student.nisn;
    case 'all_info':
      return JSON.stringify({
        sekolah: settings.schoolName,
        nisn: student.nisn,
        nis: student.nis,
        nama: student.nama,
        kelas: student.kelas,
        ttl: `${student.tempatLahir}, ${student.tanggalLahir}`,
        jk: student.jenisKelamin,
      });
    case 'url':
      return `https://sman1julok.sch.id/siswa/verifikasi/${student.nisn}`;
    case 'nisn':
    default:
      return student.nisn;
  }
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
