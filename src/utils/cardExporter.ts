import JSZip from 'jszip';
import { CardSettings, Student } from '../types';
import { generateBarcodeSvg, generateQrDataUrl, getQrStringForStudent } from './barcodeGenerator';

export type CardResolution = 'medium' | 'high' | 'ultra' | 'max';

export interface ResolutionSetting {
  id: CardResolution;
  name: string;
  badge: string;
  dpi: number;
  scale: number;
  dimLandscape: string;
  dimPortrait: string;
  desc: string;
  fileSizeApprox: string;
}

export const RESOLUTION_OPTIONS: ResolutionSetting[] = [
  {
    id: 'medium',
    name: 'Sedang (Web & Arsip)',
    badge: '150 DPI',
    dpi: 150,
    scale: 0.5,
    dimLandscape: '506 × 319 px',
    dimPortrait: '319 × 506 px',
    desc: 'Ukuran file ringan (~120 KB), cepat dibagikan via WhatsApp & portal web.',
    fileSizeApprox: '~120 KB',
  },
  {
    id: 'high',
    name: 'Standar Cetak HD (CR-80)',
    badge: '300 DPI',
    dpi: 300,
    scale: 1.0,
    dimLandscape: '1012 × 638 px',
    dimPortrait: '638 × 1012 px',
    desc: 'Standar resmi kartu PVC CR-80 industri untuk printer kartu & digital print.',
    fileSizeApprox: '~450 KB',
  },
  {
    id: 'ultra',
    name: 'Sangat Tinggi (Super HD)',
    badge: '450 DPI',
    dpi: 450,
    scale: 1.5,
    dimLandscape: '1518 × 957 px',
    dimPortrait: '957 × 1518 px',
    desc: 'Detail sangat tajam untuk printer foto resolusi tinggi & cetak lembaran.',
    fileSizeApprox: '~950 KB',
  },
  {
    id: 'max',
    name: 'Maksimal (Ultra HD / Retransfer)',
    badge: '600 DPI',
    dpi: 600,
    scale: 2.0,
    dimLandscape: '2024 × 1276 px',
    dimPortrait: '1276 × 2024 px',
    desc: 'Resolusi puncak mesin cetak PVC thermal retransfer kelas percetakan profesional.',
    fileSizeApprox: '~1.8 MB',
  },
];

/**
 * Render a CR-80 card image with selectable resolution from medium (150 DPI) to maximum (600 DPI)
 */
