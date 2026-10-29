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
    .replace(/^\uFEFF/, '') // Strip UTF-8 BOM
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
    if (!norm) return;
    
    // NISN detection (Dapodik: Nomor Induk Siswa Nasional / NISN)
    if (!mapping.nisn && (norm.includes('nisn') || norm.includes('noinduksiswanasional') || norm.includes('nomorinduksiswanasional') || norm.includes('noinduknasional'))) {
      mapping.nisn = original;
    }
    // NIS / NIPD detection
    else if (!mapping.nis && (norm === 'nis' || norm === 'nipd' || norm === 'noinduk' || norm === 'nomorinduk' || norm.includes('induksekolah') || norm.includes('indukpesertadidik') || norm === 'nisnipd')) {
      mapping.nis = original;
    }
    // Student Name (Dapodik: Nama Peserta Didik, EMIS: Nama Lengkap, Raport: Nama Siswa)
    else if (!mapping.nama && (
      norm.includes('namapesertadidik') ||
      norm.includes('namasiswa') ||
      norm.includes('namalengkap') ||
      norm.includes('pesertadidik') ||
      norm.includes('namamurid') ||
      norm === 'nama'
    )) {
      mapping.nama = original;
    }
    // Combined TTL
    else if (!mapping.ttl && (
      norm === 'ttl' ||
      norm.includes('tempattanggallahir') ||
      norm.includes('tempattgllahir') ||
      norm.includes('tempatdantanggallahir') ||
      norm.includes('tempatdantgllahir') ||
      norm.includes('tempattgl')
    )) {
      mapping.ttl = original;
    }
    // Birth Place
    else if (!mapping.tempatLahir && (norm.includes('tempatlahir') || norm.includes('tmplahir') || norm.includes('tmptlahir') || norm.includes('kotalahir'))) {
      mapping.tempatLahir = original;
    }
    // Birth Date
    else if (!mapping.tanggalLahir && (norm.includes('tanggallahir') || norm.includes('tgllahir') || norm.includes('tglhr') || norm.includes('tgllhr') || norm === 'tgl')) {
      mapping.tanggalLahir = original;
    }
    // Gender / JK
    else if (!mapping.jenisKelamin && (
      norm === 'jk' ||
      norm.includes('jeniskelamin') ||
      norm === 'gender' ||
      norm === 'lp' ||
      norm.includes('kelamin')
    )) {
      mapping.jenisKelamin = original;
    }
    // Class / Rombel (Dapodik: Rombongan Belajar, Rombel Saat Ini)
    else if (!mapping.kelas && (
      norm === 'kelas' ||
      norm.includes('rombel') ||
      norm.includes('rombonganbelajar') ||
      norm.includes('tingkat') ||
      norm.includes('kelasrombel')
    )) {
      mapping.kelas = original;
    }
    // Jurusan / Peminatan / Fase Kurikulum Merdeka
    else if (!mapping.jurusan && (
      norm.includes('jurusan') ||
      norm.includes('peminatan') ||
      norm.includes('programkeahlian') ||
      norm.includes('kompetensikeahlian') ||
      norm.includes('fase')
    )) {
      mapping.jurusan = original;
    }
    // Address (Dapodik: Alamat Jalan)
    else if (!mapping.alamat && (
      norm.includes('alamat') ||
      norm.includes('domisili') ||
      norm.includes('tempattinggal') ||
      norm.includes('gampong') ||
      norm.includes('desa')
    )) {
      mapping.alamat = original;
    }
    // Blood type
    else if (!mapping.golonganDarah && (norm.includes('goldarah') || norm.includes('golongandarah') || norm === 'darah')) {
      mapping.golonganDarah = original;
    }
    // Photo
    else if (!mapping.foto && (norm.includes('foto') || norm.includes('gambar') || norm.includes('pasfoto') || norm.includes('image') || norm.includes('photo'))) {
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
  if (
    str.startsWith('P') ||
    str.includes('WANITA') ||
    str.includes('PEREMPUAN') ||
    str === '2' ||
    str === 'F'
  ) {
    return 'P';
  }
  return 'L';
}

/**
 * Indonesian month translation dictionary
 */
const INDO_MONTHS: Record<string, string> = {
  januari: '01',
  jan: '01',
  februari: '02',
  pebruari: '02',
  feb: '02',
  peb: '02',
  maret: '03',
  mar: '03',
  april: '04',
  apr: '04',
  mei: '05',
  juni: '06',
  jun: '06',
  juli: '07',
  jul: '07',
  agustus: '08',
  ags: '08',
  agu: '08',
  september: '09',
  sep: '09',
  sept: '09',
  oktober: '10',
  okt: '10',
  november: '11',
  nopember: '11',
  nov: '11',
  nop: '11',
  desember: '12',
  des: '12',
};

