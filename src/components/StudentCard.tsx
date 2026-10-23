import React, { useEffect, useState } from 'react';
import { CardSettings, Student } from '../types';
import {
  generateBarcodeSvg,
  generateQrDataUrl,
  getQrStringForStudent,
  buildStudentVerificationUrl,
} from '../utils/barcodeGenerator';
import { MapPin, Globe, Mail, Calendar, UserCheck, ShieldCheck, Wifi } from 'lucide-react';
import { GOLD_EMV_CHIP_SVG, SECURITY_GUILLOCHE_SVG } from '../data/defaults';

interface StudentCardProps {
  student: Student;
  settings: CardSettings;
  side?: 'front' | 'back';
  scale?: number;
  className?: string;
  showShadow?: boolean;
  onOpenVerification?: (student: Student) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  settings,
  side = 'front',
  scale = 1,
  className = '',
  showShadow = true,
  onOpenVerification,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const isLandscape = settings.orientation === 'landscape';

  const handleQrClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenVerification) {
      onOpenVerification(student);
    } else {
      const url = buildStudentVerificationUrl(student, settings);
      window.open(url, '_blank');
    }
  };

  useEffect(() => {
    let isMounted = true;
    const qrText = getQrStringForStudent(student, settings);
    generateQrDataUrl(qrText, settings.primaryColor || '#0b3565').then((url) => {
      if (isMounted) setQrDataUrl(url);
    });
    return () => {
      isMounted = false;
    };
  }, [student, settings.qrContent, settings.primaryColor]);

  // Standard CR80 ID-1 card dimensions (85.6mm x 53.98mm)
  // At crisp base retina resolution 456px x 288px (aspect ratio ~1.5833)
  const widthPx = isLandscape ? 456 : 288;
  const heightPx = isLandscape ? 288 : 456;

  // Format date: "BUKET SEURAJA, 07-11-2009"
  const formatTtl = () => {
    const tempat = (student.tempatLahir || 'BUKET SEURAJA').toUpperCase();
    let tgl = student.tanggalLahir;
    if (/^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
      const parts = tgl.split('-');
      tgl = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return `${tempat}, ${tgl}`;
  };

  // Format expiration: e.g. "06/2028" or student.masaBerlaku
  const formatBerlaku = () => {
    if (!student.masaBerlaku) return '06/2028';
    if (student.masaBerlaku.includes('/')) return student.masaBerlaku;
    if (/^\d{4}-\d{2}-\d{2}$/.test(student.masaBerlaku)) {
      const parts = student.masaBerlaku.split('-');
      return `${parts[1]}/${parts[0]}`;
    }
    return student.masaBerlaku;
  };

  const primaryCol = settings.primaryColor || '#0b3565';
  const secondaryCol = settings.secondaryColor || '#1e4b85';
  const accentCol = settings.accentColor || '#d97706';

  // --------------------------------------------------------------------------
  // TEMPLATE 1: RESMI KEDINASAN (Flagship Indonesian Government Official Card)
  // --------------------------------------------------------------------------
  const renderResmiKedinasan = () => (
    <div className="relative w-full h-full text-slate-800 z-10 overflow-hidden flex flex-col justify-between">
      {/* Background Guilloche Security Linework */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 z-0 bg-repeat"
        style={{ backgroundImage: `url("${SECURITY_GUILLOCHE_SVG}")` }}
      />

      {/* 1. KOP SURAT KEDINASAN RESMI (Full width, balanced logos, no dead space) */}
      <div className="w-full pt-2 px-3 pb-1 bg-white/95 z-20 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          {/* Logo Kiri: Logo Sekolah (SMA Negeri 1 Julok) */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <img
              src={settings.schoolLogo}
              alt="Logo Sekolah"
              className="h-10.5 w-10.5 object-contain drop-shadow-2xs"
            />
          </div>

          {/* Kop Teks Dinas Resmi - Compact & Strong Presence */}
          <div className="flex-1 text-center px-1">
            <h4 className="text-[8px] font-extrabold uppercase tracking-widest text-slate-700 leading-tight">
              {settings.provinsiText || 'PEMERINTAH ACEH'}
            </h4>
            <h5 className="text-[7.5px] font-bold uppercase tracking-wide text-slate-600 leading-tight">
              {settings.dinasText || 'DINAS PENDIDIKAN'}
            </h5>
            <h1
              className="text-[13px] font-black uppercase tracking-tight leading-tight my-0.5"
              style={{ color: primaryCol }}
            >
              {settings.schoolName || 'SMA NEGERI 1 JULOK'}
            </h1>
            <p className="text-[6.5px] text-slate-600 font-semibold leading-tight truncate max-w-[280px] mx-auto">
              {settings.schoolAddress || 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur 24458'} • NPSN: {settings.npsn || '10101877'}
            </p>
          </div>

          {/* Logo Kanan: Logo Pemerintah Aceh */}
          <div className="flex-shrink-0 flex items-center justify-end">
            {settings.showPancasila && (
              <img
                src={settings.pancasilaLogo}
                alt="Logo Pemerintah Aceh"
                className="h-10.5 w-auto max-w-[44px] object-contain drop-shadow-2xs"
              />
            )}
          </div>
        </div>

        {/* Garis Ganda Kop Surat Resmi (Double Rule: 2.5px bold + 1px hairline) */}
        <div className="w-full flex flex-col gap-[1.5px] mt-1.5">
          <div className="w-full h-[2.5px]" style={{ backgroundColor: primaryCol }} />
          <div className="w-full h-[1px]" style={{ backgroundColor: primaryCol }} />
        </div>
      </div>

      {/* 2. CARD TITLE BANNER (Strong horizontal anchor) */}
      <div
        className="w-full py-1 px-3 flex items-center justify-between text-white shadow-2xs z-20"
        style={{
          background: `linear-gradient(90deg, ${primaryCol} 0%, ${secondaryCol} 100%)`,
        }}
      >
        <span className="text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          {settings.cardTitle || 'KARTU TANDA PELAJAR'}
        </span>
        <span className="text-[7.5px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-black/25 text-amber-300">
          NISN: {student.nisn}
        </span>
      </div>

      {/* 3. MAIN BODY: FOTO BESAR + TABEL IDENTITAS LENGKAP + PENGESAHAN (NO DEAD WHITE SPACE) */}
      <div className="flex-1 px-2.5 py-1.5 flex items-stretch gap-2 z-20 relative">
        {/* Kolom Kiri: Pas Foto Siswa Ukuran Standar 3x4 Proporsional (Tinggi 116px) */}
        <div className="flex flex-col items-center flex-shrink-0 justify-between w-[86px]">
          <div
            className="relative overflow-hidden bg-blue-600 border-2 border-slate-700/80 shadow-xs w-full"
            style={{
              height: '116px',
              borderRadius:
                settings.photoBorderRadius === 'circle'
                  ? '50%'
                  : settings.photoBorderRadius === 'square'
                  ? '0px'
                  : '4px',
            }}
          >
            {student.foto ? (
              <img
                src={student.foto}
                alt={student.nama}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-blue-700 text-white p-1 text-center">
                <span className="text-[10px] font-bold">Pas Foto</span>
                <span className="text-[8px] opacity-80">3 x 4</span>
              </div>
            )}

            {/* Pita Keaslian / Hologram Resmi */}
            {settings.showHoloBadge && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 py-0.5 text-[6px] font-black text-center text-amber-950 uppercase tracking-widest shadow-2xs">
                ORIGINAL
              </div>
            )}
          </div>

          {/* Badge NIS & Status Siswa */}
          <div className="mt-1 text-center w-full bg-slate-100 rounded border border-slate-300 py-0.5 px-1 shadow-2xs">
            <span className="text-[7.5px] font-mono font-extrabold text-slate-900 leading-none block">
              NIS: {student.nis || '-'}
            </span>
            <span className="text-[5.5px] font-bold text-emerald-700 uppercase tracking-tighter block mt-0.5">
              ● SISWA AKTIF
            </span>
          </div>
        </div>

        {/* Kolom Tengah: Tabel Identitas Siswa Resmi (Tinggi terisi penuh, font jelas) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <table className="w-full text-[8.5px] leading-tight border-collapse">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="w-[74px] font-bold text-slate-600 py-[3px] whitespace-nowrap text-[8px]">
                  NIS / NISN
                </td>
                <td className="w-[8px] text-center text-slate-400 font-bold">:</td>
                <td className="font-mono font-extrabold text-slate-900 py-[3px]">
                  {student.nis || '-'} / {student.nisn}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="font-bold text-slate-600 py-[3px] whitespace-nowrap text-[8px]">
                  Nama Lengkap
                </td>
                <td className="text-center text-slate-400 font-bold">:</td>
                <td
                  className="font-black uppercase tracking-tight py-[3px] text-[9.5px] truncate max-w-[160px]"
                  style={{ color: primaryCol }}
                >
                  {student.nama}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="font-bold text-slate-600 py-[3px] whitespace-nowrap text-[8px]">
                  Tempat, Tgl Lahir
                </td>
                <td className="text-center text-slate-400 font-bold">:</td>
                <td className="font-bold text-slate-800 py-[3px] truncate max-w-[160px]">
                  {formatTtl()}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="font-bold text-slate-600 py-[3px] whitespace-nowrap text-[8px]">
                  Jenis Kelamin
                </td>
                <td className="text-center text-slate-400 font-bold">:</td>
                <td className="font-semibold text-slate-800 py-[3px]">
                  {student.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                </td>
              </tr>

              <tr className="border-b border-slate-100">
                <td className="font-bold text-slate-600 py-[3px] whitespace-nowrap align-top text-[8px]">
                  Alamat
                </td>
                <td className="text-center text-slate-400 font-bold align-top">:</td>
                <td className="font-medium text-slate-700 py-[3px] leading-tight line-clamp-2 max-w-[160px]">
                  {student.alamat || '-'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-600 py-[3px] whitespace-nowrap text-[8px]">
                  Berlaku S/D
                </td>
                <td className="text-center text-slate-400 font-bold">:</td>
                <td className="font-black text-emerald-800 py-[3px]">
                  {formatBerlaku()} <span className="font-normal text-[7px] text-slate-500">(Aktif)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Kolom Kanan: QR Code Proporsional & Pengesahan Kepala Sekolah */}
        <div className="w-[102px] flex flex-col items-center justify-between text-center flex-shrink-0 border-l border-slate-200/90 pl-1.5 py-0.5">
          {/* QR Code dengan Frame Rapi - Tautan Verifikasi Keaslian */}
          {qrDataUrl && (
            <div
              onClick={handleQrClick}
              title="Klik untuk membuka tautan verifikasi keaslian kartu pelajar"
              className="bg-white p-1 rounded border border-slate-300 shadow-2xs flex flex-col items-center cursor-pointer hover:border-blue-500 hover:ring-2 hover:ring-blue-400/30 transition-all group"
            >
              <img
                src={qrDataUrl}
                alt="QR Validasi"
                className="w-[54px] h-[54px] object-contain group-hover:scale-105 transition-transform"
              />
              <span className="text-[5.5px] font-mono text-blue-700 font-extrabold block mt-0.5 tracking-tight group-hover:underline">
                KLIK / SCAN VALIDASI
              </span>
            </div>
          )}

          {/* Pengesahan Kepala Sekolah (Tersusun rapi, tanpa jeda kosong) */}
          <div className="w-full relative mt-0.5">
            <p className="text-[6.5px] font-medium text-slate-600 leading-none">
              {settings.kotaPenerbit || 'Julok'}, {settings.tanggalTerbit || '15 Juli 2024'}
            </p>
            <p className="text-[7px] font-extrabold text-slate-800 leading-tight">
              {settings.kepalaSekolahJabatan || 'Kepala Sekolah'}
            </p>

            {/* Signature & Stamp Overlay Area */}
            <div className="relative h-7 w-full flex items-center justify-center my-0.5">
              {settings.showStempel && settings.stempelUrl && (
                <img
                  src={settings.stempelUrl}
                  alt="Stempel Dinas"
                  className="absolute -top-1.5 left-0.5 w-10 h-10 object-contain pointer-events-none -rotate-12 mix-blend-multiply opacity-90 z-20"
                />
              )}
              {settings.showTandaTangan && settings.tandaTanganUrl && (
                <img
                  src={settings.tandaTanganUrl}
                  alt="TTD"
                  className="w-18 h-7 object-contain relative z-10"
                />
              )}
            </div>

            <p className="text-[7.5px] font-black text-slate-900 underline underline-offset-1 leading-none truncate max-w-[100px] mx-auto">
              {settings.kepalaSekolahNama || 'Irmi, S.Pd., M.Pd'}
            </p>
            <p className="text-[5.5px] font-mono text-slate-600 mt-0.5 leading-none">
              NIP. {settings.kepalaSekolahNip || '1980102 200504 2 001'}
            </p>
          </div>
        </div>
      </div>

      {/* 4. BOTTOM BAR KEDINASAN (Full border anchor) */}
      <div
        className="w-full py-1 px-3 flex items-center justify-between text-white text-[6.5px] font-bold z-20 tracking-wider"
        style={{ backgroundColor: primaryCol }}
      >
        <span>KARTU IDENTITAS RESMI SISWA • DINAS PENDIDIKAN PROVINSI ACEH</span>
        <span className="font-mono">CR80 ISO-7810 / RESMI</span>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // TEMPLATE 2: SMART CARD (Modern Government Electronic ID with EMV Chip)
  // --------------------------------------------------------------------------
  const renderSmartCard = () => (
    <div className="relative w-full h-full text-slate-800 z-10 overflow-hidden flex flex-col justify-between">
      {/* Background Guilloche Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15 z-0 bg-repeat"
        style={{ backgroundImage: `url("${SECURITY_GUILLOCHE_SVG}")` }}
      />

      {/* Top Smart ID Header */}
      <div
        className="w-full pt-2 pb-1.5 px-3 flex items-center justify-between text-white shadow-2xs z-20"
        style={{
          background: `linear-gradient(135deg, ${primaryCol} 0%, ${secondaryCol} 100%)`,
        }}
      >
        <div className="flex items-center gap-2">
          <img
            src={settings.schoolLogo}
            alt="Logo"
            className="w-8 h-8 object-contain drop-shadow-xs"
          />
          <div>
            <h1 className="text-[12px] font-black uppercase tracking-wider leading-none">
              {settings.schoolName || 'SMA NEGERI 1 JULOK'}
            </h1>
            <p className="text-[6.5px] text-slate-200 font-medium tracking-wide mt-0.5">
              {settings.provinsiText || 'PEMERINTAH ACEH'} • SMART STUDENT ID
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rotate-90">
            <Wifi className="w-4 h-4 text-amber-300" />
          </div>
          <span
            className="text-[7.5px] font-black uppercase tracking-widest px-2 py-0.5 rounded border"
            style={{
              backgroundColor: `${accentCol}25`,
              borderColor: accentCol,
              color: accentCol,
            }}
          >
            SMART CARD
          </span>
        </div>
      </div>

      {/* Main Content: EMV Chip + Photo + Tabular Data */}
      <div className="flex-1 px-2.5 py-1.5 flex items-stretch gap-2.5 z-20">
        {/* Left: Photo & EMV Chip */}
        <div className="flex flex-col items-center flex-shrink-0 justify-between w-[84px]">
          {/* Gold EMV Chip */}
          <div className="w-11 h-7.5 rounded overflow-hidden shadow-xs border border-amber-600/40">
            <img src={GOLD_EMV_CHIP_SVG} alt="Smart Chip" className="w-full h-full object-cover" />
          </div>

          {/* Photo */}
          <div
            className="relative overflow-hidden bg-slate-200 border-2 border-slate-700/80 shadow-xs w-full"
            style={{
              height: '102px',
              borderRadius: '4px',
            }}
          >
            {student.foto ? (
              <img src={student.foto} alt={student.nama} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-700 text-white text-[9px] font-bold">
                Foto 3x4
              </div>
            )}
          </div>

          <div className="text-center w-full bg-slate-100 rounded border border-slate-300 py-0.5">
            <span className="text-[7px] font-mono font-bold text-slate-800">
              NIS: {student.nis || '-'}
            </span>
          </div>
        </div>

        {/* Center: Identity Table */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="border-b border-slate-200 pb-1 mb-0.5">
            <h3
              className="text-[11px] font-black uppercase tracking-tight truncate leading-tight"
              style={{ color: primaryCol }}
            >
              {student.nama}
            </h3>
            <p className="text-[8px] font-mono font-bold text-slate-700">
              NISN: {student.nisn}
            </p>
          </div>

          <table className="w-full text-[8px] leading-tight">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="w-[68px] font-bold text-slate-500 py-1">TTL</td>
                <td className="w-2 font-bold text-slate-400">:</td>
                <td className="font-semibold text-slate-800 py-1">{formatTtl()}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="font-bold text-slate-500 py-1">Jenis Kelamin</td>
                <td className="font-bold text-slate-400">:</td>
                <td className="font-semibold text-slate-800 py-1">
                  {student.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                </td>
              </tr>

              <tr className="border-b border-slate-100">
                <td className="font-bold text-slate-500 py-1">Alamat</td>
                <td className="font-bold text-slate-400">:</td>
                <td className="font-medium text-slate-700 truncate max-w-[150px] py-1">
                  {student.alamat || '-'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-500 py-1">Berlaku</td>
                <td className="font-bold text-slate-400">:</td>
                <td className="font-extrabold text-emerald-800 py-1">{formatBerlaku()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: QR Code & Validation */}
        <div className="w-[96px] flex flex-col items-center justify-between flex-shrink-0 text-center pl-1.5 border-l border-slate-200 py-0.5">
          {qrDataUrl && (
            <div
              onClick={handleQrClick}
              title="Klik untuk membuka tautan verifikasi keaslian kartu pelajar"
              className="p-1 bg-white rounded border border-slate-200 shadow-2xs cursor-pointer hover:border-blue-500 hover:ring-2 hover:ring-blue-400/30 transition-all group"
            >
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-13 h-13 object-contain group-hover:scale-105 transition-transform"
              />
              <span className="text-[5.5px] font-mono text-blue-700 font-extrabold block mt-0.5 group-hover:underline">
                KLIK / SCAN ID
              </span>
            </div>
          )}

          <div className="w-full relative mt-0.5">
            <p className="text-[6px] text-slate-600 font-medium">{settings.kotaPenerbit}, {settings.tanggalTerbit}</p>
            <p className="text-[6.5px] font-bold text-slate-800">{settings.kepalaSekolahJabatan}</p>
            <div className="relative h-7 w-full flex items-center justify-center my-0.5">
              {settings.showStempel && settings.stempelUrl && (
                <img
                  src={settings.stempelUrl}
                  alt="Stempel"
                  className="absolute -top-1 left-0 w-9 h-9 object-contain pointer-events-none -rotate-12 mix-blend-multiply opacity-85 z-20"
                />
              )}
              {settings.showTandaTangan && settings.tandaTanganUrl && (
                <img
                  src={settings.tandaTanganUrl}
                  alt="TTD"
                  className="w-16 h-7 object-contain relative z-10 mx-auto"
                />
              )}
            </div>
            <p className="text-[7px] font-bold text-slate-900 underline truncate max-w-[94px] mx-auto">
              {settings.kepalaSekolahNama}
            </p>
            <p className="text-[5px] font-mono text-slate-600 mt-0.5">NIP. {settings.kepalaSekolahNip}</p>
          </div>
        </div>
      </div>

      {/* Bottom Magnetic Contact Bar */}
      <div
        className="w-full py-1 px-3 flex items-center justify-between text-white text-[6.5px] font-mono z-20 font-bold"
        style={{ backgroundColor: primaryCol }}
      >
        <span>INTEGRATED ELECTRONIC ID SYSTEM</span>
        <span>VALID THRU: {formatBerlaku()}</span>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // TEMPLATE 3: KLASIK KOP PEMDA (Traditional Government Official Card)
  // --------------------------------------------------------------------------
  const renderClassicKop = () => (
    <div className="relative w-full h-full text-slate-800 z-10 overflow-hidden flex flex-col justify-between p-2">
      {/* Background watermark */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 z-0 bg-repeat"
        style={{ backgroundImage: `url("${SECURITY_GUILLOCHE_SVG}")` }}
      />

      {/* Traditional Formal Kop */}
      <div className="w-full pb-1 border-b-[2px] border-black z-20 flex items-center justify-between">
        <img
          src={settings.schoolLogo}
          alt="Logo Sekolah"
          className="h-10 w-10 object-contain"
        />
        <div className="text-center px-1 flex-1">
          <p className="text-[7.5px] font-extrabold uppercase tracking-wider text-slate-800">
            {settings.provinsiText}
          </p>
          <p className="text-[7px] font-bold uppercase text-slate-700">
            {settings.dinasText}
          </p>
          <h2 className="text-[12px] font-black uppercase text-slate-900 leading-tight">
            {settings.schoolName}
          </h2>
          <p className="text-[6px] text-slate-600 font-semibold">
            {settings.schoolAddress} • NPSN: {settings.npsn}
          </p>
        </div>
        <img
          src={settings.pancasilaLogo}
          alt="Logo Pemerintah Aceh"
          className="h-10 w-auto max-w-[40px] object-contain"
        />
      </div>

      {/* Title */}
      <div className="py-0.5 text-center z-20">
        <h3 className="text-[9px] font-black uppercase tracking-wider underline text-slate-900">
          {settings.cardTitle || 'KARTU PELAJAR'}
        </h3>
      </div>

      {/* Data Layout */}
      <div className="flex-1 flex items-stretch gap-2 z-20 py-0.5">
        <div className="w-[82px] h-[112px] border-2 border-black bg-slate-100 flex-shrink-0 overflow-hidden rounded-[2px] relative">
          {student.foto ? (
            <img src={student.foto} alt={student.nama} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[8px] font-bold">
              <span>Pas Foto</span>
              <span className="text-[7px]">3 x 4</span>
            </div>
          )}
        </div>

        <table className="flex-1 text-[8px] leading-tight border-collapse">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="w-20 font-bold py-1">NIS / NISN</td>
              <td>:</td>
              <td className="font-mono font-bold">{student.nis || '-'} / {student.nisn}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="font-bold py-1">Nama Lengkap</td>
              <td>:</td>
              <td className="font-black uppercase text-slate-900 text-[9px]">{student.nama}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="font-bold py-1">Tempat, Tgl Lahir</td>
              <td>:</td>
              <td className="font-bold">{formatTtl()}</td>
            </tr>

            <tr className="border-b border-slate-200">
              <td className="font-bold py-1">Alamat</td>
              <td>:</td>
              <td className="truncate max-w-[140px]">{student.alamat || '-'}</td>
            </tr>
            <tr>
              <td className="font-bold py-1">Berlaku S/D</td>
              <td>:</td>
              <td className="font-bold text-emerald-800">{formatBerlaku()}</td>
            </tr>
          </tbody>
        </table>

        {/* Endorsement */}
        <div className="w-26 text-center text-[6.5px] flex flex-col justify-between py-0.5 border-l border-slate-200 pl-1.5 flex-shrink-0">
          <div>
            <p>{settings.kotaPenerbit}, {settings.tanggalTerbit}</p>
            <p className="font-bold text-[7px]">{settings.kepalaSekolahJabatan}</p>
          </div>
          <div className="relative h-7 my-0.5 flex items-center justify-center">
            {settings.showStempel && settings.stempelUrl && (
              <img
                src={settings.stempelUrl}
                alt=""
                className="absolute -top-1 left-0 w-9 h-9 object-contain mix-blend-multiply opacity-80"
              />
            )}
            {settings.showTandaTangan && settings.tandaTanganUrl && (
              <img
                src={settings.tandaTanganUrl}
                alt=""
                className="w-16 h-7 object-contain mx-auto relative z-10"
              />
            )}
          </div>
          <div>
            <p className="font-black text-[7.5px] underline">{settings.kepalaSekolahNama}</p>
            <p className="font-mono text-[5.5px]">NIP. {settings.kepalaSekolahNip}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // TEMPLATE 4: CANVA MODERN (Geometric Curve & Dot Matrix)
  // --------------------------------------------------------------------------
  const renderCanvaModern = () => (
    <div className="relative w-full h-full text-slate-800 z-10 overflow-hidden flex flex-col justify-between">
      {/* 1. TOP LOGO HEADER ROW */}
      <div className="w-full pt-2.5 px-4 flex items-start justify-between z-20">
        {/* Logo Kiri: Logo Sekolah */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <img
            src={settings.schoolLogo}
            alt="Logo Sekolah"
            className="w-11 h-12 object-contain drop-shadow-xs"
          />
        </div>

        <div className="flex-1 px-2 text-center flex flex-col items-center">
          <h1
            className="text-[16px] font-black uppercase tracking-wider leading-none"
            style={{ color: primaryCol }}
          >
            {settings.cardTitle || 'KARTU PELAJAR'}
          </h1>
          <h2
            className="text-[12px] font-extrabold uppercase tracking-wide mt-0.5 leading-tight"
            style={{ color: primaryCol }}
          >
            {settings.schoolName || 'SMA NEGERI 1 JULOK'}
          </h2>

          <div className="w-full max-w-[210px] flex items-center justify-center gap-1.5 my-0.5">
            <div className="h-[0.5px] bg-slate-300 flex-1" />
            <MapPin className="w-2 h-2 text-slate-500 flex-shrink-0" />
            <div className="h-[0.5px] bg-slate-300 flex-1" />
          </div>

          <div className="text-[6.5px] text-slate-700 font-semibold leading-tight truncate max-w-[230px]">
            {settings.schoolAddress}
          </div>
          <div className="text-[6px] text-slate-600 font-semibold leading-tight">
            NPSN ({settings.npsn})
          </div>

          <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[6px] text-slate-600 font-medium leading-none">
            <div className="flex items-center gap-0.5">
              <Globe className="w-1.8 h-1.8 text-slate-500" />
              <span>{settings.website}</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-0.5">
              <Mail className="w-1.8 h-1.8 text-slate-500" />
              <span>{settings.email}</span>
            </div>
          </div>
        </div>

        {/* Logo Kanan: Logo Pemerintah Aceh */}
        <div className="relative flex flex-col items-center flex-shrink-0">
          {settings.showPancasila && (
            <img
              src={settings.pancasilaLogo}
              alt="Logo Pemerintah Aceh"
              className="w-10 h-12 object-contain drop-shadow-xs"
            />
          )}
        </div>
      </div>

      {/* Dot Matrix */}
      {settings.showDotGrids && (
        <div className="absolute right-5 top-17 grid grid-cols-8 gap-0.8 pointer-events-none z-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="w-1 h-1 rounded-full"
              style={{ backgroundColor: accentCol }}
            />
          ))}
        </div>
      )}

      {/* Swoop Curve */}
      <svg
        className="absolute left-0 bottom-0 pointer-events-none z-10"
        width="210"
        height="185"
        viewBox="0 0 210 185"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M -5 70 C 45 70 85 95 110 135 C 130 165 165 185 205 185"
          stroke={accentCol}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M -5 74 C 45 74 85 98 110 138 C 128 165 162 185 200 185 L -5 185 Z"
          fill={primaryCol}
        />
      </svg>

      {/* Student Photo */}
      <div className="absolute left-6 top-[72px] z-20">
        <div
          className="relative overflow-hidden bg-[#0284c7] shadow-sm border-2 border-white"
          style={{
            width: '94px',
            height: '122px',
            borderRadius:
              settings.photoBorderRadius === 'circle'
                ? '50%'
                : settings.photoBorderRadius === 'square'
                ? '4px'
                : '14px',
          }}
        >
          {student.foto ? (
            <img src={student.foto} alt={student.nama} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#0284c7] text-white p-2 text-center">
              <span className="text-[10px] font-bold">Foto Siswa</span>
              <span className="text-[7.5px] opacity-80">3x4</span>
            </div>
          )}
        </div>
      </div>

      {/* Student Data Block */}
      <div className="absolute left-[132px] top-[102px] right-[136px] z-20">
        <div
          className="pl-2 border-l-[3.5px] py-0.5 leading-tight"
          style={{ borderColor: primaryCol }}
        >
          <h3
            className="text-[12.5px] font-black uppercase tracking-tight truncate drop-shadow-2xs leading-tight"
            style={{ color: primaryCol }}
          >
            {student.nama}
          </h3>
          <div
            className="text-[10px] font-mono font-extrabold tracking-wider mt-0.5 flex items-center gap-1.5 flex-wrap"
            style={{ color: primaryCol }}
          >
            <span>{student.nisn}</span>
            {student.nis && (
              <span className="text-[7.5px] font-sans font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1 py-0.2 rounded">
                NIS: {student.nis}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 text-[8.5px] font-extrabold text-slate-800 uppercase leading-none">
          <Calendar className="w-3.2 h-3.2 text-[#0b3565] flex-shrink-0" />
          <span className="truncate">{formatTtl()}</span>
        </div>

        <div className="mt-2 flex items-start gap-1.5 leading-none">
          <UserCheck className="w-3.2 h-3.2 text-[#0b3565] flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-[6.5px] font-bold text-slate-600 block uppercase">
              BERLAKU S/D
            </span>
            <span
              className="text-[10px] font-extrabold block mt-0.5"
              style={{ color: primaryCol }}
            >
              {formatBerlaku()}
            </span>
          </div>
        </div>
      </div>

      {/* Right Endorsement & QR */}
      <div className="absolute right-4 bottom-2.5 z-20 flex flex-col items-end text-right">
        {qrDataUrl && (
          <div
            onClick={handleQrClick}
            title="Klik untuk membuka tautan verifikasi keaslian kartu pelajar"
            className="bg-white p-0.5 rounded shadow-2xs border border-slate-200 mb-1 cursor-pointer hover:border-blue-500 hover:ring-2 hover:ring-blue-400/30 transition-all group"
          >
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="w-16 h-16 object-contain group-hover:scale-105 transition-transform"
            />
            <span className="text-[5px] font-mono text-blue-700 font-bold block text-center mt-0.5 group-hover:underline">
              KLIK / SCAN
            </span>
          </div>
        )}

        <div className="relative pr-0.5 text-right leading-none">
          <p className="text-[6.5px] font-semibold text-slate-700">
            {settings.kepalaSekolahJabatan}
          </p>

          <div className="relative h-7 w-26 my-0.5 ml-auto flex items-center justify-end">
            {settings.showStempel && settings.stempelUrl && (
              <img
                src={settings.stempelUrl}
                alt="Stempel"
                className="absolute -top-1.5 right-6 w-11 h-11 object-contain pointer-events-none -rotate-12 mix-blend-multiply opacity-90 z-20"
              />
            )}
            {settings.showTandaTangan && settings.tandaTanganUrl && (
              <img
                src={settings.tandaTanganUrl}
                alt="TTD"
                className="w-20 h-7 object-contain relative z-10"
              />
            )}
          </div>

          <p className="text-[7.5px] font-bold text-slate-900 underline underline-offset-1">
            {settings.kepalaSekolahNama}
          </p>
          <p className="text-[6px] font-mono text-slate-600 mt-0.5">
            NIP: {settings.kepalaSekolahNip}
          </p>
        </div>
      </div>
    </div>
  );

  // Render template dispatcher
  const renderFrontSide = () => {
    switch (settings.templateStyle) {
      case 'smart_card':
        return renderSmartCard();
      case 'classic_kop':
        return renderClassicKop();
      case 'canva_modern':
        return renderCanvaModern();
      case 'resmi_kedinasan':
      default:
        return renderResmiKedinasan();
    }
  };

  return (
    <div
      className={`student-card-root relative select-none overflow-hidden print:shadow-none print:m-0 ${
        showShadow ? 'shadow-xl hover:shadow-2xl transition-shadow' : ''
      } ${className}`}
      style={{
        width: `${widthPx * scale}px`,
        height: `${heightPx * scale}px`,
        minWidth: `${widthPx * scale}px`,
        minHeight: `${heightPx * scale}px`,
        backgroundColor: '#ffffff',
        borderRadius: `${14 * scale}px`,
      }}
    >
      <div
        className="w-full h-full relative overflow-hidden flex flex-col justify-between bg-white"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        }}
      >
        {/* Subtle Center School Emblem Watermark */}
        {settings.showWatermark && (
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-0"
            style={{ opacity: settings.watermarkOpacity || 0.07 }}
          >
            <img
              src={settings.schoolLogo}
              alt=""
              className="w-48 h-48 object-contain filter grayscale contrast-125"
            />
          </div>
        )}

        {side === 'front' ? (
          renderFrontSide()
        ) : (
          // ======================== BACK SIDE (TATA TERTIB & BARCODE) ========================
          <div className="relative w-full h-full flex flex-col justify-between text-slate-800 z-10 overflow-hidden bg-white">
            {/* Top Magnetic Security Band */}
            <div
              className="w-full h-8 px-4 flex items-center justify-between text-white shadow-2xs"
              style={{ backgroundColor: primaryCol }}
            >
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-[7.5px] font-mono font-bold tracking-wider text-slate-100">
                  {settings.schoolName || 'SMA NEGERI 1 JULOK'} • ID: {student.nisn}
                </span>
              </div>
              <span
                className="text-[7px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/20"
                style={{ color: accentCol }}
              >
                OFFICIAL STUDENT ID
              </span>
            </div>

            {/* Rules Content */}
            <div className="flex-1 px-4 py-2 flex flex-col justify-between">
              <div>
                <h3
                  className="text-[10px] font-black uppercase tracking-wide text-center pb-1 border-b"
                  style={{
                    color: primaryCol,
                    borderColor: `${primaryCol}30`,
                  }}
                >
                  {settings.backTitle || 'TATA TERTIB & KETENTUAN KARTU PELAJAR'}
                </h3>

                <ol className="mt-1.5 space-y-1.5 text-slate-700 text-[7.5px] leading-tight list-decimal list-inside font-medium">
                  {settings.backRules.map((rule, idx) => (
                    <li key={idx} className="leading-snug">
                      <span className="font-normal">{rule}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Notice Box & Bottom Barcode */}
              <div className="mt-auto pt-1 flex flex-col items-center">
                <div className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 mb-1 text-center">
                  <p className="text-[6px] text-slate-600 font-medium leading-tight">
                    Barang siapa menemukan kartu ini mohon dikembalikan ke pihak sekolah atau pos terdekat.
                  </p>
                </div>

                <div className="w-full max-w-[280px] bg-slate-50 border border-slate-300 rounded-lg p-1.5 shadow-2xs flex items-center justify-between gap-2">
                  {/* Barcode Garis 1D */}
                  <div
                    onClick={handleQrClick}
                    title="Klik atau scan untuk membuka tautan verifikasi keaslian kartu"
                    className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:opacity-90"
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: generateBarcodeSvg(student.nisn, 195, 28),
                      }}
                    />
                    <span className="text-[5.5px] font-mono font-bold text-slate-700 block mt-0.5">
                      NISN: {student.nisn}
                    </span>
                  </div>

                  {/* QR Link Aktif */}
                  {qrDataUrl && (
                    <div
                      onClick={handleQrClick}
                      title="Scan dengan kamera HP untuk verifikasi keaslian digital"
                      className="p-1 bg-white rounded border border-slate-300 shadow-2xs flex flex-col items-center cursor-pointer hover:border-blue-500 hover:ring-2 hover:ring-blue-400/40 transition-all flex-shrink-0 group"
                    >
                      <img
                        src={qrDataUrl}
                        alt="QR Link"
                        className="w-[38px] h-[38px] object-contain group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[4.5px] font-mono text-blue-700 font-extrabold block mt-0.5 group-hover:underline">
                        SCAN LINK
                      </span>
                    </div>
                  )}
                </div>

                <span
                  onClick={handleQrClick}
                  className="text-[5.5px] font-mono text-blue-700 font-extrabold block text-center mt-0.5 cursor-pointer hover:underline"
                >
                  ● SCAN BARCODE / QR CODE DENGAN KAMERA HP UNTUK VERIFIKASI KEASLIAN
                </span>

                <p className="text-[6.5px] text-slate-600 font-semibold text-center mt-0.5">
                  {settings.backFooterNote || 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur 24458'}
                </p>
              </div>
            </div>

            {/* Bottom Accent Ribbon */}
            <div
              className="w-full px-3 py-1 flex items-center justify-between text-[7px] font-extrabold text-white uppercase tracking-wider"
              style={{
                background: `linear-gradient(90deg, ${primaryCol} 0%, ${secondaryCol} 100%)`,
              }}
            >
              <span>{settings.schoolName || 'SMA NEGERI 1 JULOK'}</span>
              <span>{settings.provinsiText || 'KABUPATEN ACEH TIMUR'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
