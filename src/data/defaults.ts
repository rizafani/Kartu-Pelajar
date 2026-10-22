import { CardSettings, CardThemePreset, PrintSettings, Student } from '../types';

// Garuda Pancasila Badge (as shown on top left)
export const PANCASILA_BADGE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 80">
  <defs>
    <linearGradient id="pancGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23fde047"/>
      <stop offset="100%" stop-color="%23ca8a04"/>
    </linearGradient>
  </defs>
  <!-- Outer Green Pentagon Shield -->
  <polygon points="35,3 67,16 57,68 35,78 13,68 3,16" fill="%23ffffff" stroke="%2316a34a" stroke-width="3"/>
  <!-- Garuda Body & Wings -->
  <path d="M 35 18 L 38 28 L 52 24 L 46 36 L 56 42 L 44 48 L 48 58 L 35 52 L 22 58 L 26 48 L 14 42 L 24 36 L 18 24 L 32 28 Z" fill="url(%23pancGold)" stroke="%23854d0e" stroke-width="0.8"/>
  <!-- Center Heart Shield -->
  <polygon points="35,32 42,38 40,48 35,52 30,48 28,38" fill="%23dc2626" stroke="%23ffffff" stroke-width="0.8"/>
  <circle cx="35" cy="42" r="3" fill="%23facc15"/>
  <!-- Ribbon PANCASILA -->
  <rect x="14" y="66" width="42" height="9" rx="2" fill="%2316a34a"/>
  <text x="35" y="73" font-family="'Plus Jakarta Sans', sans-serif" font-size="5" font-weight="900" text-anchor="middle" fill="%23ffffff" letter-spacing="0.5">PANCASILA</text>
</svg>`;

// Merdeka Belajar Logo (Tut Wuri circular logo + red/navy stacked text)
export const MERDEKA_BELAJAR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 55">
  <!-- Tut Wuri Emblem Circle -->
  <circle cx="27" cy="27" r="23" fill="%230284c7" stroke="%23facc15" stroke-width="1.8"/>
  <polygon points="27,8 30,16 38,16 31,21 34,29 27,24 20,29 23,21 16,16 24,16" fill="%23facc15"/>
  <path d="M27,21 L23,32 L27,40 L31,32 Z" fill="%23ffffff"/>
  <circle cx="27" cy="28" r="3" fill="%23dc2626"/>
  
  <!-- MERDEKA BELAJAR Text -->
  <text x="60" y="24" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="900" fill="%23dc2626" letter-spacing="0.5">MERDEKA</text>
  <text x="60" y="42" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="900" fill="%230f2952" letter-spacing="0.5">BELAJAR</text>
</svg>`;