export async function renderCardToBlob(
  student: Student,
  settings: CardSettings,
  side: 'front' | 'back',
  resolution: CardResolution = 'high'
): Promise<Blob | null> {
  const resConfig = RESOLUTION_OPTIONS.find((r) => r.id === resolution) || RESOLUTION_OPTIONS[1];
  const scale = resConfig.scale;

  const isLandscape = settings.orientation === 'landscape';
  // Standard CR-80 base coordinate system: 1012 x 638 pixels
  const width = isLandscape ? 1012 : 638;
  const height = isLandscape ? 638 : 1012;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const primaryNavy = settings.primaryColor || '#0b3565';
  const secondaryNavy = settings.secondaryColor || '#16487e';
  const accentGold = settings.accentColor || '#d97706';

  if (side === 'front') {
    // Watermark
    if (settings.showWatermark && settings.schoolLogo) {
      const wmImg = await loadImage(settings.schoolLogo);
      if (wmImg) {
        ctx.save();
        ctx.globalAlpha = settings.watermarkOpacity || 0.08;
        ctx.drawImage(wmImg, width / 2 - 200, height / 2 - 200, 400, 400);
        ctx.restore();
      }
    }

    // Resolve theme banner colors based on active template
    let bannerColor = primaryNavy;
    let nisnColor = accentGold;

    if (settings.templateStyle === 'garuda_emas') {
      bannerColor = '#b45309';
      nisnColor = '#fde047';
    } else if (settings.templateStyle === 'batik_nusantara') {
      bannerColor = '#7f1d1d';
      nisnColor = '#fde047';
    } else if (settings.templateStyle === 'kartu_hijau_islami') {
      bannerColor = '#064e3b';
      nisnColor = '#a7f3d0';
    } else if (settings.templateStyle === 'cyber_smart_id') {
      bannerColor = '#0f172a';
      nisnColor = '#38bdf8';
    }

      // 1. Kop Surat Kedinasan: Kiri Logo Sekolah, Kanan Logo Pemerintah Aceh
      if (settings.schoolLogo) {
        const sLogo = await loadImage(settings.schoolLogo);
        if (sLogo) ctx.drawImage(sLogo, 40, 16, 92, 92);
      }
      if (settings.showPancasila && settings.pancasilaLogo) {
        const pImg = await loadImage(settings.pancasilaLogo);
        if (pImg) ctx.drawImage(pImg, width - 120, 16, 76, 92);
      }

      // Center Official Kop Text
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(settings.provinsiText || 'PEMERINTAH ACEH', width / 2 + 10, 34);

      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(settings.dinasText || 'DINAS PENDIDIKAN', width / 2 + 10, 56);

      ctx.fillStyle = primaryNavy;
      ctx.font = '900 30px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(settings.schoolName || 'SMA NEGERI 1 JULOK', width / 2 + 10, 87);

      ctx.fillStyle = '#475569';
      ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        `${settings.schoolAddress || 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur 24458'}  •  NPSN: ${settings.npsn || '10101877'}`,
        width / 2 + 10,
        107
      );

      // Official Double Rule Separator
      ctx.fillStyle = primaryNavy;
      ctx.fillRect(35, 116, width - 70, 5);
      ctx.fillRect(35, 124, width - 70, 2);

      // 2. Card Title Banner
      ctx.fillStyle = bannerColor;
      ctx.fillRect(0, 134, width, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 19px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(settings.cardTitle || 'KARTU TANDA PELAJAR', 45, 159);

      ctx.fillStyle = nisnColor;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`NISN: ${student.nisn}`, width - 45, 159);

      // 3. Student Photo (Left Column - 195px x 260px)
      const photoX = 45;
      const photoY = 185;
      const photoW = 195;
      const photoH = 260;
      const radius = 8;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(photoX, photoY, photoW, photoH, radius);
      ctx.clip();
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(photoX, photoY, photoW, photoH);
      const studentPhoto = await loadImage(student.foto || '');
      if (studentPhoto) {
        ctx.drawImage(studentPhoto, photoX, photoY, photoW, photoH);
      }
      ctx.restore();

      // Photo frame border
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(photoX, photoY, photoW, photoH, radius);
      ctx.strokeStyle = primaryNavy;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Under photo: NIS badge
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(photoX, 455, photoW, 36);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(photoX, 455, photoW, 36);
      ctx.fillStyle = primaryNavy;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`NIS: ${student.nis || '-'}`, photoX + photoW / 2, 478);

      // 4. Student Identity Table (Center Column)
      const tableX = 265;
      const colonX = 430;
      const valX = 450;

      const rows = [
        { label: 'NIS / NISN', val: `${student.nis || '-'} / ${student.nisn}`, mono: true },
        { label: 'Nama Lengkap', val: student.nama.toUpperCase(), bold: true, color: primaryNavy, size: '22px' },
        { label: 'Tempat, Tgl Lahir', val: `${(student.tempatLahir || '').toUpperCase()}, ${student.tanggalLahir}` },
        { label: 'Jenis Kelamin', val: student.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)' },
        { label: 'Alamat', val: student.alamat || '-' },
        { label: 'Berlaku S/D', val: `${student.masaBerlaku || '06/2028'} (Selama Siswa Aktif)`, bold: true, color: '#166534' },
      ];

      let rowY = 220;
      rows.forEach((r) => {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(r.label, tableX, rowY);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText(':', colonX, rowY);

        ctx.fillStyle = r.color || '#0f172a';
        ctx.font = r.mono
          ? 'bold 17px monospace'
          : r.bold
          ? `900 ${r.size || '17px'} "Plus Jakarta Sans", sans-serif`
          : '600 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(r.val, valX, rowY);

        rowY += 45;
      });

      // 5. Official Bottom Footer
      ctx.fillStyle = primaryNavy;
      ctx.fillRect(0, height - 36, width, 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('KARTU IDENTITAS RESMI SISWA  •  DINAS PENDIDIKAN PROVINSI ACEH', 45, height - 13);
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('CR80 ISO-7810 / RESMI', width - 45, height - 13);

    // Common Front Right: QR Code & Endorsement
    const qrString = getQrStringForStudent(student, settings);
    const qrUrl = await generateQrDataUrl(qrString, primaryNavy);
    const qrImg = await loadImage(qrUrl);
    if (qrImg) {
      ctx.drawImage(qrImg, width - 215, 180, 155, 155);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('SCAN VALIDASI', width - 137, 350);
    }

    // Right Section: Endorsement
    const endorseX = width - 137;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${settings.kotaPenerbit || 'Julok'}, ${settings.tanggalTerbit || '15 Juli 2024'}`, endorseX, 376);
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(settings.kepalaSekolahJabatan || 'Kepala Sekolah', endorseX, 397);

    // Signature
    if (settings.showTandaTangan && settings.tandaTanganUrl) {
      const sigImg = await loadImage(settings.tandaTanganUrl);
      if (sigImg) {
        ctx.drawImage(sigImg, endorseX - 90, 404, 180, 72);
      }
    }

    // Official Stamp (overlaid)
    if (settings.showStempel && settings.stempelUrl) {
      const stampImg = await loadImage(settings.stempelUrl);
      if (stampImg) {
        ctx.save();
        ctx.globalAlpha = 0.88;
        ctx.drawImage(stampImg, endorseX - 115, 395, 110, 110);
        ctx.restore();
      }
    }

    // Name & NIP
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(settings.kepalaSekolahNama || 'Irmi, S.Pd., M.Pd', endorseX, 488);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px monospace';
    ctx.fillText(`NIP. ${settings.kepalaSekolahNip || '1980102 200504 2 001'}`, endorseX, 510);
  } else {
    // ==========================================
    // BACK SIDE (TATA TERTIB & BARCODE RESMI)
    // ==========================================
    ctx.fillStyle = primaryNavy;
    ctx.fillRect(0, 0, width, 68);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${settings.schoolName || 'SMA NEGERI 1 JULOK'} • CARD ID: ${student.nisn}`, 35, 42);

    ctx.fillStyle = accentGold;
    ctx.textAlign = 'right';
    ctx.fillText('OFFICIAL SMART ID', width - 35, 42);

    // Title
    ctx.fillStyle = primaryNavy;
    ctx.font = '900 24px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(settings.backTitle || 'TATA TERTIB & KETENTUAN KARTU PELAJAR', width / 2, 120);

    // Rules
    let ruleY = 165;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';

    settings.backRules.forEach((rule, idx) => {
      ctx.fillText(`${idx + 1}.  ${rule}`, 55, ruleY);
      ruleY += 40;
    });

    // Return Notice Box
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(55, ruleY + 5, width - 110, 42, 6);
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      'Barang siapa menemukan kartu ini mohon dikembalikan ke pihak sekolah atau pos kepolisian terdekat.',
      width / 2,
      ruleY + 31
    );

    // Barcode & Active QR Verification Link
    const barcodeSvgStr = generateBarcodeSvg(student.nisn, 480, 80);
    const barcodeDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(barcodeSvgStr)}`;
    const barcodeImg = await loadImage(barcodeDataUrl);
    if (barcodeImg) {
      ctx.drawImage(barcodeImg, 60, height - 170, 480, 80);
    }

    const backQrString = getQrStringForStudent(student, settings);
    const backQrUrl = await generateQrDataUrl(backQrString, primaryNavy);
    const backQrImg = await loadImage(backQrUrl);
    if (backQrImg) {
      ctx.drawImage(backQrImg, width - 200, height - 175, 125, 125);
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#0284c7';
      ctx.fillText('SCAN LINK', width - 138, height - 42);
    }

    // Footnote
    ctx.textAlign = 'center';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(settings.backFooterNote || 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur 24458', width / 2, height - 62);

    // Bottom strip
    ctx.fillStyle = primaryNavy;
    ctx.fillRect(0, height - 36, width, 36);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`${settings.schoolName || 'SMA NEGERI 1 JULOK'}  •  ${settings.provinsiText || 'KABUPATEN ACEH TIMUR'}`, width / 2, height - 13);
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Download a single student card as PNG image with selectable resolution
 */
export async function downloadCardAsPng(
  student: Student,
  settings: CardSettings,
  side: 'front' | 'back',
  resolution: CardResolution = 'high'
) {
  const resConfig = RESOLUTION_OPTIONS.find((r) => r.id === resolution) || RESOLUTION_OPTIONS[1];
  const blob = await renderCardToBlob(student, settings, side, resolution);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanName = student.nama.replace(/[^a-zA-Z0-9]/g, '_');
  const dpiTag = resConfig.badge.replace(/\s+/g, '');
  a.download = `Kartu_SMAN1_Julok_${cleanName}_${side}_${dpiTag}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Mass download all student cards for a specific class in image format (PNG packed in ZIP)
 * with selectable resolution from medium (150 DPI) to maximum (600 DPI)
 */
