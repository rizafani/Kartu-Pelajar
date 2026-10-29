import React, { useEffect, useState, useRef } from 'react';
import { CardSettings, Student } from '../types';
import {
  generateBarcodeSvg,
  generateQrDataUrl,
  getQrStringForStudent,
  buildStudentVerificationUrl,
} from '../utils/barcodeGenerator';
import { MapPin, Globe, Mail, Calendar, UserCheck, ShieldCheck, Wifi, Sparkles, Award, Star, Cpu } from 'lucide-react';
import { GOLD_EMV_CHIP_SVG, SECURITY_GUILLOCHE_SVG } from '../data/defaults';

interface StudentCardProps {
  student: Student;
  settings: CardSettings;
  side?: 'front' | 'back';
  scale?: number;
  autoFit?: boolean;
  className?: string;
  showShadow?: boolean;
  onOpenVerification?: (student: Student) => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  settings,
  side = 'front',
  scale,
  autoFit = true,
  className = '',
  showShadow = true,
  onOpenVerification,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const isLandscape = settings.orientation === 'landscape';

  // Responsive container width observer
  useEffect(() => {
    if (!autoFit) return;
    const el = wrapperRef.current;
    if (!el) return;

    const measure = () => {
      const parent = el.parentElement;
      const width = parent ? parent.clientWidth : el.clientWidth;
      if (width > 0) {
        setContainerWidth(width);
      }
    };

    measure();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      const target = el.parentElement || el;
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      ro.observe(target);
    }

    window.addEventListener('resize', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [autoFit]);

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

  // Front NISN Barcode element (Authentic Code128 format from student.nisn)
  const renderFrontNisnBarcode = (
    variant: 'light' | 'gold' | 'dark' | 'emerald' | 'rose' = 'light',
    customWidth = 84
  ) => {
    if (settings.showFrontBarcode === false) return null;

    const bgClass =
      variant === 'gold'
        ? 'bg-amber-50/95 border-amber-300'
        : variant === 'emerald'
        ? 'bg-emerald-50/95 border-emerald-300'
        : variant === 'rose'
        ? 'bg-rose-50/95 border-rose-300'
        : variant === 'dark'
        ? 'bg-slate-900 border-cyan-500/60'
        : 'bg-white border-slate-300';

    const textClass =
      variant === 'gold'
        ? 'text-amber-950'
        : variant === 'emerald'
        ? 'text-emerald-950'
        : variant === 'rose'
        ? 'text-rose-950'
        : variant === 'dark'
        ? 'text-cyan-300'
        : 'text-slate-800';

    return (
      <div
        onClick={handleQrClick}
        title="Klik atau scan Barcode NISN siswa untuk verifikasi"
        className={`w-full mt-1 p-0.5 rounded border shadow-2xs flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.02] ${bgClass}`}
      >
        <div
          className="w-full flex items-center justify-center overflow-hidden"
          dangerouslySetInnerHTML={{
            __html: generateBarcodeSvg(student.nisn, customWidth, 18, {
              displayValue: false,
              lineColor: variant === 'dark' ? '#22d3ee' : '#0f172a',
              background: variant === 'dark' ? '#0f172a' : '#ffffff',
            }),
          }}
        />
        <div className="flex items-center justify-between w-full px-1 mt-0.5">
          <span className={`text-[6px] font-mono font-black tracking-wide leading-none ${textClass}`}>
            NISN: {student.nisn}
          </span>
          {student.nis && (
            <span className="text-[5px] font-mono font-bold text-slate-500 leading-none">
              NIS: {student.nis}
            </span>
          )}
        </div>
      </div>
    );
  };

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
          {/* Logo Kiri: Logo Sekolah (SMA Negeri 1 Julok) - Diturunkan ke bawah agar tampil penuh tidak terpotong */}
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
            <img
              src={settings.schoolLogo}
              alt="Logo Sekolah"
              className="h-11 w-11 object-contain drop-shadow-2xs p-0.5"
            />
          </div>

          {/* Kop Teks Dinas Resmi - Compact & Strong Presence */}
          <div className="flex-1 text-center px-1">
            <h4 className="text-[7.5px] font-extrabold uppercase tracking-widest text-slate-700 leading-none">
              {settings.provinsiText || 'PEMERINTAH ACEH'}
            </h4>
            <h5 className="text-[7px] font-bold uppercase tracking-wide text-slate-600 leading-tight mt-0.5">
              {settings.dinasText || 'DINAS PENDIDIKAN'}
            </h5>
            <h1
              className="text-[12px] font-black uppercase tracking-tight leading-none my-0.5"
              style={{ color: primaryCol }}
            >
              {settings.schoolName || 'SMA NEGERI 1 JULOK'}
            </h1>
            <p className="text-[5.8px] text-slate-600 font-semibold leading-tight truncate max-w-[280px] mx-auto">
              {settings.schoolAddress || 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur'} • NPSN: {settings.npsn || '10101877'}
            </p>
            <p className="text-[5.5px] text-slate-500 font-medium leading-tight truncate max-w-[280px] mx-auto mt-0.5">
              website : {settings.website || 'sman1julok.sch.id'}, Email : {settings.email || 'info@sman1julok.sch.id'}
            </p>
          </div>

          {/* Logo Kanan: Logo Pemerintah Aceh */}
          <div className="flex-shrink-0 flex items-center justify-end mt-1">
            {settings.showPancasila && (
              <img
                src={settings.pancasilaLogo}
                alt="Logo Pemerintah Aceh"
                className="h-11 w-auto max-w-[44px] object-contain drop-shadow-2xs p-0.5"
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

      {/* 2. CARD TITLE BANNER (Tulisan Kartu Pelajar persis di tengah) */}
      <div
        className="w-full py-1 px-3 relative flex items-center justify-center text-white shadow-2xs z-20"
        style={{
          background: `linear-gradient(90deg, ${primaryCol} 0%, ${secondaryCol} 100%)`,
        }}
      >
        <span className="text-[9.5px] font-black tracking-widest uppercase flex items-center justify-center gap-1.5 text-center">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
          {settings.cardTitle || 'KARTU PELAJAR'}
        </span>
        <span className="absolute right-3 text-[7.5px] font-mono font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-black/25 text-amber-300">
          NISN: {student.nisn}
        </span>
      </div>

      {/* 3. MAIN BODY: FOTO BESAR + TABEL IDENTITAS LENGKAP + PENGESAHAN (NO DEAD WHITE SPACE) */}
      <div className="flex-1 px-2.5 py-1.5 flex items-stretch gap-2 z-20 relative">
        {/* Kolom Kiri: Pas Foto Siswa Ukuran Standar 3x4 Proporsional */}
        <div className="flex flex-col items-center flex-shrink-0 justify-between w-[86px]">
          <div
            className="relative overflow-hidden bg-blue-600 border-2 border-slate-700/80 shadow-xs w-full"
            style={{
              height: settings.frontBarcodePosition === 'under_table' ? '116px' : '92px',
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

          {/* Barcode dari Nomor NISN Siswa di Bagian Depan */}
          {settings.frontBarcodePosition !== 'under_table' ? (
            renderFrontNisnBarcode('light', 84)
          ) : (
            <div className="mt-1 text-center w-full bg-slate-100 rounded border border-slate-300 py-0.5 px-1 shadow-2xs">
              <span className="text-[7.5px] font-mono font-extrabold text-slate-900 leading-none block">
                NIS: {student.nis || '-'}
              </span>
              <span className="text-[5.5px] font-bold text-emerald-700 uppercase tracking-tighter block mt-0.5">
                ● SISWA AKTIF
              </span>
            </div>
          )}
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
  // TEMPLATE 2: GARUDA PRESISI KEEMASAN (Presidential Gold Edition)
  // --------------------------------------------------------------------------
  const renderGarudaEmas = () => (
    <div className="relative w-full h-full text-slate-900 z-10 overflow-hidden flex flex-col justify-between">
      {/* Background Guilloche Security Linework with Golden Tint */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 z-0 bg-repeat"
        style={{ backgroundImage: `url("${SECURITY_GUILLOCHE_SVG}")` }}
      />

      {/* Top Gold Foil Royal Banner */}
      <div className="w-full pt-1.5 px-3 pb-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 shadow-xs z-20 flex flex-col">
        <div className="flex items-center justify-between gap-2">
          {/* Logo Sekolah */}
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
            <div className="p-0.5 rounded-full bg-white/90 shadow-2xs">
              <img
                src={settings.schoolLogo}
                alt="Logo Sekolah"
                className="h-10.5 w-10.5 object-contain drop-shadow-xs"
              />
            </div>
          </div>

          {/* Kop Teks Royal Gold */}
          <div className="flex-1 text-center px-1">
            <h4 className="text-[7.5px] font-black uppercase tracking-widest text-amber-950 drop-shadow-2xs leading-tight">
              {settings.provinsiText || 'PEMERINTAH ACEH'}
            </h4>
            <h5 className="text-[7px] font-bold uppercase tracking-wider text-amber-900 leading-tight">
              {settings.dinasText || 'DINAS PENDIDIKAN'}
            </h5>
            <h1 className="text-[12px] font-black uppercase tracking-tight leading-tight my-0.5 text-slate-950">
              {settings.schoolName || 'SMA NEGERI 1 JULOK'}
            </h1>
            <p className="text-[5.8px] text-amber-950 font-bold leading-tight truncate max-w-[280px] mx-auto opacity-90">
              {settings.schoolAddress || 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur'} • NPSN: {settings.npsn || '10101877'}
            </p>
            <p className="text-[5.5px] text-amber-950 font-semibold leading-tight truncate max-w-[280px] mx-auto mt-0.5">
              website : {settings.website || 'sman1julok.sch.id'}, Email : {settings.email || 'info@sman1julok.sch.id'}
            </p>
          </div>

          {/* Logo Pemerintah Aceh / Garuda */}
          <div className="flex-shrink-0 flex items-center justify-end mt-1">
            {settings.showPancasila && (
              <div className="p-0.5 rounded-full bg-white/90 shadow-2xs">
                <img
                  src={settings.pancasilaLogo}
                  alt="Logo Pemerintah Aceh"
                  className="h-10.5 w-auto max-w-[40px] object-contain drop-shadow-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Double Gold Line Rim */}
        <div className="w-full mt-1 flex flex-col gap-0.5">
          <div className="w-full h-[2px] bg-amber-900/40" />
          <div className="w-full h-[0.75px] bg-amber-950/20" />
        </div>
      </div>

      {/* Sub-header Bar: Card Title persis di tengah */}
      <div
        className="w-full py-0.5 px-3 relative flex items-center justify-center text-white shadow-2xs z-20"
        style={{
          background: `linear-gradient(90deg, ${primaryCol} 0%, #1e293b 100%)`,
        }}
      >
        <span className="text-[8.5px] font-black uppercase tracking-widest text-amber-300 flex items-center justify-center gap-1 text-center">
          <Sparkles className="w-2.5 h-2.5 text-amber-400" />
          {settings.cardTitle || 'KARTU PELAJAR'}
        </span>
        <span className="absolute right-3 text-[7.5px] font-mono font-black text-amber-300 tracking-wider">
          NISN: {student.nisn}
        </span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-3 py-1 flex items-stretch gap-2.5 z-20 overflow-hidden">
        {/* Kolom Kiri: Foto dengan Bingkai Emas */}
        <div className="flex flex-col items-center flex-shrink-0 justify-between w-[84px] py-0.5">
          <div className="relative p-0.5 rounded bg-gradient-to-b from-amber-400 via-yellow-200 to-amber-500 shadow-xs">
            <div
              className="relative overflow-hidden bg-slate-200 w-[74px]"
              style={{
                height: settings.frontBarcodePosition === 'under_table' ? '98px' : '82px',
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

              {/* Hologram Badge */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 py-0.5 text-[5.5px] font-black text-center text-amber-950 uppercase tracking-widest shadow-2xs">
                ★ ORIGINAL ★
              </div>
            </div>
          </div>

          {/* Barcode NISN Siswa di Bagian Depan */}
          {settings.frontBarcodePosition !== 'under_table' ? (
            renderFrontNisnBarcode('gold', 84)
          ) : (
            <div className="mt-1 text-center w-full bg-amber-50 rounded border border-amber-300 py-0.5 px-1 shadow-2xs">
              <span className="text-[7.5px] font-mono font-extrabold text-amber-950 leading-none block">
                NIS: {student.nis || '-'}
              </span>
              <span className="text-[5.5px] font-bold text-emerald-800 uppercase tracking-tighter block mt-0.5">
                ● SISWA AKTIF
              </span>
            </div>
          )}
        </div>

        {/* Kolom Tengah: Tabel Identitas Siswa Resmi */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <table className="w-full text-[8.5px] leading-tight border-collapse">
            <tbody>
              <tr className="border-b border-amber-100">
                <td className="w-[74px] font-bold text-slate-700 py-[3px] whitespace-nowrap text-[8px]">
                  NIS / NISN
                </td>
                <td className="w-[8px] text-center text-amber-600 font-bold">:</td>
                <td className="font-mono font-extrabold text-slate-900 py-[3px]">
                  {student.nis || '-'} / {student.nisn}
                </td>
              </tr>
              <tr className="border-b border-amber-100">
                <td className="font-bold text-slate-700 py-[3px] whitespace-nowrap text-[8px]">
                  Nama Lengkap
                </td>
                <td className="text-center text-amber-600 font-bold">:</td>
                <td
                  className="font-black uppercase tracking-tight py-[3px] text-[9.5px] truncate max-w-[160px]"
                  style={{ color: primaryCol }}
                >
                  {student.nama}
                </td>
              </tr>
              <tr className="border-b border-amber-100">
                <td className="font-bold text-slate-700 py-[3px] whitespace-nowrap text-[8px]">
                  Tempat, Tgl Lahir
                </td>
                <td className="text-center text-amber-600 font-bold">:</td>
                <td className="font-bold text-slate-800 py-[3px] truncate max-w-[160px]">
                  {formatTtl()}
                </td>
              </tr>
              <tr className="border-b border-amber-100">
                <td className="font-bold text-slate-700 py-[3px] whitespace-nowrap text-[8px]">
                  Jenis Kelamin
                </td>
                <td className="text-center text-amber-600 font-bold">:</td>
                <td className="font-semibold text-slate-800 py-[3px]">
                  {student.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                </td>
              </tr>
              <tr className="border-b border-amber-100">
                <td className="font-bold text-slate-700 py-[3px] whitespace-nowrap align-top text-[8px]">
                  Alamat
                </td>
                <td className="text-center text-amber-600 font-bold align-top">:</td>
                <td className="font-medium text-slate-700 py-[3px] leading-tight line-clamp-2 max-w-[160px]">
                  {student.alamat || '-'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-700 py-[3px] whitespace-nowrap text-[8px]">
                  Berlaku S/D
                </td>
                <td className="text-center text-amber-600 font-bold">:</td>
                <td className="font-black text-emerald-800 py-[3px]">
                  {formatBerlaku()} <span className="font-normal text-[7px] text-slate-500">(Aktif)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Kolom Kanan: QR Code Emas & Pengesahan */}
        <div className="w-[102px] flex flex-col items-center justify-between text-center flex-shrink-0 border-l border-amber-200 pl-1.5 py-0.5">
          {qrDataUrl && (
            <div
              onClick={handleQrClick}
              title="Klik untuk membuka tautan verifikasi keaslian kartu pelajar"
              className="bg-amber-50 p-1 rounded border border-amber-400 shadow-2xs flex flex-col items-center cursor-pointer hover:border-amber-600 hover:ring-2 hover:ring-amber-400/40 transition-all group"
            >
              <img
                src={qrDataUrl}
                alt="QR Validasi"
                className="w-[52px] h-[52px] object-contain group-hover:scale-105 transition-transform"
              />
              <span className="text-[5px] font-mono text-amber-900 font-black block mt-0.5 tracking-tight group-hover:underline">
                ★ SCAN VERIFIKASI ★
              </span>
            </div>
          )}

          {/* Pengesahan Kepala Sekolah */}
          <div className="w-full relative mt-0.5">
            <p className="text-[6.5px] font-medium text-slate-600 leading-none">
              {settings.kotaPenerbit || 'Julok'}, {settings.tanggalTerbit || '15 Juli 2024'}
            </p>
            <p className="text-[7px] font-extrabold text-slate-800 leading-tight">
              {settings.kepalaSekolahJabatan || 'Kepala Sekolah'}
            </p>

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

      {/* Bottom Bar Garuda Emas */}
      <div
        className="w-full py-1 px-3 flex items-center justify-between text-amber-200 text-[6.5px] font-bold z-20 tracking-wider bg-slate-900 border-t border-amber-500/50"
      >
        <span>PRESIDENTIAL GOLD EDITION • DINAS PENDIDIKAN PROVINSI ACEH</span>
        <span className="font-mono text-amber-400">GARUDA CR80 RESMI</span>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // TEMPLATE 3: CYBER SMART ID (High-Tech Electronic ID-1 & RFID Pass)
  // --------------------------------------------------------------------------
  const renderCyberSmartId = () => (
    <div className="relative w-full h-full text-slate-900 z-10 overflow-hidden flex flex-col justify-between bg-slate-50">
      {/* Background Circuit Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 z-0 bg-repeat"
        style={{ backgroundImage: `url("${SECURITY_GUILLOCHE_SVG}")` }}
      />

      {/* Top Cyber Smart Header */}
      <div
        className="w-full pt-1.5 pb-1 px-3 flex items-center justify-between text-white shadow-xs z-20"
        style={{
          background: `linear-gradient(135deg, #0f172a 0%, #1e293b 60%, ${primaryCol} 100%)`,
        }}
      >
        <div className="flex items-center gap-2">
          <img
            src={settings.schoolLogo}
            alt="Logo Sekolah"
            className="w-8 h-8 object-contain drop-shadow-xs"
          />
          <div>
            <h1 className="text-[11px] font-black uppercase tracking-wider leading-none text-white">
              {settings.schoolName || 'SMA NEGERI 1 JULOK'}
            </h1>
            <p className="text-[6.5px] text-cyan-300 font-mono tracking-wide mt-0.5">
              {settings.provinsiText || 'PEMERINTAH ACEH'} • SMART CARD ID-1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rotate-90">
            <Wifi className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          </div>
          <span className="text-[6.5px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-cyan-300">
            RFID ACTIVE
          </span>
          {settings.showPancasila && (
            <img
              src={settings.pancasilaLogo}
              alt="Logo Pemerintah Aceh"
              className="w-7 h-8 object-contain drop-shadow-xs"
            />
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 px-3 py-1 flex items-stretch gap-2.5 z-20 overflow-hidden">
        {/* Left: EMV Chip + Photo + Barcode */}
        <div className="flex flex-col items-center flex-shrink-0 justify-between w-[84px] py-0.5">
          {/* Gold EMV Chip Simulation */}
          <div className="w-9 h-6 rounded overflow-hidden shadow-xs border border-amber-600/50 bg-amber-50">
            <img src={GOLD_EMV_CHIP_SVG} alt="Smart Chip" className="w-full h-full object-cover" />
          </div>

          {/* Photo */}
          <div
            className="relative overflow-hidden bg-slate-200 border-2 border-slate-700 shadow-xs w-[76px] mt-0.5"
            style={{
              height: settings.frontBarcodePosition === 'under_table' ? '90px' : '74px',
              borderRadius: '4px',
            }}
          >
            {student.foto ? (
              <img src={student.foto} alt={student.nama} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-blue-700 text-white p-1 text-center">
                <span className="text-[9px] font-bold">Foto</span>
                <span className="text-[7.5px] opacity-80">3 x 4</span>
              </div>
            )}
            <div className="absolute top-0 right-0 bg-cyan-600 text-[5px] font-mono text-white px-1 font-bold">
              PASS
            </div>
          </div>

          {/* Barcode NISN Siswa di Bagian Depan */}
          {settings.frontBarcodePosition !== 'under_table' ? (
            renderFrontNisnBarcode('dark', 82)
          ) : (
            <div className="text-center w-full bg-slate-200/80 rounded border border-slate-300 py-0.5 mt-0.5">
              <span className="text-[6.5px] font-mono font-extrabold text-slate-800">
                NIS: {student.nis || '-'}
              </span>
            </div>
          )}
        </div>

        {/* Center: Identity Block */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="border-b border-slate-200 pb-1">
            <h3
              className="text-[11px] font-black uppercase tracking-tight truncate leading-tight"
              style={{ color: primaryCol }}
            >
              {student.nama}
            </h3>
            <p className="text-[8px] font-mono font-bold text-slate-700 flex items-center gap-1.5">
              <span>NISN: {student.nisn}</span>
              <span className="text-[6px] font-sans px-1 rounded bg-cyan-100 text-cyan-800 border border-cyan-200">
                TERVERIFIKASI
              </span>
            </p>
          </div>

          <table className="w-full text-[8.5px] leading-tight border-collapse mt-0.5">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="w-[70px] font-bold text-slate-600 py-[3px] text-[8px]">TTL</td>
                <td className="w-2 font-bold text-slate-400">:</td>
                <td className="font-semibold text-slate-800 py-[3px] truncate max-w-[150px]">{formatTtl()}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="font-bold text-slate-600 py-[3px] text-[8px]">Jenis Kelamin</td>
                <td className="font-bold text-slate-400">:</td>
                <td className="font-semibold text-slate-800 py-[3px]">
                  {student.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="font-bold text-slate-600 py-[3px] text-[8px] align-top">Alamat</td>
                <td className="font-bold text-slate-400 align-top">:</td>
                <td className="font-medium text-slate-700 py-[3px] leading-tight line-clamp-2 max-w-[150px]">
                  {student.alamat || '-'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-600 py-[3px] text-[8px]">Berlaku S/D</td>
                <td className="font-bold text-slate-400">:</td>
                <td className="font-black text-emerald-700 py-[3px]">{formatBerlaku()} (Aktif)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right: QR Code & Endorsement */}
        <div className="w-[96px] flex flex-col items-center justify-between flex-shrink-0 text-center pl-1.5 border-l border-slate-200 py-0.5">
          {qrDataUrl && (
            <div
              onClick={handleQrClick}
              title="Klik untuk membuka tautan verifikasi keaslian kartu pelajar"
              className="p-1 bg-white rounded border border-cyan-400 shadow-2xs cursor-pointer hover:border-cyan-600 hover:ring-2 hover:ring-cyan-400/40 transition-all group"
            >
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-12 h-12 object-contain group-hover:scale-105 transition-transform"
              />
              <span className="text-[5px] font-mono text-cyan-800 font-extrabold block mt-0.5 group-hover:underline">
                SCAN SMART ID
              </span>
            </div>
          )}

          <div className="w-full relative mt-0.5">
            <p className="text-[6px] text-slate-600 font-medium">{settings.kotaPenerbit}, {settings.tanggalTerbit}</p>
            <p className="text-[6.5px] font-bold text-slate-800">{settings.kepalaSekolahJabatan}</p>
            <div className="relative h-6 w-full flex items-center justify-center my-0.5">
              {settings.showStempel && settings.stempelUrl && (
                <img
                  src={settings.stempelUrl}
                  alt="Stempel"
                  className="absolute -top-1 left-0 w-8 h-8 object-contain pointer-events-none -rotate-12 mix-blend-multiply opacity-85 z-20"
                />
              )}
              {settings.showTandaTangan && settings.tandaTanganUrl && (
                <img
                  src={settings.tandaTanganUrl}
                  alt="TTD"
                  className="w-16 h-6 object-contain relative z-10 mx-auto"
                />
              )}
            </div>
            <p className="text-[7px] font-black text-slate-900 underline truncate max-w-[94px] mx-auto">
              {settings.kepalaSekolahNama}
            </p>
            <p className="text-[5px] font-mono text-slate-600">NIP. {settings.kepalaSekolahNip}</p>
          </div>
        </div>
      </div>

      {/* Bottom Smart Bar */}
      <div
        className="w-full py-1 px-3 flex items-center justify-between text-white text-[6px] font-mono z-20 font-bold"
        style={{ backgroundColor: '#0f172a' }}
      >
        <span className="text-cyan-300">ISO/IEC 7810 ID-1 • SMART ELECTRONIC PASS</span>
        <span className="text-slate-300">VALID THRU: {formatBerlaku()}</span>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // TEMPLATE 4: BATIK NUSANTARA & ORNAMEN ACEH (Cultural Heritage Edition)
  // --------------------------------------------------------------------------
  const renderBatikNusantara = () => (
    <div className="relative w-full h-full text-slate-900 z-10 overflow-hidden flex flex-col justify-between bg-amber-50/30">
      {/* Background Batik Motif Watermark */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 z-0 bg-repeat"
        style={{ backgroundImage: `url("${SECURITY_GUILLOCHE_SVG}")` }}
      />

      {/* Top Traditional Kop Surat */}
      <div className="w-full pt-2 px-3 pb-1 bg-gradient-to-r from-red-950 via-rose-900 to-amber-950 text-white z-20 shadow-xs flex flex-col">
        <div className="flex items-center justify-between gap-2">
          {/* Logo Sekolah */}
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
            <div className="p-0.5 rounded-lg bg-white/95 shadow-2xs">
              <img
                src={settings.schoolLogo}
                alt="Logo Sekolah"
                className="h-10.5 w-10.5 object-contain drop-shadow-xs"
              />
            </div>
          </div>

          {/* Kop Teks Budaya */}
          <div className="flex-1 text-center px-1">
            <h4 className="text-[7.5px] font-black uppercase tracking-widest text-amber-300 drop-shadow-2xs leading-tight">
              {settings.provinsiText || 'PEMERINTAH ACEH'}
            </h4>
            <h5 className="text-[7px] font-bold uppercase tracking-wider text-rose-200 leading-tight">
              {settings.dinasText || 'DINAS PENDIDIKAN'}
            </h5>
            <h1 className="text-[12px] font-black uppercase tracking-tight leading-tight my-0.5 text-white">
              {settings.schoolName || 'SMA NEGERI 1 JULOK'}
            </h1>
            <p className="text-[5.8px] text-amber-200/90 font-medium leading-tight truncate max-w-[280px] mx-auto">
              {settings.schoolAddress || 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur'} • NPSN: {settings.npsn || '10101877'}
            </p>
            <p className="text-[5.5px] text-amber-200/90 font-medium leading-tight truncate max-w-[280px] mx-auto mt-0.5">
              website : {settings.website || 'sman1julok.sch.id'}, Email : {settings.email || 'info@sman1julok.sch.id'}
            </p>
          </div>

          {/* Logo Pemerintah Aceh */}
          <div className="flex-shrink-0 flex items-center justify-end mt-1">
            {settings.showPancasila && (
              <div className="p-0.5 rounded-lg bg-white/95 shadow-2xs">
                <img
                  src={settings.pancasilaLogo}
                  alt="Logo Pemerintah Aceh"
                  className="h-10.5 w-auto max-w-[40px] object-contain drop-shadow-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Decorative Ornamen Border */}
        <div className="w-full mt-1 flex items-center justify-center gap-1">
          <div className="h-[1.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent flex-1" />
          <span className="text-[7px] text-amber-300 font-bold">❖ PINTU ACEH ❖</span>
          <div className="h-[1.5px] bg-gradient-to-r from-transparent via-amber-400 to-transparent flex-1" />
        </div>
      </div>

      {/* Sub-header Bar: Title persis di tengah */}
      <div className="w-full py-0.5 px-3 relative flex items-center justify-center bg-amber-100/90 border-b border-amber-300 text-amber-950 font-black text-[8.5px] z-20">
        <span className="uppercase tracking-widest flex items-center justify-center gap-1 text-center">
          <Award className="w-3 h-3 text-rose-800" />
          {settings.cardTitle || 'KARTU PELAJAR'}
        </span>
        <span className="absolute right-3 font-mono text-rose-900 text-[7.5px]">NISN: {student.nisn}</span>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-3 py-1 flex items-stretch gap-2.5 z-20 overflow-hidden">
        {/* Photo with Batik Corner Accents */}
        <div className="flex flex-col items-center flex-shrink-0 justify-between w-[84px] py-0.5">
          <div className="relative p-0.5 rounded bg-rose-900 border border-amber-400 shadow-xs">
            <div
              className="relative overflow-hidden bg-slate-200 w-[74px]"
              style={{
                height: settings.frontBarcodePosition === 'under_table' ? '98px' : '82px',
                borderRadius:
                  settings.photoBorderRadius === 'circle'
                    ? '50%'
                    : settings.photoBorderRadius === 'square'
                    ? '0px'
                    : '4px',
              }}
            >
              {student.foto ? (
                <img src={student.foto} alt={student.nama} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-rose-950 text-white p-1 text-center">
                  <span className="text-[10px] font-bold">Pas Foto</span>
                  <span className="text-[8px] opacity-80">3 x 4</span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-rose-950/90 py-0.5 text-[5.5px] font-black text-center text-amber-300 uppercase tracking-widest">
                WARISAN BANGSA
              </div>
            </div>
          </div>

          {/* Barcode NISN Siswa di Bagian Depan */}
          {settings.frontBarcodePosition !== 'under_table' ? (
            renderFrontNisnBarcode('rose', 84)
          ) : (
            <div className="mt-1 text-center w-full bg-rose-50 rounded border border-rose-300 py-0.5 px-1 shadow-2xs">
              <span className="text-[7.5px] font-mono font-extrabold text-rose-950 leading-none block">
                NIS: {student.nis || '-'}
              </span>
            </div>
          )}
        </div>

        {/* Identity Table */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <table className="w-full text-[8.5px] leading-tight border-collapse">
            <tbody>
              <tr className="border-b border-amber-200/80">
                <td className="w-[74px] font-bold text-rose-950 py-[3px] whitespace-nowrap text-[8px]">
                  NIS / NISN
                </td>
                <td className="w-[8px] text-center text-rose-800 font-bold">:</td>
                <td className="font-mono font-extrabold text-slate-900 py-[3px]">
                  {student.nis || '-'} / {student.nisn}
                </td>
              </tr>
              <tr className="border-b border-amber-200/80">
                <td className="font-bold text-rose-950 py-[3px] whitespace-nowrap text-[8px]">
                  Nama Lengkap
                </td>
                <td className="text-center text-rose-800 font-bold">:</td>
                <td className="font-black uppercase tracking-tight py-[3px] text-[9.5px] text-rose-900 truncate max-w-[160px]">
                  {student.nama}
                </td>
              </tr>
              <tr className="border-b border-amber-200/80">
                <td className="font-bold text-rose-950 py-[3px] whitespace-nowrap text-[8px]">
                  Tempat, Tgl Lahir
                </td>
                <td className="text-center text-rose-800 font-bold">:</td>
                <td className="font-bold text-slate-800 py-[3px] truncate max-w-[160px]">
                  {formatTtl()}
                </td>
              </tr>
              <tr className="border-b border-amber-200/80">
                <td className="font-bold text-rose-950 py-[3px] whitespace-nowrap text-[8px]">
                  Jenis Kelamin
                </td>
                <td className="text-center text-rose-800 font-bold">:</td>
                <td className="font-semibold text-slate-800 py-[3px]">
                  {student.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                </td>
              </tr>
              <tr className="border-b border-amber-200/80">
                <td className="font-bold text-rose-950 py-[3px] whitespace-nowrap align-top text-[8px]">
                  Alamat
                </td>
                <td className="text-center text-rose-800 font-bold align-top">:</td>
                <td className="font-medium text-slate-700 py-[3px] leading-tight line-clamp-2 max-w-[160px]">
                  {student.alamat || '-'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-rose-950 py-[3px] whitespace-nowrap text-[8px]">
                  Berlaku S/D
                </td>
                <td className="text-center text-rose-800 font-bold">:</td>
                <td className="font-black text-emerald-800 py-[3px]">
                  {formatBerlaku()} <span className="font-normal text-[7px] text-slate-500">(Aktif)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right QR & Endorsement */}
        <div className="w-[102px] flex flex-col items-center justify-between text-center flex-shrink-0 border-l border-amber-200 pl-1.5 py-0.5">
          {qrDataUrl && (
            <div
              onClick={handleQrClick}
              title="Klik untuk membuka tautan verifikasi keaslian kartu pelajar"
              className="bg-white p-1 rounded border border-rose-300 shadow-2xs flex flex-col items-center cursor-pointer hover:border-rose-600 hover:ring-2 hover:ring-rose-400/40 transition-all group"
            >
              <img
                src={qrDataUrl}
                alt="QR Validasi"
                className="w-[52px] h-[52px] object-contain group-hover:scale-105 transition-transform"
              />
              <span className="text-[5px] font-mono text-rose-950 font-bold block mt-0.5 group-hover:underline">
                ❖ SCAN KEASLIAN ❖
              </span>
            </div>
          )}

          <div className="w-full relative mt-0.5">
            <p className="text-[6.5px] font-medium text-slate-600 leading-none">
              {settings.kotaPenerbit || 'Julok'}, {settings.tanggalTerbit || '15 Juli 2024'}
            </p>
            <p className="text-[7px] font-extrabold text-slate-800 leading-tight">
              {settings.kepalaSekolahJabatan || 'Kepala Sekolah'}
            </p>
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

      {/* Bottom Cultural Banner */}
      <div className="w-full py-1 px-3 flex items-center justify-between text-amber-200 text-[6.5px] font-bold z-20 tracking-wider bg-rose-950">
        <span>EDISI WARISAN BUDAYA NUSANTARA • DINAS PENDIDIKAN ACEH</span>
        <span className="font-mono text-amber-300">CR80 RESMI</span>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // TEMPLATE 5: MINIMALIS MODERN (Metro Studio Swiss Typography Style)
  // --------------------------------------------------------------------------
  const renderMinimalisModern = () => (
    <div className="relative w-full h-full text-slate-900 z-10 overflow-hidden flex flex-col justify-between bg-white">
      {/* Left Vertical Accent Spine */}
      <div
        className="absolute left-0 inset-y-0 w-1.5 z-30"
        style={{ backgroundColor: primaryCol }}
      />

      {/* Top Modern Header */}
      <div className="w-full pt-2 pl-4 pr-3 pb-1.5 bg-slate-50 border-b border-slate-200 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={settings.schoolLogo}
            alt="Logo Sekolah"
            className="w-9 h-9 object-contain drop-shadow-xs"
          />
          <div>
            <h1
              className="text-[12px] font-black uppercase tracking-tight leading-none"
              style={{ color: primaryCol }}
            >
              {settings.schoolName || 'SMA NEGERI 1 JULOK'}
            </h1>
            <p className="text-[6.5px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">
              {settings.provinsiText || 'PEMERINTAH ACEH'} • {settings.dinasText || 'DINAS PENDIDIKAN'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[7.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-white">
            {settings.cardTitle || 'STUDENT ID'}
          </span>
          {settings.showPancasila && (
            <img
              src={settings.pancasilaLogo}
              alt="Logo Pemerintah Aceh"
              className="w-8 h-8 object-contain"
            />
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 pl-4 pr-3 py-1 flex items-stretch gap-3 z-20 overflow-hidden">
        {/* Photo */}
        <div className="flex flex-col items-center flex-shrink-0 justify-between w-[84px] py-0.5">
          <div
            className="relative overflow-hidden bg-slate-200 border border-slate-300 shadow-sm w-[78px]"
            style={{
              height: settings.frontBarcodePosition === 'under_table' ? '98px' : '82px',
              borderRadius: '6px',
            }}
          >
            {student.foto ? (
              <img src={student.foto} alt={student.nama} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-white p-1 text-center">
                <span className="text-[10px] font-bold">Pas Foto</span>
                <span className="text-[8px] opacity-75">3 x 4</span>
              </div>
            )}
          </div>

          {/* Barcode NISN Siswa di Bagian Depan */}
          {settings.frontBarcodePosition !== 'under_table' ? (
            renderFrontNisnBarcode('light', 84)
          ) : (
            <div className="text-center w-full bg-slate-100 rounded border border-slate-200 py-0.5 mt-1">
              <span className="text-[7px] font-mono font-bold text-slate-800">
                NIS: {student.nis || '-'}
              </span>
            </div>
          )}
        </div>

        {/* Identity Data */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div className="border-b border-slate-200 pb-1">
            <h3 className="text-[12px] font-black uppercase tracking-tight text-slate-900 truncate">
              {student.nama}
            </h3>
            <p className="text-[8px] font-mono font-bold text-blue-700">
              NISN: {student.nisn}
            </p>
          </div>

          <table className="w-full text-[8.5px] leading-tight border-collapse mt-0.5">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="w-[74px] font-bold text-slate-500 py-[3px] text-[8px]">TTL</td>
                <td className="w-2 font-bold text-slate-400">:</td>
                <td className="font-semibold text-slate-800 py-[3px] truncate max-w-[150px]">{formatTtl()}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="font-bold text-slate-500 py-[3px] text-[8px]">Jenis Kelamin</td>
                <td className="font-bold text-slate-400">:</td>
                <td className="font-semibold text-slate-800 py-[3px]">
                  {student.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="font-bold text-slate-500 py-[3px] text-[8px] align-top">Alamat</td>
                <td className="font-bold text-slate-400 align-top">:</td>
                <td className="font-medium text-slate-700 py-[3px] leading-tight line-clamp-2 max-w-[150px]">
                  {student.alamat || '-'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-slate-500 py-[3px] text-[8px]">Masa Berlaku</td>
                <td className="font-bold text-slate-400">:</td>
                <td className="font-black text-emerald-700 py-[3px]">{formatBerlaku()} (Aktif)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* QR Code & Signature */}
        <div className="w-[98px] flex flex-col items-center justify-between text-center flex-shrink-0 border-l border-slate-200 pl-2 py-0.5">
          {qrDataUrl && (
            <div
              onClick={handleQrClick}
              title="Klik untuk membuka tautan verifikasi keaslian kartu pelajar"
              className="p-1 bg-white rounded border border-slate-300 shadow-2xs cursor-pointer hover:border-slate-800 hover:ring-2 hover:ring-slate-400/30 transition-all group"
            >
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-12 h-12 object-contain group-hover:scale-105 transition-transform"
              />
              <span className="text-[5px] font-mono text-slate-700 font-bold block mt-0.5 group-hover:underline">
                VERIFIKASI DIGITAL
              </span>
            </div>
          )}

          <div className="w-full relative mt-0.5">
            <p className="text-[6px] text-slate-500 font-medium">{settings.kotaPenerbit}, {settings.tanggalTerbit}</p>
            <p className="text-[6.5px] font-bold text-slate-800">{settings.kepalaSekolahJabatan}</p>
            <div className="relative h-6 w-full flex items-center justify-center my-0.5">
              {settings.showStempel && settings.stempelUrl && (
                <img
                  src={settings.stempelUrl}
                  alt="Stempel"
                  className="absolute -top-1 left-0 w-8 h-8 object-contain pointer-events-none -rotate-12 mix-blend-multiply opacity-85 z-20"
                />
              )}
              {settings.showTandaTangan && settings.tandaTanganUrl && (
                <img
                  src={settings.tandaTanganUrl}
                  alt="TTD"
                  className="w-16 h-6 object-contain relative z-10 mx-auto"
                />
              )}
            </div>
            <p className="text-[7px] font-black text-slate-900 underline truncate max-w-[94px] mx-auto">
              {settings.kepalaSekolahNama}
            </p>
            <p className="text-[5px] font-mono text-slate-500">NIP. {settings.kepalaSekolahNip}</p>
          </div>
        </div>
      </div>

      {/* Bottom Minimalist Bar */}
      <div className="w-full py-1 pl-4 pr-3 flex items-center justify-between text-slate-600 text-[6.5px] font-semibold bg-slate-100 border-t border-slate-200">
        <span>KARTU TANDA PELAJAR RESMI • KABUPATEN ACEH TIMUR</span>
        <span className="font-mono text-slate-800">ISO-7810 CR80</span>
      </div>
    </div>
  );

  // --------------------------------------------------------------------------
  // TEMPLATE 6: ZAMRUD ISLAMI SERAMBI MEKKAH (Islamic Emerald Acehnese)
  // --------------------------------------------------------------------------
  const renderKartuHijauIslami = () => (
    <div className="relative w-full h-full text-slate-900 z-10 overflow-hidden flex flex-col justify-between bg-emerald-50/40">
      {/* Background Star Islamic Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15 z-0 bg-repeat"
        style={{ backgroundImage: `url("${SECURITY_GUILLOCHE_SVG}")` }}
      />

      {/* Top Emerald Islamic Kop */}
      <div className="w-full pt-2 px-3 pb-1 bg-gradient-to-r from-emerald-950 via-emerald-800 to-teal-950 text-white z-20 shadow-xs flex flex-col">
        <div className="flex items-center justify-between gap-2">
          {/* Logo Sekolah */}
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
            <div className="p-0.5 rounded-full bg-white shadow-2xs">
              <img
                src={settings.schoolLogo}
                alt="Logo Sekolah"
                className="h-10.5 w-10.5 object-contain drop-shadow-xs"
              />
            </div>
          </div>

          {/* Kop Teks Islami */}
          <div className="flex-1 text-center px-1">
            <h4 className="text-[7.5px] font-black uppercase tracking-widest text-emerald-200 drop-shadow-2xs leading-tight">
              {settings.provinsiText || 'PEMERINTAH ACEH'}
            </h4>
            <h5 className="text-[7px] font-bold uppercase tracking-wider text-teal-200 leading-tight">
              {settings.dinasText || 'DINAS PENDIDIKAN'}
            </h5>
            <h1 className="text-[12px] font-black uppercase tracking-tight leading-tight my-0.5 text-white">
              {settings.schoolName || 'SMA NEGERI 1 JULOK'}
            </h1>
            <p className="text-[5.8px] text-emerald-200/90 font-medium leading-tight truncate max-w-[280px] mx-auto">
              {settings.schoolAddress || 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur'} • NPSN: {settings.npsn || '10101877'}
            </p>
            <p className="text-[5.5px] text-emerald-200/90 font-medium leading-tight truncate max-w-[280px] mx-auto mt-0.5">
              website : {settings.website || 'sman1julok.sch.id'}, Email : {settings.email || 'info@sman1julok.sch.id'}
            </p>
          </div>

          {/* Logo Pemerintah Aceh */}
          <div className="flex-shrink-0 flex items-center justify-end mt-1">
            {settings.showPancasila && (
              <div className="p-0.5 rounded-full bg-white shadow-2xs">
                <img
                  src={settings.pancasilaLogo}
                  alt="Logo Pemerintah Aceh"
                  className="h-10.5 w-auto max-w-[40px] object-contain drop-shadow-xs"
                />
              </div>
            )}
          </div>
        </div>

        {/* Decorative Green Gold Rule */}
        <div className="w-full mt-1 flex items-center justify-center gap-1">
          <div className="h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent flex-1" />
          <span className="text-[7px] text-emerald-300 font-bold">★ SERAMBI MEKKAH ★</span>
          <div className="h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300 to-transparent flex-1" />
        </div>
      </div>

      {/* Sub-header Bar: Title persis di tengah */}
      <div className="w-full py-0.5 px-3 relative flex items-center justify-center bg-emerald-100 border-b border-emerald-300 text-emerald-950 font-black text-[8.5px] z-20">
        <span className="uppercase tracking-widest flex items-center justify-center gap-1 text-center">
          <Star className="w-2.5 h-2.5 text-emerald-700 fill-emerald-600" />
          {settings.cardTitle || 'KARTU PELAJAR'}
        </span>
        <span className="absolute right-3 font-mono text-emerald-900 text-[7.5px]">NISN: {student.nisn}</span>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-3 py-1 flex items-stretch gap-2.5 z-20 overflow-hidden">
        {/* Photo with Emerald Frame */}
        <div className="flex flex-col items-center flex-shrink-0 justify-between w-[84px] py-0.5">
          <div className="relative p-0.5 rounded bg-emerald-800 border border-emerald-400 shadow-xs">
            <div
              className="relative overflow-hidden bg-slate-200 w-[74px]"
              style={{
                height: settings.frontBarcodePosition === 'under_table' ? '98px' : '82px',
                borderRadius:
                  settings.photoBorderRadius === 'circle'
                    ? '50%'
                    : settings.photoBorderRadius === 'square'
                    ? '0px'
                    : '4px',
              }}
            >
              {student.foto ? (
                <img src={student.foto} alt={student.nama} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-900 text-white p-1 text-center">
                  <span className="text-[10px] font-bold">Pas Foto</span>
                  <span className="text-[8px] opacity-80">3 x 4</span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-emerald-950/90 py-0.5 text-[5.5px] font-black text-center text-emerald-200 uppercase tracking-widest">
                ISLAMI & BERAKHLAK
              </div>
            </div>
          </div>

          {/* Barcode NISN Siswa di Bagian Depan */}
          {settings.frontBarcodePosition !== 'under_table' ? (
            renderFrontNisnBarcode('emerald', 84)
          ) : (
            <div className="mt-1 text-center w-full bg-emerald-50 rounded border border-emerald-300 py-0.5 px-1 shadow-2xs">
              <span className="text-[7.5px] font-mono font-extrabold text-emerald-950 leading-none block">
                NIS: {student.nis || '-'}
              </span>
            </div>
          )}
        </div>

        {/* Identity Table */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <table className="w-full text-[8.5px] leading-tight border-collapse">
            <tbody>
              <tr className="border-b border-emerald-200">
                <td className="w-[74px] font-bold text-emerald-950 py-[3px] whitespace-nowrap text-[8px]">
                  NIS / NISN
                </td>
                <td className="w-[8px] text-center text-emerald-700 font-bold">:</td>
                <td className="font-mono font-extrabold text-slate-900 py-[3px]">
                  {student.nis || '-'} / {student.nisn}
                </td>
              </tr>
              <tr className="border-b border-emerald-200">
                <td className="font-bold text-emerald-950 py-[3px] whitespace-nowrap text-[8px]">
                  Nama Lengkap
                </td>
                <td className="text-center text-emerald-700 font-bold">:</td>
                <td className="font-black uppercase tracking-tight py-[3px] text-[9.5px] text-emerald-900 truncate max-w-[160px]">
                  {student.nama}
                </td>
              </tr>
              <tr className="border-b border-emerald-200">
                <td className="font-bold text-emerald-950 py-[3px] whitespace-nowrap text-[8px]">
                  Tempat, Tgl Lahir
                </td>
                <td className="text-center text-emerald-700 font-bold">:</td>
                <td className="font-bold text-slate-800 py-[3px] truncate max-w-[160px]">
                  {formatTtl()}
                </td>
              </tr>
              <tr className="border-b border-emerald-200">
                <td className="font-bold text-emerald-950 py-[3px] whitespace-nowrap text-[8px]">
                  Jenis Kelamin
                </td>
                <td className="text-center text-emerald-700 font-bold">:</td>
                <td className="font-semibold text-slate-800 py-[3px]">
                  {student.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                </td>
              </tr>
              <tr className="border-b border-emerald-200">
                <td className="font-bold text-emerald-950 py-[3px] whitespace-nowrap align-top text-[8px]">
                  Alamat
                </td>
                <td className="text-center text-emerald-700 font-bold align-top">:</td>
                <td className="font-medium text-slate-700 py-[3px] leading-tight line-clamp-2 max-w-[160px]">
                  {student.alamat || '-'}
                </td>
              </tr>
              <tr>
                <td className="font-bold text-emerald-950 py-[3px] whitespace-nowrap text-[8px]">
                  Berlaku S/D
                </td>
                <td className="text-center text-emerald-700 font-bold">:</td>
                <td className="font-black text-emerald-800 py-[3px]">
                  {formatBerlaku()} <span className="font-normal text-[7px] text-slate-500">(Aktif)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Right QR & Endorsement */}
        <div className="w-[102px] flex flex-col items-center justify-between text-center flex-shrink-0 border-l border-emerald-200 pl-1.5 py-0.5">
          {qrDataUrl && (
            <div
              onClick={handleQrClick}
              title="Klik untuk membuka tautan verifikasi keaslian kartu pelajar"
              className="bg-white p-1 rounded border border-emerald-400 shadow-2xs flex flex-col items-center cursor-pointer hover:border-emerald-700 hover:ring-2 hover:ring-emerald-400/40 transition-all group"
            >
              <img
                src={qrDataUrl}
                alt="QR Validasi"
                className="w-[52px] h-[52px] object-contain group-hover:scale-105 transition-transform"
              />
              <span className="text-[5px] font-mono text-emerald-900 font-bold block mt-0.5 group-hover:underline">
                ★ VERIFIKASI SAH ★
              </span>
            </div>
          )}

          <div className="w-full relative mt-0.5">
            <p className="text-[6.5px] font-medium text-slate-600 leading-none">
              {settings.kotaPenerbit || 'Julok'}, {settings.tanggalTerbit || '15 Juli 2024'}
            </p>
            <p className="text-[7px] font-extrabold text-slate-800 leading-tight">
              {settings.kepalaSekolahJabatan || 'Kepala Sekolah'}
            </p>
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

      {/* Bottom Islamic Emerald Banner */}
      <div className="w-full py-1 px-3 flex items-center justify-between text-emerald-200 text-[6.5px] font-bold z-20 tracking-wider bg-emerald-950">
        <span>SERAMBI MEKKAH • DINAS PENDIDIKAN PROVINSI ACEH</span>
        <span className="font-mono text-emerald-300">CR80 RESMI</span>
      </div>
    </div>
  );

  // Render template dispatcher
  const renderFrontSide = () => {
    switch (settings.templateStyle) {
      case 'garuda_emas':
        return renderGarudaEmas();
      case 'cyber_smart_id':
        return renderCyberSmartId();
      case 'batik_nusantara':
        return renderBatikNusantara();
      case 'minimalis_modern':
        return renderMinimalisModern();
      case 'kartu_hijau_islami':
        return renderKartuHijauIslami();
      case 'resmi_kedinasan':
      default:
        return renderResmiKedinasan();
    }
  };

  // Calculate effective scale based on container width or passed scale
  let effectiveScale = scale ?? 1;
  if (autoFit && containerWidth > 0) {
    // Leave safe padding for shadows
    const safeWidth = Math.max(220, containerWidth - 8);
    const fitScale = safeWidth / widthPx;
    effectiveScale = Math.min(1.15, fitScale);
  }

  const cardPixelWidth = Math.round(widthPx * effectiveScale);
  const cardPixelHeight = Math.round(heightPx * effectiveScale);

  return (
    <div
      ref={wrapperRef}
      className={`student-card-wrapper w-full flex items-center justify-center ${className}`}
    >
      <div
        className={`student-card-root relative select-none overflow-hidden print:shadow-none print:m-0 transition-all ${
          showShadow ? 'shadow-xl hover:shadow-2xl' : ''
        }`}
        style={{
          width: `${cardPixelWidth}px`,
          height: `${cardPixelHeight}px`,
          maxWidth: '100%',
          backgroundColor: '#ffffff',
          borderRadius: `${Math.round(14 * effectiveScale)}px`,
        }}
      >
        <div
          className="w-full h-full relative overflow-hidden flex flex-col justify-between bg-white"
          style={{
            transform: `scale(${effectiveScale})`,
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
  </div>
  );
};