// SMAN 1 Julok Canva Shield Crest (exact from uploaded image)
export const SMAN1_JULOK_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140">
  <defs>
    <linearGradient id="shieldFill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="%23fde047"/>
      <stop offset="100%" stop-color="%23eab308"/>
    </linearGradient>
  </defs>
  <!-- Outer Pentagon with thick green border -->
  <polygon points="60,6 114,24 100,108 60,134 20,108 6,24" fill="url(%23shieldFill)" stroke="%2315803d" stroke-width="5" stroke-linejoin="round"/>
  <!-- Inner thin line -->
  <polygon points="60,12 108,28 95,103 60,126 25,103 12,28" fill="none" stroke="%23166534" stroke-width="1.5"/>
  
  <!-- Gear teeth on left/right -->
  <circle cx="60" cy="56" r="32" fill="none" stroke="%2364748b" stroke-width="3" stroke-dasharray="8,5"/>
  
  <!-- Open Book Symbol (Pendidikan) -->
  <path d="M60 62 C48 50 32 52 24 57 L24 84 C32 80 48 78 60 88 C72 78 88 80 96 84 L96 57 C88 52 72 50 60 62 Z" fill="%23ffffff" stroke="%231e293b" stroke-width="2.2"/>
  <line x1="60" y1="62" x2="60" y2="88" stroke="%231e293b" stroke-width="2"/>
  <!-- Lines in open book -->
  <line x1="30" y1="66" x2="52" y2="62" stroke="%2394a3b8" stroke-width="1.5"/>
  <line x1="30" y1="72" x2="52" y2="68" stroke="%2394a3b8" stroke-width="1.5"/>
  <line x1="68" y1="62" x2="90" y2="66" stroke="%2394a3b8" stroke-width="1.5"/>
  <line x1="68" y1="68" x2="90" y2="72" stroke="%2394a3b8" stroke-width="1.5"/>

  <!-- Obor Torch in Center -->
  <polygon points="56,58 64,58 62,76 58,76" fill="%23f59e0b" stroke="%23b45309" stroke-width="1.2"/>
  <!-- Torch Flame -->
  <path d="M60 36 C65 44 68 48 65 54 C62 57 58 57 55 54 C52 48 55 44 60 36 Z" fill="%23ef4444"/>
  <path d="M60 42 C62 46 64 48 63 52 C61 54 59 54 58 52 C56 48 58 46 60 42 Z" fill="%23fde047"/>

  <!-- Top Banner: SMAN 1 JULOK -->
  <rect x="20" y="16" width="80" height="13" rx="2" fill="%23fde047" stroke="%230f172a" stroke-width="1.2"/>
  <text x="60" y="25.5" font-family="'Plus Jakarta Sans', sans-serif" font-size="7" font-weight="900" text-anchor="middle" fill="%230f172a" letter-spacing="0.3">SMAN 1 JULOK</text>
  
  <!-- Middle Banner: KAB. ACEH TIMUR -->
  <rect x="28" y="93" width="64" height="11" rx="2" fill="%23fde047" stroke="%230f172a" stroke-width="1.2"/>
  <text x="60" y="101" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.5" font-weight="900" text-anchor="middle" fill="%230f172a">KAB. ACEH TIMUR</text>
  
  <!-- Bottom Banner: PROVINSI ACEH -->
  <rect x="24" y="106" width="72" height="12" rx="2" fill="%23fde047" stroke="%230f172a" stroke-width="1.2"/>
  <text x="60" y="115" font-family="'Plus Jakarta Sans', sans-serif" font-size="6" font-weight="900" text-anchor="middle" fill="%230f172a">PROVINSI ACEH</text>
</svg>`;

// Tut Wuri Handayani Official Vector Emblem SVG
export const TUT_WURI_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="%230284c7" stroke="%23e5a910" stroke-width="2.5"/>
  <polygon points="50,8 55,22 70,22 58,32 62,46 50,38 38,46 42,32 30,22 45,22" fill="%23ffd166"/>
  <path d="M50 32 L44 48 L50 62 L56 48 Z" fill="%23ffffff" stroke="%23e5a910" stroke-width="1"/>
  <path d="M25 68 C35 55 45 52 50 56 C55 52 65 55 75 68 C65 72 58 75 50 78 C42 75 35 72 25 68 Z" fill="%23ffffff"/>
  <path d="M30 65 Q50 82 70 65 Q50 92 30 65" fill="%23d62828"/>
  <circle cx="50" cy="42" r="5" fill="%23d62828"/>
</svg>`;

// Official Stamp of Dinas Pendidikan Aceh - SMAN 1 Julok (blue-purple ink)
export const OFFICIAL_STAMP_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <defs>
    <path id="stmpTop" d="M 80, 80 m -60, 0 a 60,60 0 1,1 120,0 a 60,60 0 1,1 -120,0" />
  </defs>
  <g fill="%232563eb" stroke="%232563eb" opacity="0.88">
    <circle cx="80" cy="80" r="74" fill="none" stroke-width="3" />
    <circle cx="80" cy="80" r="68" fill="none" stroke-width="1.5" />
    <circle cx="80" cy="80" r="46" fill="none" stroke-width="1.5" />
    
    <text font-family="'Courier New', Courier, monospace" font-size="9" font-weight="900" letter-spacing="1.5" fill="%232563eb">
      <textPath href="%23stmpTop" startOffset="50%" text-anchor="middle">
        PEMERINTAH ACEH * DINAS PENDIDIKAN
      </textPath>
    </text>
    
    <polygon points="20,80 23,83 28,81 25,86 27,91 22,88 17,91 19,86 16,81 21,83" fill="%232563eb"/>
    <polygon points="140,80 143,83 148,81 145,86 147,91 142,88 137,91 139,86 136,81 141,83" fill="%232563eb"/>
    
    <line x1="48" y1="68" x2="112" y2="68" stroke-width="1.5"/>
    <text x="80" y="78" font-family="sans-serif" font-size="9" font-weight="900" text-anchor="middle">SMA NEGERI 1</text>
    <text x="80" y="93" font-family="sans-serif" font-size="11" font-weight="900" letter-spacing="1" text-anchor="middle">JULOK</text>
    <line x1="48" y1="100" x2="112" y2="100" stroke-width="1.5"/>
    
    <text font-family="'Courier New', Courier, monospace" font-size="8.5" font-weight="800" letter-spacing="1.5" fill="%232563eb">
      <textPath href="%23stmpTop" startOffset="0%" text-anchor="middle">
        CABANG ACEH TIMUR
      </textPath>
    </text>
  </g>