/**
 * Format date values safely across Excel serial numbers, Indonesian text, and standard formats
 */
function formatDate(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }

  // If number or Excel serial number (e.g. 40123)
  const num = typeof val === 'number' ? val : Number(String(val).trim());
  if (!isNaN(num) && num > 10000 && num < 80000) {
    const d = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  let str = String(val).trim();
  if (!str) return '';

  // Check if Indonesian text date, e.g. "14 April 2008" or "14-Apr-2008"
  const textMatch = str.match(/^(\d{1,2})[\s\-\/\.]([a-zA-Z]+)[\s\-\/\.](\d{4})$/);
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0');
    const mStr = textMatch[2].toLowerCase();
    const year = textMatch[3];
    const month = INDO_MONTHS[mStr];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // Indonesian format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  return str;
}

/**
 * Clean numeric string (NISN, NIS) to preserve leading zeroes and remove trailing decimals (.0)
 */
function cleanIdString(val: unknown): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  if (!str) return '';

  // If scientific notation e.g. 7.8129341e+09
  if (/^[0-9.]+[eE]\+[0-9]+$/.test(str)) {
    try {
      str = BigInt(Math.round(Number(str))).toString();
    } catch {}
  }

  // Remove trailing .0 from Excel number parsing
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }

  return str;
}

/**
 * Specifically format NISN: 10-digit standard in Indonesia
 */
function cleanNisnString(val: unknown): string {
  const cleaned = cleanIdString(val);
  const digits = cleaned.replace(/\D/g, '');
  // If Excel stripped leading zeroes, restore to 10 digits
  if (digits.length >= 8 && digits.length < 10) {
    return digits.padStart(10, '0');
  }
  return digits || cleaned;
}

/**
 * Parse an Excel buffer or CSV text into rows with smart header detection
 */
export async function parseSpreadsheetFile(
  file: File
): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  let workbook: XLSX.WorkBook;

  // Check if CSV with semicolon delimiter (common in Indonesian Windows Excel)
  if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')) {
    const text = new TextDecoder('utf-8').decode(data);
    const firstLines = text.split('\n').slice(0, 5).join('\n');
    const semicolonCount = (firstLines.match(/;/g) || []).length;
    const commaCount = (firstLines.match(/,/g) || []).length;
    const tabCount = (firstLines.match(/\t/g) || []).length;

    let fs = ',';
    if (semicolonCount > commaCount && semicolonCount > tabCount) {
      fs = ';';
    } else if (tabCount > commaCount && tabCount > semicolonCount) {
      fs = '\t';
    }

    workbook = XLSX.read(text, {
      type: 'string',
      raw: false,
      cellDates: true,
      FS: fs,
    });
  } else {
    // Binary Excel (.xlsx, .xls, etc.)
    workbook = XLSX.read(data, {
      type: 'array',
      cellDates: true,
      raw: false,
    });
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    return { headers: [], rows: [] };
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to 2D Array of rows to locate true header row (bypassing Kop/Title lines)
  const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!matrix || matrix.length === 0) {
    return { headers: [], rows: [] };
  }

  // Keywords that identify a true student data table header row
  const HEADER_KEYWORDS = [
    'nisn', 'nis', 'nipd', 'noinduk', 'nomorinduk',
    'nama', 'siswa', 'peserta', 'murid',
    'tempat', 'lahir', 'ttl', 'tgl', 'tanggal',
    'jk', 'gender', 'kelamin', 'lp',
    'kelas', 'rombel', 'tingkat',
    'jurusan', 'peminatan',
    'alamat', 'jalan', 'desa', 'domisili',
    'darah', 'foto'
  ];

  let bestHeaderRowIndex = 0;
  let maxMatchScore = 0;

  // Scan up to the first 20 rows to find the row with the most matching column keywords
  const scanLimit = Math.min(matrix.length, 20);
  for (let r = 0; r < scanLimit; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;

    let score = 0;
    row.forEach((cell) => {
      const norm = normalizeHeader(String(cell || ''));
      if (norm && HEADER_KEYWORDS.some((kw) => norm.includes(kw))) {
        score++;
      }
    });

    if (score > maxMatchScore) {
      maxMatchScore = score;
      bestHeaderRowIndex = r;
    }
  }

  // If no good header row was found (e.g. custom file), pick first non-empty row
  if (maxMatchScore === 0) {
    bestHeaderRowIndex = 0;
    for (let r = 0; r < scanLimit; r++) {
      if (matrix[r] && matrix[r].some((c: any) => String(c).trim() !== '')) {
        bestHeaderRowIndex = r;
        break;
      }
    }
  }

  const rawHeaderRow = matrix[bestHeaderRowIndex] || [];
  const headers: string[] = [];
  const headerUsageCount: Record<string, number> = {};

  rawHeaderRow.forEach((h: any, idx: number) => {
    let clean = String(h || '')
      .replace(/^\uFEFF/, '')
      .trim()
      .replace(/[\r\n]+/g, ' ');

    if (!clean) {
      clean = `Kolom_${idx + 1}`;
    }

    // Ensure unique header names
    if (headerUsageCount[clean]) {
      headerUsageCount[clean]++;
      clean = `${clean}_${headerUsageCount[clean]}`;
    } else {
      headerUsageCount[clean] = 1;
    }

    headers.push(clean);
  });

  // Extract data rows after the header row
  const dataRowsMatrix = matrix.slice(bestHeaderRowIndex + 1);
  const rows: Record<string, any>[] = [];

  dataRowsMatrix.forEach((rowArray) => {
    if (!Array.isArray(rowArray)) return;

    // Check if row has any non-empty data
    const hasData = rowArray.some((val) => val !== null && val !== undefined && String(val).trim() !== '');
    if (!hasData) return;

    const rowObj: Record<string, any> = {};
    headers.forEach((hdr, colIdx) => {
      rowObj[hdr] = rowArray[colIdx] !== undefined ? rowArray[colIdx] : '';
    });
    rows.push(rowObj);
  });

  return { headers, rows };
}

