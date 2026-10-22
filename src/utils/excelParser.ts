import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Student } from '../types';

export interface ColumnMapping {
  nisn: string;
  nis: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string;
  ttl?: string; // combined
  jenisKelamin: string;
  kelas: string;
  jurusan: string;
  alamat: string;
  golonganDarah: string;
  foto: string;
}

/**
 * Clean & normalize column names for fuzzy detection
 */
function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Automatically detect column mapping based on standard Indonesian school DAPODIK / EMIS headers
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    nisn: '',
    nis: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    ttl: '',
    jenisKelamin: '',
    kelas: '',
    jurusan: '',
    alamat: '',
    golonganDarah: '',
    foto: '',
  };

  headers.forEach((original) => {
    const norm = normalizeHeader(original);
    
    if (!mapping.nisn && (norm.includes('nisn') || norm === 'noinduksiswanasional')) {
      mapping.nisn = original;
    } else if (!mapping.nis && (norm === 'nis' || norm === 'nipd' || norm === 'noinduk' || norm === 'nomorinduk')) {
      mapping.nis = original;
    } else if (!mapping.nama && (norm.includes('namasiswa') || norm.includes('namalengkap') || norm === 'nama')) {
      mapping.nama = original;
    } else if (!mapping.ttl && (norm === 'ttl' || norm === 'tempattanggallahir' || norm === 'tempatdantanggallahir')) {
      mapping.ttl = original;
    } else if (!mapping.tempatLahir && (norm.includes('tempatlahir') || norm.includes('tmplahir'))) {
      mapping.tempatLahir = original;
    } else if (!mapping.tanggalLahir && (norm.includes('tanggallahir') || norm.includes('tgllahir') || norm.includes('tglhr'))) {
      mapping.tanggalLahir = original;
    } else if (!mapping.jenisKelamin && (norm === 'jk' || norm.includes('jeniskelamin') || norm === 'gender' || norm === 'lp')) {
      mapping.jenisKelamin = original;
    } else if (!mapping.kelas && (norm === 'kelas' || norm === 'rombel' || norm === 'tingkat' || norm === 'kelasrombel')) {
      mapping.kelas = original;
    } else if (!mapping.jurusan && (norm.includes('jurusan') || norm.includes('peminatan') || norm.includes('programkeahlian'))) {
      mapping.jurusan = original;
    } else if (!mapping.alamat && (norm.includes('alamat') || norm.includes('domisili') || norm.includes('desa'))) {
      mapping.alamat = original;
    } else if (!mapping.golonganDarah && (norm.includes('goldarah') || norm.includes('golongandarah') || norm === 'darah')) {
      mapping.golonganDarah = original;
    } else if (!mapping.foto && (norm.includes('foto') || norm.includes('gambar') || norm.includes('pasfoto') || norm.includes('image'))) {
      mapping.foto = original;
    }
  });

  return mapping;
}

/**
 * Normalize gender text into 'L' or 'P'
 */
function normalizeGender(val: unknown): 'L' | 'P' {
  if (!val) return 'L';
  const str = String(val).trim().toUpperCase();
  if (str.startsWith('P') || str.includes('WANITA') || str.includes('PEREMPUAN')) {
    return 'P';
  }
  return 'L';
}

/**
 * Format date values safely
 */
function formatDate(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  // If Excel serial number
  if (/^\d{5}$/.test(str)) {
    const d = new Date((Number(str) - 25569) * 86400 * 1000);
    return isNaN(d.getTime()) ? str : d.toISOString().split('T')[0];
  }
  return str;
}

/**
 * Parse an Excel buffer or CSV text into rows
 */
export async function parseSpreadsheetFile(
  file: File
): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, {
          type: typeof data === 'string' ? 'string' : 'binary',
          cellDates: true,
        });

        // Use the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          defval: '',
          raw: false,
        });

        if (jsonData.length === 0) {
          resolve({ headers: [], rows: [] });
          return;
        }

        const headers = Object.keys(jsonData[0]);
        resolve({ headers, rows: jsonData });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
}

/**
 * Convert raw parsed rows into Student objects according to mapping
 */
