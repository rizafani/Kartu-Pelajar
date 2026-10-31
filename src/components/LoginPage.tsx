import React, { useState } from 'react';
import {
  ShieldCheck,
  QrCode,
  Users,
  CreditCard,
  Database,
  ArrowRight,
  Sparkles,
  School,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { SMAN1_JULOK_LOGO_PATH, ACEH_GOV_LOGO_PATH } from '../data/defaults';

interface LoginPageProps {
  onLogin: (useRedirect?: boolean) => Promise<void>;
  isLoggingIn: boolean;
  authError: { code: string; message: string; domain: string } | null;
  onClearAuthError: () => void;
  onQuickVerify?: (nisn: string) => void;
  onContinueAsGuest?: () => void;
  schoolName?: string;
  totalStudents?: number;
  totalClasses?: number;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  isLoggingIn,
  authError,
  onClearAuthError,
  onQuickVerify,
  onContinueAsGuest,
  schoolName = 'SMA NEGERI 1 JULOK',
  totalStudents = 0,
  totalClasses = 0,
}) => {
  const [quickNisn, setQuickNisn] = useState('');
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const handleQuickVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickNisn.trim() && onQuickVerify) {
      onQuickVerify(quickNisn.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Background Decorative Glow & Guilloche Motif */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/70 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center border border-white/15 shadow-sm">
              <img
                src={SMAN1_JULOK_LOGO_PATH}
                alt="Logo SMAN 1 Julok"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white tracking-tight uppercase">
                  {schoolName}
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Akreditasi A • NPSN 10101877
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pemerintah Aceh • Dinas Pendidikan • Cabang Dinas Wilayah Aceh Timur
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <img
              src={ACEH_GOV_LOGO_PATH}
              alt="Pemerintah Aceh"
              className="h-8 w-auto object-contain drop-shadow-sm opacity-90 hidden sm:block"
            />
          </div>
        </div>
      </header>

      {/* Main Login Hero & Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Brand, Vision & Features */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/25 text-blue-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Sistem Informasi Kartu Pelajar & Presensi Digital</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Portal Presensi & Identitas Resmi Siswa
              </h1>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                Aplikasi terintegrasi untuk absensi barcode NISN, pencetakan kartu pelajar standar resmi CR-80 ISO 7810, dan sinkronisasi data cloud real-time SMA Negeri 1 Julok.
              </p>
            </div>

            {/* 4 Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2.5">
                  <QrCode className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white mb-1">Presensi Barcode & QR Code</h2>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Scan nomor NISN pada kartu depan untuk absensi kehadiran dan ujian tanpa antre.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
                  <Database className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white mb-1">Sinkronisasi Cloud Real-Time</h2>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Data otomatis tersimpan di Google Cloud Firestore, terhubung langsung antar perangkat.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-2.5">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white mb-1">Cetak Kartu Standar CR-80</h2>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Format resmi kedinasan siap cetak PVC 300 - 600 DPI dan format lembaran kertas A4.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 transition-all">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2.5">
                  <Users className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-white mb-1">Manajemen Rombel & Siswa</h2>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Impor massal dari Dapodik Excel, pembacaan foto otomatis via ZIP, dan kelola kelas.
                </p>
              </div>
            </div>

            {/* Quick Live Stats if available */}
            {(totalStudents > 0 || totalClasses > 0) && (
              <div className="flex items-center gap-4 pt-1 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Database Aktif: <strong className="text-white">{totalStudents} Siswa</strong>
                </span>
                <span>•</span>
                <span className="font-medium">
                  Terdaftar: <strong className="text-white">{totalClasses} Rombel</strong>
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Google Sign-In Card Box */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-slate-900/90 border border-white/15 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              {/* Card Header */}
              <div className="text-center pb-5 border-b border-white/10">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/30 flex items-center justify-center">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <Lock className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white">
                  Masuk ke Aplikasi
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Gunakan Akun Google untuk mengakses dashboard presensi dan pembuatan kartu pelajar
                </p>
              </div>

              {/* Error Alert if any */}
              {authError && (
                <div className="my-4 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block font-bold text-red-300">Gagal Masuk ({authError.code})</strong>
                      <p className="text-[11px] mt-0.5 opacity-90">{authError.message}</p>
                      <button
                        type="button"
                        onClick={onClearAuthError}
                        className="mt-1.5 text-[10px] font-bold underline hover:text-white cursor-pointer"
                      >
                        Tutup peringatan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Google Sign-In Button */}
              <div className="py-5 space-y-3">
                <button
                  type="button"
                  onClick={() => onLogin(false)}
                  disabled={isLoggingIn}
                  className="w-full relative group flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-900 rounded-2xl font-bold text-sm shadow-xl shadow-white/10 hover:shadow-white/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border border-slate-200"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                      <span>Menghubungkan Akun Google...</span>
                    </>
                  ) : (
                    <>
                      {/* Official Google Multicolored "G" SVG */}
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Lanjutkan dengan Akun Google</span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform ml-auto" />
                    </>
                  )}
                </button>

                {/* Alternative Redirect Mode if Popup blocked */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                  <span>Jendela popup terblokir?</span>
                  <button
                    type="button"
                    onClick={() => onLogin(true)}
                    disabled={isLoggingIn}
                    className="text-blue-400 hover:text-blue-300 font-semibold underline cursor-pointer"
                  >
                    Gunakan Mode Redirect
                  </button>
                </div>
              </div>

              {/* Quick Verification Lookup (Without Login) */}
              <div className="mt-2 pt-4 border-t border-white/10">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Verifikasi Keaslian Kartu Siswa:
                </span>
                <form onSubmit={handleQuickVerifySubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Masukkan No. NISN Siswa..."
                      value={quickNisn}
                      onChange={(e) => setQuickNisn(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!quickNisn.trim()}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex-shrink-0"
                  >
                    Cek
                  </button>
                </form>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Dapat digunakan oleh wali murid dan penguji untuk memverifikasi keabsahan kartu pelajar.
                </p>
              </div>

              {/* Optional Guest / Demo Exploration */}
              {onContinueAsGuest && (
                <div className="mt-4 pt-3 border-t border-white/10 text-center">
                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
                  >
                    Pratinjau Aplikasi sebagai Tamu (Mode Offline)
                  </button>
                </div>
              )}

              {/* Security info note */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Login Resmi Terenkripsi Google OAuth 2.0</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 backdrop-blur-md py-4 px-4 sm:px-8 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} <strong>SMA Negeri 1 Julok</strong> • Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur 24458
          </span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>Website: sman1julok.sch.id</span>
            <span>•</span>
            <span>Email: info@sman1julok.sch.id</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
