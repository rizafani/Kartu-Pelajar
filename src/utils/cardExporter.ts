import { CardSettings, Student } from '../types';
import { generateBarcodeSvg, generateQrDataUrl, getQrStringForStudent } from './barcodeGenerator';

/**
 * Render a high-resolution 300 DPI CR-80 card image (1012 x 638 pixels) onto canvas and trigger download
 */
export async function downloadCardAsPng(
  student: Student,
  settings: CardSettings,
  side: 'front' | 'back'
) {
  const isLandscape = settings.orientation === 'landscape';
  // Standard CR-80 at 300 DPI: 1012 x 638 pixels
  const width = isLandscape ? 1012 : 638;
  const height = isLandscape ? 638 : 1012;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

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

    if (settings.templateStyle === 'canva_modern') {
      // ==========================================
      // CANVA MODERN (CURVED WAVE DESIGN)
      // ==========================================
      // Left: Logo Sekolah
      if (settings.schoolLogo) {
        const logoImg = await loadImage(settings.schoolLogo);
        if (logoImg) ctx.drawImage(logoImg, 35, 20, 100, 110);
      }
      // Right: Logo Pemerintah Aceh
      if (settings.showPancasila && settings.pancasilaLogo) {
        const pImg = await loadImage(settings.pancasilaLogo);
        if (pImg) ctx.drawImage(pImg, width - 130, 20, 85, 110);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = primaryNavy;
      ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(settings.cardTitle || 'KARTU PELAJAR', width / 2 + 30, 52);

      ctx.font = '800 27px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(settings.schoolName || 'SMA NEGERI 1 JULOK', width / 2 + 30, 85);

      ctx.fillStyle = '#334155';
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur`, width / 2 + 30, 112);
      ctx.fillText(`NPSN (${settings.npsn || '10101877'})`, width / 2 + 30, 134);

      ctx.fillStyle = '#64748b';
      ctx.font = '500 14px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`${settings.website}  |  ${settings.email}`, width / 2 + 30, 156);

      // Left Curve
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 240);
      ctx.bezierCurveTo(120, 240, 220, 310, 270, 420);
      ctx.bezierCurveTo(310, 510, 390, 638, 480, 638);
      ctx.lineTo(0, 638);
      ctx.closePath();
      ctx.fillStyle = primaryNavy;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 235);
      ctx.bezierCurveTo(120, 235, 220, 305, 270, 415);
      ctx.bezierCurveTo(310, 505, 390, 633, 480, 633);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.restore();

      // Student Photo
      const photoX = 65;
      const photoY = 175;
      const photoW = 205;
      const photoH = 265;
      const radius = 28;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(photoX, photoY, photoW, photoH, radius);
      ctx.clip();
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(photoX, photoY, photoW, photoH);
      const studentPhoto = await loadImage(student.foto || '');
      if (studentPhoto) ctx.drawImage(studentPhoto, photoX, photoY, photoW, photoH);
      ctx.restore();

      // Info Block
      const infoX = 305;
      ctx.textAlign = 'left';
      ctx.fillStyle = primaryNavy;
      ctx.fillRect(infoX, 260, 6, 72);

      ctx.font = '900 28px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(student.nama.toUpperCase(), infoX + 22, 290);

      ctx.font = 'bold 22px monospace';
      const idLine = student.nis ? `${student.nisn}  (NIS: ${student.nis})` : student.nisn;
      ctx.fillText(idLine, infoX + 22, 324);

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`📅  ${student.tempatLahir.toUpperCase()}, ${student.tanggalLahir}`, infoX + 22, 385);

      ctx.fillStyle = '#475569';
      ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(`👤  BERLAKU S/D`, infoX + 22, 430);

      ctx.fillStyle = primaryNavy;
      ctx.font = '900 22px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(student.masaBerlaku || '06/2028', infoX + 50, 460);
    } else {
      // ==========================================
      // RESMI KEDINASAN / SMART CARD / KLASIK KOP
      // (FLAGSHIP OFFICIAL INDONESIAN TEMPLATE)
      // ==========================================

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
      ctx.fillStyle = primaryNavy;
      ctx.fillRect(0, 134, width, 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 19px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(settings.cardTitle || 'KARTU TANDA PELAJAR', 45, 159);

      ctx.fillStyle = accentGold;
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
    }

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

  // Trigger download
  const imageUri = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = imageUri;
  const cleanName = student.nama.replace(/[^a-zA-Z0-9]/g, '_');
  a.download = `Kartu_SMAN1_Julok_${cleanName}_${side}.png`;
  a.click();
}