export function convertRowsToStudents(
  rows: Record<string, any>[],
  mapping: ColumnMapping
): Student[] {
  return rows.map((row, index) => {
    let tempat = mapping.tempatLahir ? String(row[mapping.tempatLahir] || '').trim() : '';
    let tanggal = mapping.tanggalLahir ? formatDate(row[mapping.tanggalLahir]) : '';

    // If combined TTL column is used
    if (mapping.ttl && row[mapping.ttl]) {
      const combined = String(row[mapping.ttl]).trim();
      const parts = combined.split(/,|\//);
      if (parts.length >= 2) {
        if (!tempat) tempat = parts[0].trim();
        if (!tanggal) tanggal = parts.slice(1).join(',').trim();
      } else if (!tempat) {
        tempat = combined;
      }
    }

    const nisnVal = mapping.nisn ? String(row[mapping.nisn] || '').trim() : '';
    const nisVal = mapping.nis ? String(row[mapping.nis] || '').trim() : '';
    const namaVal = mapping.nama ? String(row[mapping.nama] || '').trim() : `Siswa ${index + 1}`;
    const jkVal = mapping.jenisKelamin ? normalizeGender(row[mapping.jenisKelamin]) : 'L';
    const kelasVal = mapping.kelas ? String(row[mapping.kelas] || '').trim() : 'X';
    const jurusanVal = mapping.jurusan ? String(row[mapping.jurusan] || '').trim() : '';
    const alamatVal = mapping.alamat ? String(row[mapping.alamat] || '').trim() : 'Aceh Timur';
    const golDarahRaw = mapping.golonganDarah ? String(row[mapping.golonganDarah] || '').trim().toUpperCase() : '-';
    const golDarahVal = ['A', 'B', 'AB', 'O'].includes(golDarahRaw) ? (golDarahRaw as any) : '-';
    const fotoVal = mapping.foto ? String(row[mapping.foto] || '').trim() : '';

    return {
      id: `std-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
      nisn: nisnVal || `00${Math.floor(10000000 + Math.random() * 90000000)}`,
      nis: nisVal || `${Math.floor(20000000 + Math.random() * 9000000)}`,
      nama: namaVal,
      tempatLahir: tempat || 'Julok',
      tanggalLahir: tanggal || '2008-01-01',
      jenisKelamin: jkVal,
      kelas: kelasVal || 'X-1',
      jurusan: jurusanVal || 'Umum',
      alamat: alamatVal,
      golonganDarah: golDarahVal,
      foto: fotoVal || undefined,
      masaBerlaku: 'Selama Menjadi Siswa',
    };
  });
}

/**
 * Generate and download an Excel template file for SMA Negeri 1 Julok
 */
export function downloadExcelTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const sampleData = [
    {
      'NISN': '0078129341',
      'NIS': '22231001',
      'Nama Siswa': 'Cut Sarah Maulidia',
      'Tempat Lahir': 'Julok',
      'Tanggal Lahir': '2008-04-14',
      'Jenis Kelamin (L/P)': 'P',
      'Kelas': 'X-1',
      'Jurusan': 'Fase E',
      'Alamat': 'Blang Pauh Dua, Julok',
      'Golongan Darah': 'O',
    },
    {
      'NISN': '0075412980',
      'NIS': '22231002',
      'Nama Siswa': 'Muhammad Al-Fatih',
      'Tempat Lahir': 'Idi Rayeuk',
      'Tanggal Lahir': '2007-09-22',
      'Jenis Kelamin (L/P)': 'L',
      'Kelas': 'XI MIPA 1',
      'Jurusan': 'MIPA',
      'Alamat': 'Gampong Blang Pauh Dua',
      'Golongan Darah': 'A',
    },
    {
      'NISN': '0069812455',
      'NIS': '21221045',
      'Nama Siswa': 'Rizki Ramadhan',
      'Tempat Lahir': 'Lhokseumawe',
      'Tanggal Lahir': '2006-11-05',
      'Jenis Kelamin (L/P)': 'L',
      'Kelas': 'XII MIPA 2',
      'Jurusan': 'MIPA',
      'Alamat': 'Julok Tunong, Aceh Timur',
      'Golongan Darah': 'B',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Siswa_SMAN1_Julok');

  if (format === 'csv') {
    XLSX.writeFile(workbook, 'Template_Data_Siswa_SMAN1_Julok.csv', { bookType: 'csv' });
  } else {
    XLSX.writeFile(workbook, 'Template_Data_Siswa_SMAN1_Julok.xlsx', { bookType: 'xlsx' });
  }
}

/**
 * Export current students list to Excel or CSV
 */
export function exportStudentsToExcel(students: Student[], format: 'xlsx' | 'csv' = 'xlsx') {
  const exportData = students.map((s, idx) => ({
    'No': idx + 1,
    'NISN': s.nisn,
    'NIS': s.nis,
    'Nama Lengkap': s.nama,
    'Tempat Lahir': s.tempatLahir,
    'Tanggal Lahir': s.tanggalLahir,
    'Jenis Kelamin': s.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
    'Kelas': s.kelas,
    'Jurusan / Peminatan': s.jurusan || '-',
    'Golongan Darah': s.golonganDarah || '-',
    'Alamat': s.alamat,
    'Masa Berlaku': s.masaBerlaku,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Siswa_SMAN1_Julok');

  const filename = `Data_Kartu_Pelajar_SMAN1_Julok_${new Date().toISOString().slice(0, 10)}.${format}`;
  XLSX.writeFile(workbook, filename, { bookType: format });
}

/**
 * Read a ZIP file containing photos and match with students by NIS (default), NISN, or Name
 */
export async function matchPhotosFromZip(
  zipFile: File,
  students: Student[],
  matchField: 'nis' | 'nisn' | 'nama' | 'auto' = 'nis'
): Promise<{
  matchedCount: number;
  updatedStudents: Student[];
  matchedFileDetails: { filename: string; studentName: string; studentNis: string; studentNisn: string }[];
  unmatchedFiles: string[];
}> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);
  
  // Maps for quick lookup
  const nisMap = new Map<string, Student>();
  const nisnMap = new Map<string, Student>();
  const nameMap = new Map<string, Student>();

  students.forEach((s) => {
    if (s.nis) nisMap.set(s.nis.trim().toLowerCase(), s);
    if (s.nisn) nisnMap.set(s.nisn.trim().toLowerCase(), s);
    const cleanName = s.nama.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanName) nameMap.set(cleanName, s);
  });

  let matchedCount = 0;
  const updatedMap = new Map<string, string>(); // studentId -> photoDataUrl
  const matchedFileDetails: { filename: string; studentName: string; studentNis: string; studentNisn: string }[] = [];
  const unmatchedFiles: string[] = [];

  const entries = Object.keys(loadedZip.files);
  for (const filename of entries) {
    const entry = loadedZip.files[filename];
    if (entry.dir) continue;
    
    // Check if image file
    const lower = filename.toLowerCase();
    if (!lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.png') && !lower.endsWith('.webp')) {
      continue;
    }

    // Extract identifier from filename (e.g. "path/to/22231018.jpg" -> "22231018")
    const baseName = filename.split('/').pop() || '';
    const nameWithoutExt = baseName.substring(0, baseName.lastIndexOf('.')).trim().toLowerCase();
    const cleanName = nameWithoutExt.replace(/[^a-z0-9]/g, '');

    let targetStudent: Student | undefined;

    if (matchField === 'nis') {
      targetStudent = nisMap.get(nameWithoutExt) || nisMap.get(cleanName);
    } else if (matchField === 'nisn') {
      targetStudent = nisnMap.get(nameWithoutExt) || nisnMap.get(cleanName);
    } else if (matchField === 'nama') {
      targetStudent = nameMap.get(cleanName);
    } else {
      // Auto: try NIS first, then NISN, then Name
      targetStudent = nisMap.get(nameWithoutExt) || nisMap.get(cleanName) ||
                      nisnMap.get(nameWithoutExt) || nisnMap.get(cleanName) ||
                      nameMap.get(cleanName);
    }

    if (targetStudent) {
      const blob = await entry.async('blob');
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      updatedMap.set(targetStudent.id, dataUrl);
      matchedCount++;
      matchedFileDetails.push({
        filename: baseName,
        studentName: targetStudent.nama,
        studentNis: targetStudent.nis,
        studentNisn: targetStudent.nisn,
      });
    } else {
      unmatchedFiles.push(baseName);
    }
  }

  const updatedStudents = students.map((s) => {
    if (updatedMap.has(s.id)) {
      return { ...s, foto: updatedMap.get(s.id) };
    }
    return s;
  });

  return { matchedCount, updatedStudents, matchedFileDetails, unmatchedFiles };
}

/**
 * Generate a ready-to-test ZIP file containing passport photos named by student NIS
 */
export async function downloadSampleZipByNis(students: Student[]) {
  const zip = new JSZip();

  // Create a 3:4 passport canvas for sample generation
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const targetStudents = students.slice(0, 5);
  for (const s of targetStudents) {
    if (!s.nis) continue;

    // Draw passport style avatar with student NIS
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 300, 400);

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(150, 150, 65, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.ellipse(150, 360, 110, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.nama.slice(0, 16), 150, 300);

    ctx.font = 'bold 20px monospace';
    ctx.fillText(`NIS: ${s.nis}`, 150, 335);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    );

    if (blob) {
      zip.file(`${s.nis}.jpg`, blob);
    }
  }

  // Also include a readme
  zip.file(
    'PETUNJUK_PENAMAAN_FOTO.txt',
    'PETUNJUK UPLOAD MASSAL FOTO SISWA DARI ZIP\n\n' +
      '1. Setiap file foto di dalam arsip ZIP harus diberi nama sesuai NIS siswa (contoh: 22231018.jpg, 22231001.png).\n' +
      '2. Format foto yang didukung: JPG, JPEG, PNG, dan WEBP.\n' +
      '3. Aplikasi otomatis mendeteksi dan memasangkan foto ke profil siswa yang memiliki NIS yang sama.\n'
  );

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Contoh_Foto_Siswa_Sesuai_NIS.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

