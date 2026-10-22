export interface Student {
  id: string;
  nisn: string;
  nis: string;
  nama: string;
  tempatLahir: string;
  tanggalLahir: string; // YYYY-MM-DD or readable string
  jenisKelamin: 'L' | 'P';
  kelas: string;
  jurusan?: string;
  alamat: string;
  golonganDarah?: 'A' | 'B' | 'AB' | 'O' | '-';
  foto?: string; // base64 / data URL / image URL
  masaBerlaku: string; // e.g. "Selama Menjadi Siswa" or "2027-06-30"
}

export type CardOrientation = 'landscape' | 'portrait';

export type CardThemePreset = 
  | 'royal_navy' 
  | 'emerald_aceh' 
  | 'maroon_gold' 
  | 'cyan_tech' 
  | 'minimal_slate';

export type CardTemplateStyle = 
  | 'resmi_kedinasan' 
  | 'smart_card' 
  | 'classic_kop' 
  | 'canva_modern';

export interface CardSettings {
  orientation: CardOrientation;
  themePreset: CardThemePreset;
  
  // School details
  provinsiText: string;
  dinasText: string;
  schoolName: string;
  schoolAddress: string;
  schoolContact: string;
  npsn: string;
  akreditasi: string;
  
  // Branding colors
  primaryColor: string; // dominant header / banner color
  secondaryColor: string; // secondary badge/accent
  accentColor: string; // gold / highlight
  cardBgColor: string;
  textColor: string;
  
  // Template style
  templateStyle: CardTemplateStyle;
  cardTitle: string;
  website: string;
  email: string;

  // Logos
  schoolLogo: string; // Data URL or SVG string
  kemdikbudLogo: string; // Tut Wuri Handayani
  merdekaBelajarLogo: string;
  pancasilaLogo: string;
  showMerdekaBelajar: boolean;
  showPancasila: boolean;
  showSecondaryLogo: boolean;
  watermarkOpacity: number; // 0 to 1
  showWatermark: boolean;
  showDotGrids: boolean;
  
  // Layout & photo
  photoBorderRadius: 'rounded' | 'circle' | 'square';
  photoBorderColor: string;
  showHoloBadge: boolean;
  
  // Headmaster / Legal
  kotaPenerbit: string;
  tanggalTerbit: string;
  kepalaSekolahJabatan: string; // e.g. "Kepala SMA Negeri 1 Julok"
  kepalaSekolahNama: string;
  kepalaSekolahNip: string;
  stempelUrl: string;
  stempelColor: string;
  showStempel: boolean;
  tandaTanganUrl: string;
  showTandaTangan: boolean;
  
  // Codes
  barcodeType: 'qr' | 'barcode' | 'both';
  qrContent: 'nisn' | 'nis' | 'url' | 'all_info';
  
  // Back of card
  backTitle: string;
  backRules: string[];
  backFooterNote: string;
  showBackSignature: boolean;
  showBackBarcode: boolean;
}

export interface PrintSettings {
  paperSize: 'A4' | 'CR80';
  cardsPerPage: 8 | 10 | 1;
  printMode: 'front_only' | 'back_only' | 'paired' | 'duplex';
  showCropMarks: boolean;
  cardScale: number; // 0.8 to 1.1
  spacingMm: number;
}