/**
 * Convert raw parsed rows into Student objects according to mapping
 */
export function convertRowsToStudents(
  rows: Record<string, any>[],
  mapping: ColumnMapping
): Student[] {
  const result: Student[] = [];

  rows.forEach((row, index) => {
    let tempat = mapping.tempatLahir ? String(row[mapping.tempatLahir] || '').trim() : '';
    let tanggal = mapping.tanggalLahir ? formatDate(row[mapping.tanggalLahir]) : '';

    // If combined TTL column is used (e.g. "Julok, 14 April 2008" or "Idi / 2007-09-22")
    if (mapping.ttl && row[mapping.ttl]) {
      const combined = String(row[mapping.ttl]).trim();
      const parts = combined.split(/,|\//);
      if (parts.length >= 2) {
        if (!tempat) tempat = parts[0].trim();
        if (!tanggal) tanggal = formatDate(parts.slice(1).join(',').trim());
      } else if (!tempat) {
        tempat = combined;
      }
    }

    const rawNama = mapping.nama ? String(row[mapping.nama] || '').trim() : '';
    const rawNisn = mapping.nisn ? cleanNisnString(row[mapping.nisn]) : '';
    const rawNis = mapping.nis ? cleanIdString(row[mapping.nis]) : '';
    const rawKelas = mapping.kelas ? String(row[mapping.kelas] || '').trim() : '';
    const rawAlamat = mapping.alamat ? String(row[mapping.alamat] || '').trim() : '';

    // Filter out completely blank rows
    if (!rawNama && !rawNisn && !rawNis && !tempat && !rawAlamat) {
      return;
    }

    const namaVal = rawNama || `Siswa ${index + 1}`;
    const jkVal = mapping.jenisKelamin ? normalizeGender(row[mapping.jenisKelamin]) : 'L';
    const kelasVal = rawKelas || 'X-1';
    const jurusanVal = mapping.jurusan ? String(row[mapping.jurusan] || '').trim() : 'Umum';
    const alamatVal = rawAlamat || 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur';
    const golDarahRaw = mapping.golonganDarah ? String(row[mapping.golonganDarah] || '').trim().toUpperCase() : '-';
    const golDarahVal = ['A', 'B', 'AB', 'O'].includes(golDarahRaw) ? (golDarahRaw as any) : '-';
    const fotoVal = mapping.foto ? String(row[mapping.foto] || '').trim() : '';

    result.push({
      id: `std-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`,
      nisn: rawNisn || `00${Math.floor(10000000 + Math.random() * 90000000)}`,
      nis: rawNis || `${Math.floor(20000000 + Math.random() * 9000000)}`,
      nama: namaVal,
      tempatLahir: tempat || 'Julok',
      tanggalLahir: tanggal || '2008-01-01',
      jenisKelamin: jkVal,
      kelas: kelasVal,
      jurusan: jurusanVal,
      alamat: alamatVal,
      golonganDarah: golDarahVal,
      foto: fotoVal || '',
      masaBerlaku: '06/2028',
    });
  });

  return result;
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
 * Read a ZIP file containing photos and match with students by NISN (recommended), NIS, Name, or Auto
 */
export async function matchPhotosFromZip(
  zipFile: File,
  students: Student[],
  matchField: 'nis' | 'nisn' | 'nama' | 'auto' = 'nisn'
): Promise<{
  matchedCount: number;
  updatedStudents: Student[];
  matchedFileDetails: { filename: string; studentName: string; studentNis: string; studentNisn: string; previewUrl: string }[];
  unmatchedFiles: string[];
}> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);
  
  // Maps for quick lookup
  const nisMap = new Map<string, Student>();
  const nisnMap = new Map<string, Student>();
  const nameMap = new Map<string, Student>();

  students.forEach((s) => {
    // NISN variations: exact, digits-only, 10-digit zero-padded, and stripped leading zeros
    if (s.nisn) {
      const rawNisn = String(s.nisn).trim().toLowerCase();
      const digitsNisn = rawNisn.replace(/\D/g, '');
      nisnMap.set(rawNisn, s);
      if (digitsNisn) {
        nisnMap.set(digitsNisn, s);
        nisnMap.set(digitsNisn.padStart(10, '0'), s);
        nisnMap.set(digitsNisn.replace(/^0+/, ''), s);
      }
    }

    // NIS variations: exact, digits-only, stripped leading zeros
    if (s.nis) {
      const rawNis = String(s.nis).trim().toLowerCase();
      const digitsNis = rawNis.replace(/\D/g, '');
      nisMap.set(rawNis, s);
      if (digitsNis) {
        nisMap.set(digitsNis, s);
        nisMap.set(digitsNis.replace(/^0+/, ''), s);
      }
    }

    // Name variations: normalized alphanumeric
    if (s.nama) {
      const cleanName = s.nama.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanName) nameMap.set(cleanName, s);
    }
  });

  let matchedCount = 0;
  const updatedMap = new Map<string, string>(); // studentId -> photoDataUrl
  const matchedFileDetails: { filename: string; studentName: string; studentNis: string; studentNisn: string; previewUrl: string }[] = [];
  const unmatchedFiles: string[] = [];

  const entries = Object.keys(loadedZip.files);
  for (const filename of entries) {
    const entry = loadedZip.files[filename];
    if (entry.dir) continue;
    
    // Ignore macOS metadata, hidden files, thumbnails, etc.
    const baseName = filename.split('/').pop() || '';
    if (
      filename.includes('__MACOSX') ||
      baseName.startsWith('._') ||
      baseName.startsWith('.') ||
      baseName.toLowerCase() === 'thumbs.db' ||
      baseName.toLowerCase() === 'desktop.ini'
    ) {
      continue;
    }

    // Check if valid image extension
    const lower = filename.toLowerCase();
    if (!lower.endsWith('.jpg') && !lower.endsWith('.jpeg') && !lower.endsWith('.png') && !lower.endsWith('.webp')) {
      continue;
    }

    // Extract identifier from filename (e.g. "path/to/0096011503.jpg" -> "0096011503")
    const lastDotIdx = baseName.lastIndexOf('.');
    const nameWithoutExt = (lastDotIdx > 0 ? baseName.substring(0, lastDotIdx) : baseName).trim().toLowerCase();
    const cleanName = nameWithoutExt.replace(/[^a-z0-9]/g, '');
    const digitsOnly = nameWithoutExt.replace(/\D/g, '');

    // Extract potential 10-digit NISN inside filename (e.g., "NISN_0096011503_Ahmad" -> "0096011503")
    const match10Digit = nameWithoutExt.match(/\b\d{10}\b/) || nameWithoutExt.match(/\d{10}/);
    const tenDigitCandidate = match10Digit ? match10Digit[0] : '';

    // Strip common prefixes: "nisn-", "nisn_", "nisn ", "foto-", "pasfoto_"
    const strippedNisn = nameWithoutExt.replace(/^(nisn|foto|pasfoto)[\s_-]*/i, '').trim();
    const strippedNis = nameWithoutExt.replace(/^(nis|nipd)[\s_-]*/i, '').trim();

    let targetStudent: Student | undefined;

    // Matching Strategy by NISN (Primary / Recommended)
    if (matchField === 'nisn') {
      targetStudent =
        nisnMap.get(nameWithoutExt) ||
        nisnMap.get(cleanName) ||
        (tenDigitCandidate ? nisnMap.get(tenDigitCandidate) : undefined) ||
        (digitsOnly ? nisnMap.get(digitsOnly) : undefined) ||
        (digitsOnly ? nisnMap.get(digitsOnly.padStart(10, '0')) : undefined) ||
        nisnMap.get(strippedNisn) ||
        // Auto fallback to NIS if not matched to NISN
        nisMap.get(nameWithoutExt) ||
        nisMap.get(cleanName);
    } else if (matchField === 'nis') {
      targetStudent =
        nisMap.get(nameWithoutExt) ||
        nisMap.get(cleanName) ||
        (digitsOnly ? nisMap.get(digitsOnly) : undefined) ||
        nisMap.get(strippedNis) ||
        // Fallback to NISN if applicable
        (tenDigitCandidate ? nisnMap.get(tenDigitCandidate) : undefined) ||
        nisnMap.get(nameWithoutExt);
    } else if (matchField === 'nama') {
      targetStudent = nameMap.get(cleanName);
    } else {
      // Auto (Smart): NISN (10 digits) -> NIS -> Name
      targetStudent =
        (tenDigitCandidate ? nisnMap.get(tenDigitCandidate) : undefined) ||
        nisnMap.get(nameWithoutExt) ||
        nisnMap.get(cleanName) ||
        (digitsOnly && digitsOnly.length >= 8 ? nisnMap.get(digitsOnly.padStart(10, '0')) : undefined) ||
        nisMap.get(nameWithoutExt) ||
        nisMap.get(cleanName) ||
        (digitsOnly ? nisMap.get(digitsOnly) : undefined) ||
        nameMap.get(cleanName);
    }

    if (targetStudent) {
      // Determine correct MIME type to prevent corrupt data URLs
      let mimeType = 'image/jpeg';
      if (lower.endsWith('.png')) mimeType = 'image/png';
      else if (lower.endsWith('.webp')) mimeType = 'image/webp';

      const uint8 = await entry.async('uint8array');
      const blob = new Blob([uint8 as any], { type: mimeType });
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
        previewUrl: dataUrl,
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
 * Generate a ready-to-test ZIP file containing passport photos named by student NISN (10 digits)
 */
export async function downloadSampleZipByNisn(students: Student[]) {
  const zip = new JSZip();

  // Create a 3:4 passport canvas for sample generation
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const targetStudents = students.slice(0, 5);
  for (const s of targetStudents) {
    const nisnVal = s.nisn ? s.nisn.padStart(10, '0') : '0078129341';

    // Draw passport style avatar with student NISN
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
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.nama.slice(0, 18), 150, 300);

    ctx.font = 'bold 20px monospace';
    ctx.fillText(`NISN: ${nisnVal}`, 150, 335);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    );

    if (blob) {
      zip.file(`${nisnVal}.jpg`, blob);
    }
  }

  // Also include a readme guide
  zip.file(
    'PETUNJUK_PENAMAAN_FOTO_NISN.txt',
    'PETUNJUK UPLOAD MASSAL FOTO SISWA DARI BERKAS ZIP (FORMAT NISN)\n\n' +
      '1. Setiap file foto di dalam arsip ZIP harus diberi nama sesuai NISN 10 digit siswa.\n' +
      '   Contoh penamaan yang didukung otomatis:\n' +
      '   - 0078129341.jpg (Standar Resmi NISN 10 Digit)\n' +
      '   - 0075412980.png\n' +
      '   - NISN_0069812455.jpg\n' +
      '   - 0078129341 - Nama Siswa.jpg\n\n' +
      '2. Format foto yang didukung: JPG, JPEG, PNG, dan WEBP.\n' +
      '3. Ukuran foto ideal: Rasio 3:4 (contoh: 300x400 px atau 600x800 px).\n' +
      '4. Sistem otomatis mencocokkan nomor NISN siswa yang terdaftar di aplikasi SMA Negeri 1 Julok.\n'
  );

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Contoh_Foto_Siswa_Format_NISN.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a ready-to-test ZIP file containing passport photos named by student NIS
 */
export async function downloadSampleZipByNis(students: Student[]) {
  const zip = new JSZip();

  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const targetStudents = students.slice(0, 5);
  for (const s of targetStudents) {
    if (!s.nis) continue;

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
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.nama.slice(0, 18), 150, 300);

    ctx.font = 'bold 20px monospace';
    ctx.fillText(`NIS: ${s.nis}`, 150, 335);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9)
    );

    if (blob) {
      zip.file(`${s.nis}.jpg`, blob);
    }
  }

  zip.file(
    'PETUNJUK_PENAMAAN_FOTO_NIS.txt',
    'PETUNJUK UPLOAD MASSAL FOTO SISWA DARI ZIP (FORMAT NIS)\n\n' +
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