export async function downloadClassCardsAsZip(
  students: Student[],
  className: string,
  settings: CardSettings,
  sideOption: 'front' | 'back' | 'both' = 'both',
  resolution: CardResolution = 'high',
  onProgress?: (current: number, total: number, label: string) => void
): Promise<void> {
  const resConfig = RESOLUTION_OPTIONS.find((r) => r.id === resolution) || RESOLUTION_OPTIONS[1];
  const dpiTag = resConfig.badge.replace(/\s+/g, '');
  const zip = new JSZip();
  const cleanClass = (className || 'Semua_Kelas').replace(/[^a-zA-Z0-9]/g, '_');
  const folder = zip.folder(`Kartu_Kelas_${cleanClass}_${dpiTag}`);

  const totalSteps = sideOption === 'both' ? students.length * 2 : students.length;
  let currentStep = 0;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const num = String(i + 1).padStart(2, '0');
    const safeName = student.nama.replace(/[^a-zA-Z0-9]/g, '_');
    const nisn = student.nisn || '0000000000';

    if (sideOption === 'front' || sideOption === 'both') {
      currentStep++;
      if (onProgress) {
        onProgress(currentStep, totalSteps, `${student.nama} (Depan - ${resConfig.badge})`);
      }
      const frontBlob = await renderCardToBlob(student, settings, 'front', resolution);
      if (frontBlob) {
        folder?.file(`${num}_${nisn}_${safeName}_Depan_${dpiTag}.png`, frontBlob);
      }
    }

    if (sideOption === 'back' || sideOption === 'both') {
      currentStep++;
      if (onProgress) {
        onProgress(currentStep, totalSteps, `${student.nama} (Belakang - ${resConfig.badge})`);
      }
      const backBlob = await renderCardToBlob(student, settings, 'back', resolution);
      if (backBlob) {
        folder?.file(`${num}_${nisn}_${safeName}_Belakang_${dpiTag}.png`, backBlob);
      }
    }
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipContent);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Kartu_Pelajar_Kelas_${cleanClass}_SMAN1_Julok_${sideOption}_${dpiTag}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
