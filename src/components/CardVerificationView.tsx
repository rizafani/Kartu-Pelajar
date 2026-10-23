import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  RotateCw,
  Download,
  Printer,
  Copy,
  ExternalLink,
  School,
  Calendar,
  MapPin,
  Search,
  ArrowLeft,
  FileCheck2,
  Clock,
  Sparkles,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { CardSettings, Student } from '../types';
import { StudentCard } from './StudentCard';
import { downloadCardAsPng } from '../utils/cardExporter';
import { buildStudentVerificationUrl } from '../utils/barcodeGenerator';

interface CardVerificationViewProps {
  student: Student | null;
  settings: CardSettings;
  nisnQuery: string;
  allStudents: Student[];
  onSelectStudent: (student: Student) => void;
  onBackToDashboard: () => void;
}

export const CardVerificationView: React.FC<CardVerificationViewProps> = ({
  student,
  settings,
  nisnQuery,
  allStudents,
  onSelectStudent,
  onBackToDashboard,
}) => {
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [isFlipping, setIsFlipping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchNisn, setSearchNisn] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleFlip = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setCardSide((prev) => (prev === 'front' ? 'back' : 'front'));
      setIsFlipping(false);
    }, 150);
  };

  const handleCopyLink = () => {
    if (!student) return;
    const url = buildStudentVerificationUrl(student, settings);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleDownload = async (side: 'front' | 'back') => {
    if (!student) return;
    setDownloading(true);
    try {
      await downloadCardAsPng(student, settings, side);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchNisn.trim();
    if (!clean) return;
    const found = allStudents.find(
      (s) => s.nisn === clean || s.nis === clean || s.nama.toLowerCase().includes(clean.toLowerCase())
    );
    if (found) {
      onSelectStudent(found);
      setSearchNisn('');
    }
  };

  const verificationCode = student
    ? `SMAN1J-VERIF-${student.nisn}-${student.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`
    : '';

  const verificationTime = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-blue-950 text-slate-100 flex flex-col">
      {/* Top Government & School Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={settings.schoolLogo}
              alt="Logo Sekolah"
              className="w-9 h-9 object-contain drop-shadow-md"
            />
            <div className="border-l border-slate-700 pl-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-wider uppercase text-amber-400">
                  {settings.provinsiText || 'PEMERINTAH ACEH'}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] font-semibold text-slate-300">
                  {settings.dinasText || 'DINAS PENDIDIKAN'}
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                {settings.schoolName || 'SMA NEGERI 1 JULOK'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <img
              src={settings.pancasilaLogo}
              alt="Logo Pemerintah Aceh"
              className="h-9 w-auto object-contain hidden sm:block drop-shadow-md"
            />
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Masuk ke Studio Desain</span>
              <span className="sm:hidden">Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Verification Container */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        {student ? (
          <div className="space-y-6">
            {/* Authenticity Certificate Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-blue-950 border border-emerald-500/30 p-5 sm:p-7 shadow-2xl">
              <div className="absolute right-0 top-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
                <div className="flex items-start gap-3.5 sm:gap-4.5">
                  <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20 animate-pulse">
                    <ShieldCheck className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10.5px] font-black uppercase tracking-wider mb-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Status Kartu: ASLI & AKTIF
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      Verifikasi Keaslian Kartu Tanda Pelajar
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      Dokumen identitas digital ini sah dan diterbitkan secara resmi oleh{' '}
                      <span className="font-bold text-white">{settings.schoolName || 'SMA NEGERI 1 JULOK'}</span>,{' '}
                      Dinas Pendidikan Provinsi Aceh.
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer shadow-xs"
                    title="Salin tautan keaslian kartu untuk dibagikan"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-400" />
                    <span>{copied ? 'Tautan Tersalin! ✓' : 'Salin Tautan'}</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Bukti Verifikasi</span>
                  </button>
                </div>
              </div>

              {/* Timestamp & Verification Hash Meta */}
              <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Waktu Cek Realtime: <strong className="text-slate-200">{verificationTime}</strong></span>
                </div>
                <div className="font-mono text-[10px] bg-black/40 px-2.5 py-1 rounded-lg border border-slate-800 text-amber-300">
                  KODE VERIFIKASI: {verificationCode}
                </div>
              </div>
            </div>

            {/* Grid: 2 Columns (Card Preview & Official Records) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Interactive Authentic Card Preview (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Pratinjau Fisik Kartu CR-80
                    </span>
                    <button
                      onClick={handleFlip}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>{cardSide === 'front' ? 'Lihat Belakang' : 'Lihat Depan'}</span>
                    </button>
                  </div>

                  {/* Card Display with Flip Transition - Auto Responsive */}
                  <div className="py-2 flex items-center justify-center overflow-hidden w-full min-h-[240px] sm:min-h-[300px]">
                    <div
                      className={`w-full max-w-[480px] flex items-center justify-center transition-transform duration-200 ease-in-out ${
                        isFlipping ? 'scale-90 opacity-70 rotate-y-90' : 'scale-100 opacity-100'
                      }`}
                    >
                      <StudentCard
                        student={student}
                        settings={settings}
                        side={cardSide}
                        autoFit={true}
                        showShadow={true}
                      />
                    </div>
                  </div>

                  {/* Quick Download Buttons */}
                  <div className="w-full pt-4 mt-3 border-t border-slate-800 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleDownload('front')}
                      disabled={downloading}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Unduh Kartu Depan</span>
                    </button>
                    <button
                      onClick={() => handleDownload('back')}
                      disabled={downloading}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      <span>Unduh Kartu Belakang</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Verified Dossier Table & Endorsement (7 Cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Official Identity Dossier */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                    <div className="flex items-center gap-2">
                      <Award className="w-4.5 h-4.5 text-amber-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Data Identitas Siswa Terdaftar
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">
                      TERVALIDASI SISTEM
                    </span>
                  </div>

                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-800">
                      <tr>
                        <td className="w-36 py-2.5 text-slate-400 font-semibold">Nama Lengkap</td>
                        <td className="w-3 py-2.5 text-slate-600">:</td>
                        <td className="py-2.5 font-black text-sm text-amber-300 uppercase tracking-tight">
                          {student.nama}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Nomor Induk Siswa Nasional (NISN)</td>
                        <td className="py-2.5 text-slate-600">:</td>
                        <td className="py-2.5 font-mono font-bold text-white text-xs">
                          {student.nisn}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Nomor Induk Siswa (NIS)</td>
                        <td className="py-2.5 text-slate-600">:</td>
                        <td className="py-2.5 font-mono text-slate-200">
                          {student.nis || '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Tempat, Tanggal Lahir</td>
                        <td className="py-2.5 text-slate-600">:</td>
                        <td className="py-2.5 font-medium text-slate-200 uppercase">
                          {student.tempatLahir}, {student.tanggalLahir}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Jenis Kelamin</td>
                        <td className="py-2.5 text-slate-600">:</td>
                        <td className="py-2.5 text-slate-200">
                          {student.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                        </td>
                      </tr>

                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Alamat Tempat Tinggal</td>
                        <td className="py-2.5 text-slate-600">:</td>
                        <td className="py-2.5 text-slate-300 leading-relaxed">
                          {student.alamat || '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Masa Berlaku Kartu</td>
                        <td className="py-2.5 text-slate-600">:</td>
                        <td className="py-2.5 font-bold text-emerald-400">
                          {student.masaBerlaku || '06/2028'} <span className="text-[10px] text-slate-400 font-normal">(Aktif)</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Official Issuing Institution & Legal Endorsement */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                    <School className="w-4.5 h-4.5 text-blue-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Instansi Penerbit & Pengesahan Resmi
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Satuan Pendidikan:</span>
                      <strong className="text-white text-sm block mt-0.5">
                        {settings.schoolName || 'SMA NEGERI 1 JULOK'}
                      </strong>
                      <span className="text-slate-400 text-[11px] block mt-0.5">
                        NPSN: {settings.npsn || '10101877'} • Akreditasi: {settings.akreditasi || 'A'}
                      </span>
                      <span className="text-slate-400 text-[11px] block mt-0.5">
                        {settings.schoolAddress}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Disahkan Oleh Kepala Sekolah:</span>
                      <strong className="text-amber-300 text-sm block mt-0.5">
                        {settings.kepalaSekolahNama || 'Irmi, S.Pd., M.Pd'}
                      </strong>
                      <span className="text-slate-400 text-[11px] font-mono block mt-0.5">
                        NIP. {settings.kepalaSekolahNip || '1980102 200504 2 001'}
                      </span>
                      <span className="text-slate-400 text-[11px] block mt-0.5">
                        Kota Penerbit: {settings.kotaPenerbit || 'Julok'}, {settings.tanggalTerbit || '15 Juli 2026'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Lookup for Other Students */}
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-white block">Cek Keaslian Siswa Lainnya:</span>
                    <span className="text-[11px] text-slate-400">Masukkan nomor NISN siswa yang ingin diperiksa</span>
                  </div>
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Masukkan NISN..."
                      value={searchNisn}
                      onChange={(e) => setSearchNisn(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-44 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Cek
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Student Not Found / Search Fallback */
          <div className="max-w-xl mx-auto py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Data Siswa Belum Ditemukan
            </h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              NISN <strong className="font-mono text-amber-300">{nisnQuery || 'tidak terisi'}</strong> belum
              tercatat dalam pratinjau verifikasi lokal. Silakan pilih dari daftar siswa yang tersedia:
            </p>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-h-72 overflow-y-auto text-left space-y-2 mt-4">
              {allStudents.map((std) => (
                <button
                  key={std.id}
                  onClick={() => onSelectStudent(std)}
                  className="w-full p-2.5 rounded-xl bg-slate-800/80 hover:bg-blue-600/30 border border-slate-700 text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-sm text-white block">{std.nama}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      NISN: {std.nisn} • Kelas: {std.kelas}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-blue-400">Pilih & Periksa →</span>
                </button>
              ))}
            </div>

            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Studio Desain</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500 bg-slate-950">
        <p>
          Sistem Verifikasi Kartu Pelajar Digital Resmi • SMA Negeri 1 Julok • Provinsi Aceh
        </p>
      </footer>
    </div>
  );
};