</svg>`;

// Headmaster Signature vector (Irmi, S.Pd., M.Pd cursive signature)
export const OFFICIAL_SIGNATURE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 70">
  <path d="M 25 55 Q 38 12 45 42 T 55 25 Q 70 65 85 28 T 98 48 Q 115 15 135 50" fill="none" stroke="%230f172a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 32 46 Q 75 32 140 52" fill="none" stroke="%230f172a" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 40 36 Q 52 26 64 34" fill="none" stroke="%230f172a" stroke-width="2" stroke-linecap="round"/>
  <circle cx="48" cy="18" r="2.2" fill="%230f172a"/>
</svg>`;

// Gold Contact EMV Smart Chip for Official Smart ID
export const GOLD_EMV_CHIP_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 40">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%23fde047"/>
      <stop offset="50%" stop-color="%23eab308"/>
      <stop offset="100%" stop-color="%23ca8a04"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="48" height="38" rx="6" fill="url(%23goldGrad)" stroke="%23a16207" stroke-width="1.2"/>
  <rect x="14" y="1" width="22" height="38" fill="none" stroke="%23854d0e" stroke-width="0.8"/>
  <line x1="1" y1="14" x2="49" y2="14" stroke="%23854d0e" stroke-width="0.8"/>
  <line x1="1" y1="26" x2="49" y2="26" stroke="%23854d0e" stroke-width="0.8"/>
  <circle cx="25" cy="20" r="4.5" fill="%23fef08a" stroke="%23854d0e" stroke-width="0.8"/>
</svg>`;

// Security Guilloche Anti-Counterfeit Background Pattern
export const SECURITY_GUILLOCHE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="456" height="288" viewBox="0 0 456 288" opacity="0.1">
  <defs>
    <pattern id="guilloche" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M0,30 Q15,0 30,30 T60,30" fill="none" stroke="%230b3565" stroke-width="0.75"/>
      <path d="M0,30 Q15,60 30,30 T60,30" fill="none" stroke="%230b3565" stroke-width="0.75"/>
      <circle cx="30" cy="30" r="18" fill="none" stroke="%230b3565" stroke-width="0.5" stroke-dasharray="2,2"/>
      <circle cx="30" cy="30" r="26" fill="none" stroke="%230b3565" stroke-width="0.5"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(%23guilloche)"/>
</svg>`;

export const THEME_PRESETS: Record<CardThemePreset, Partial<CardSettings>> = {
  royal_navy: {
    themePreset: 'royal_navy',
    primaryColor: '#0b3565', // Deep navy
    secondaryColor: '#1e4b85',
    accentColor: '#d97706', // Official gold
    cardBgColor: '#ffffff',
    textColor: '#0f172a',
    photoBorderColor: '#0b3565',
  },
  emerald_aceh: {
    themePreset: 'emerald_aceh',
    primaryColor: '#064e3b',
    secondaryColor: '#059669',
    accentColor: '#d97706',
    cardBgColor: '#ffffff',
    textColor: '#0f172a',
    photoBorderColor: '#059669',
  },
  maroon_gold: {
    themePreset: 'maroon_gold',
    primaryColor: '#7f1d1d',
    secondaryColor: '#991b1b',
    accentColor: '#fbbf24',
    cardBgColor: '#ffffff',
    textColor: '#1c1917',
    photoBorderColor: '#fbbf24',
  },
  cyan_tech: {
    themePreset: 'cyan_tech',
    primaryColor: '#0e7490',
    secondaryColor: '#0284c7',
    accentColor: '#38bdf8',
    cardBgColor: '#ffffff',
    textColor: '#0f172a',
    photoBorderColor: '#0284c7',
  },
  minimal_slate: {
    themePreset: 'minimal_slate',
    primaryColor: '#1e293b',
    secondaryColor: '#475569',
    accentColor: '#94a3b8',
    cardBgColor: '#ffffff',
    textColor: '#0f172a',
    photoBorderColor: '#cbd5e1',
  },
};

export const DEFAULT_CARD_SETTINGS: CardSettings = {
  orientation: 'landscape',
  themePreset: 'royal_navy',
  templateStyle: 'resmi_kedinasan',
  cardTitle: 'KARTU TANDA PELAJAR',
  
  // School details (Exact values from user's image)
  provinsiText: 'PEMERINTAH ACEH',
  dinasText: 'DINAS PENDIDIKAN',
  schoolName: 'SMA NEGERI 1 JULOK',
  schoolAddress: 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur',
  schoolContact: 'sman1julok.sch.id | info@sman1julok.sch.id',
  website: 'sman1julok.sch.id',
  email: 'info@sman1julok.sch.id',
  npsn: '10101877',
  akreditasi: 'A',
  
  // Branding Colors matching uploaded Canva sample
  primaryColor: '#0b3565',
  secondaryColor: '#16487e',
  accentColor: '#38bdf8',
  cardBgColor: '#ffffff',
  textColor: '#0f2952',
  
  // Logos
  schoolLogo: SMAN1_JULOK_LOGO_SVG,
  kemdikbudLogo: TUT_WURI_SVG,
  merdekaBelajarLogo: MERDEKA_BELAJAR_SVG,
  pancasilaLogo: PANCASILA_BADGE_SVG,
  showMerdekaBelajar: true,
  showPancasila: true,
  showSecondaryLogo: true,
  watermarkOpacity: 0.08,
  showWatermark: true,
  showDotGrids: true,
  
  // Layout & photo
  photoBorderRadius: 'rounded',
  photoBorderColor: '#0284c7',
  showHoloBadge: false,
  
  // Headmaster & Stamp (Exact from user's image)
  kotaPenerbit: 'Julok',
  tanggalTerbit: '15 Juli 2026',
  kepalaSekolahJabatan: 'Kepala SMA Negeri 1 Julok',
  kepalaSekolahNama: 'Irmi, S.Pd., M.Pd',
  kepalaSekolahNip: '1980102 200504 2 001',
  stempelUrl: OFFICIAL_STAMP_SVG,
  stempelColor: '#2563eb',
  showStempel: true,
  tandaTanganUrl: OFFICIAL_SIGNATURE_SVG,
  showTandaTangan: true,
  
  // Codes
  barcodeType: 'both',
  qrContent: 'nisn',
  
  // Back card
  backTitle: 'TATA TERTIB & KETENTUAN KARTU PELAJAR',
  backRules: [
    'Kartu ini adalah bukti sah identitas siswa SMA Negeri 1 Julok.',
    'Wajib dibawa setiap hari saat mengikuti kegiatan belajar dan asesmen di sekolah.',
    'Dilarang meminjamkan kartu ini kepada pihak lain untuk alasan apapun.',
    'Dapat digunakan untuk layanan perpustakaan, absensi digital, dan fasilitas sekolah.',
    'Apabila kartu ini hilang atau rusak, segera melapor kepada Bagian Tata Usaha.',
    'Bagi yang menemukan kartu ini, mohon mengembalikan ke alamat sekolah tertera.',
  ],
  backFooterNote: 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur 24458',
  showBackSignature: false,
  showBackBarcode: true,
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A4',
  cardsPerPage: 8,
  printMode: 'paired',
  showCropMarks: true,
  cardScale: 1.0,
  spacingMm: 6,
};

// High-fidelity student portrait matching the student in the uploaded screenshot
export const HARIZATUL_AKHMAR_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150">
  <!-- Bright blue studio background -->
  <rect width="120" height="150" fill="%230284c7"/>
  <!-- Light radial gradient highlight behind head -->
  <circle cx="60" cy="65" r="50" fill="%2338bdf8" opacity="0.35"/>
  
  <!-- Shoulders & Seragam Putih SMA -->
  <path d="M 12 150 L 22 118 C 26 106 42 104 50 104 L 70 104 C 78 104 94 106 98 118 L 108 150 Z" fill="%23ffffff"/>
  
  <!-- Collar & Gray Tie (Dasi Abu-abu SMA) -->
  <polygon points="60,105 48,118 60,130 72,118" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="1.2"/>
  <polygon points="60,118 55,150 65,150" fill="%23475569"/>
  <!-- OSIS Badge on left pocket -->
  <rect x="28" y="132" width="12" height="14" rx="2" fill="%23ffffff" stroke="%2394a3b8" stroke-width="0.8"/>
  <polygon points="34,134 38,138 34,142 30,138" fill="%23dc2626"/>

  <!-- Neck -->
  <rect x="52" y="86" width="16" height="24" fill="%23e7b38c"/>
  
  <!-- Ears -->
  <circle cx="37" cy="65" r="6" fill="%23e7b38c"/>
  <circle cx="83" cy="65" r="6" fill="%23e7b38c"/>
  
  <!-- Face Oval -->
  <path d="M 60 30 C 44 30 41 45 41 65 C 41 85 51 92 60 92 C 69 92 79 85 79 65 C 79 45 76 30 60 30 Z" fill="%23f5c7a5"/>
  
  <!-- Hair: Indonesian high-school neat side-part as in screenshot -->
  <path d="M 40 50 C 38 30 48 18 60 18 C 74 18 84 28 81 50 C 76 38 70 34 60 34 C 49 34 44 40 40 50 Z" fill="%230f172a"/>
  
  <!-- Eyes & Eyebrows -->
  <path d="M 46 54 Q 52 52 57 54" stroke="%231e293b" stroke-width="2" fill="none"/>
  <path d="M 63 54 Q 68 52 74 54" stroke="%231e293b" stroke-width="2" fill="none"/>
  <circle cx="52" cy="60" r="2.4" fill="%230f172a"/>
  <circle cx="68" cy="60" r="2.4" fill="%230f172a"/>
  
  <!-- Nose & Warm Smile -->
  <path d="M 60 60 L 58 70 L 63 70" stroke="%23d97706" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M 53 77 Q 60 83 67 77" stroke="%23991b1b" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

export const INITIAL_STUDENTS: Student[] = [
  {
    id: 'std-harizatul',
    nisn: '0096011503',
    nis: '22231018',
    nama: 'HARIZATUL AKHMAR',
    tempatLahir: 'BUKET SEURAJA',
    tanggalLahir: '2009-11-07',
    jenisKelamin: 'L',
    kelas: 'X-1',
    jurusan: 'Fase E (Umum)',
    alamat: 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur',
    golonganDarah: 'O',
    foto: HARIZATUL_AKHMAR_AVATAR,
    masaBerlaku: '06/2028',
  },
  {
    id: 'std-cut-sarah',
    nisn: '0078129341',
    nis: '22231001',
    nama: 'CUT SARAH MAULIDIA',
    tempatLahir: 'JULOK',
    tanggalLahir: '2008-04-14',
    jenisKelamin: 'P',
    kelas: 'X-2',
    jurusan: 'Fase E (Umum)',
    alamat: 'Dusun Meunasah Teungoh, Julok, Aceh Timur',
    golonganDarah: 'O',
    foto: undefined,
    masaBerlaku: '06/2028',
  },
  {
    id: 'std-muhammad-alfatih',
    nisn: '0075412980',
    nis: '22231002',
    nama: 'MUHAMMAD AL-FATIH',
    tempatLahir: 'IDI RAYEUK',
    tanggalLahir: '2007-09-22',
    jenisKelamin: 'L',
    kelas: 'XI MIPA 1',
    jurusan: 'MIPA',
    alamat: 'Gampong Blang Pauh Dua, Julok, Aceh Timur',
    golonganDarah: 'A',
    foto: undefined,
    masaBerlaku: '06/2028',
  },
  {
    id: 'std-nurul-husna',
    nisn: '0073289104',
    nis: '22231015',
    nama: 'NURUL HUSNA',
    tempatLahir: 'PEUREULAK',
    tanggalLahir: '2008-01-19',
    jenisKelamin: 'P',
    kelas: 'X-3',
    jurusan: 'Fase E',
    alamat: 'Gampong Ulee Blang, Julok, Aceh Timur',
    golonganDarah: 'AB',
    foto: undefined,
    masaBerlaku: '06/2028',
  },
  {
    id: 'std-teuku-haikal',
    nisn: '0065741829',
    nis: '21221088',
    nama: 'TEUKU HAIKAL PASHA',
    tempatLahir: 'BANDA ACEH',
    tanggalLahir: '2006-08-17',
    jenisKelamin: 'L',
    kelas: 'XII IPS 1',
    jurusan: 'IPS',
    alamat: 'Komplek Puskesmas Julok, Aceh Timur',
    golonganDarah: 'O',
    foto: undefined,
    masaBerlaku: '06/2028',
  },
];
