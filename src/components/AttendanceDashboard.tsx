import React, { useState, useEffect } from 'react';
import {
  Clock,
  Scan,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  School,
  FileSpreadsheet,
  IdCard,
  Search,
  Calendar,
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserX,
  History,
} from 'lucide-react';
import { Student, AttendanceRecord, ClassInfo } from '../types';
import {
  formatIndonesianDate,
  formatIndonesianTime,
  getTodayDateString,
  ATTENDANCE_CUTOFF_HOUR,
  ATTENDANCE_CUTOFF_MINUTE,
} from '../utils/attendanceHelper';
import { SMAN1_JULOK_LOGO_PATH, ACEH_GOV_LOGO_PATH } from '../data/defaults';

interface AttendanceDashboardProps {
  students: Student[];
  classes: ClassInfo[];
  todayRecords: AttendanceRecord[];
  onOpenScanner: () => void;
  onNavigateToRecords: () => void;
  onNavigateToStudio: () => void;
  onOpenImportModal: () => void;
  onQuickManualScan: (nisn: string) => void;
  isSyncing?: boolean;
}

export const AttendanceDashboard: React.FC<AttendanceDashboardProps> = ({
  students,
  classes,
  todayRecords,
  onOpenScanner,
  onNavigateToRecords,
  onNavigateToStudio,
  onOpenImportModal,
  onQuickManualScan,
  isSyncing = false,
}) => {
  // Live accurate digital clock state (ticks every second)
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [quickNisnInput, setQuickNisnInput] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayDateStr = getTodayDateString(currentTime);

  // Statistics for Today
  const totalStudents = students.length;
  const hadirCount = todayRecords.filter((r) => r.status === 'hadir').length;
  const terlambatCount = todayRecords.filter((r) => r.status === 'terlambat').length;
  const izinCount = todayRecords.filter((r) => r.status === 'izin').length;
  const sakitCount = todayRecords.filter((r) => r.status === 'sakit').length;
  const totalAttended = hadirCount + terlambatCount + izinCount + sakitCount;
  const belumHadirCount = Math.max(0, totalStudents - totalAttended);
  const attendancePercentage = totalStudents > 0 ? Math.round((totalAttended / totalStudents) * 100) : 0;

  // Real-time check if current moment is before or after cutoff
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const cutoffMinutes = ATTENDANCE_CUTOFF_HOUR * 60 + ATTENDANCE_CUTOFF_MINUTE;
  const isCurrentlyOnTime = currentMinutes <= cutoffMinutes;

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickNisnInput.trim()) {
      onQuickManualScan(quickNisnInput.trim());
      setQuickNisnInput('');
    }
  };

  // Recent 6 attendance entries (sorted latest first)
  const recentRecords = [...todayRecords]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in font-sans">
      {/* Top Banner / School Profile Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 border border-white/10 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Sistem Absensi Barcode Siswa Terintegrasi</span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Presensi Digital Siswa
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                SMA NEGERI 1 JULOK • Pemindaian otomatis nomor NISN kartu pelajar siswa dengan basis data sekolah.
              </p>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenImportModal}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Impor Excel Data Siswa</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToRecords}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm"
            >
              <History className="w-4 h-4 text-blue-400" />
              <span>Riwayat Absensi Lengkap</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToStudio}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm"
            >
              <IdCard className="w-4 h-4 text-purple-400" />
              <span>Studio Kartu Pelajar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Hero: Jam Digital Akurat & Tombol Mulai Scan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Box: Jam Digital Akurat Real-Time */}
        <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Waktu Resmi Sekolah (WIB)</span>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isCurrentlyOnTime
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCurrentlyOnTime ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {isCurrentlyOnTime ? 'Status Scan: Tepat Waktu' : 'Status Scan: Terlambat'}
              </span>
            </div>

            {/* Giant Digital Clock */}
            <div className="py-2 text-center sm:text-left">
              <div className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 font-mono tracking-tight leading-none drop-shadow-xs">
                {String(currentTime.getHours()).padStart(2, '0')}
                <span className="text-blue-600 animate-pulse">:</span>
                {String(currentTime.getMinutes()).padStart(2, '0')}
                <span className="text-blue-600 animate-pulse">:</span>
                <span className="text-3xl sm:text-5xl font-extrabold text-blue-700">
                  {String(currentTime.getSeconds()).padStart(2, '0')}
                </span>
                <span className="text-base sm:text-xl font-bold text-slate-400 ml-2 font-sans">
                  WIB
                </span>
              </div>

              {/* Full Indonesian Date */}
              <div className="mt-3 flex items-center justify-center sm:justify-start gap-2 text-slate-600 text-sm sm:text-base font-semibold">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{formatIndonesianDate(currentTime)}</span>
              </div>
            </div>
          </div>

          {/* School Session Rule Notice */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Batas Kedatangan:</span>
              <span className="bg-slate-100 px-2.5 py-1 rounded-lg font-mono font-bold text-slate-800">
                07:15 WIB
              </span>
            </div>
            <span>Scan setelah 07:15 otomatis bertanda Terlambat</span>
          </div>
        </div>

        {/* Right Box: Tombol Besar Mulai Scan Barcode & Quick Input */}
        <div className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 sm:p-8 shadow-xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

          <div className="space-y-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-md">
              <Scan className="w-6 h-6 animate-pulse" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Mulai Pemindaian Barcode
              </h2>
              <p className="text-xs text-blue-100 mt-1 leading-relaxed">
                Nyalakan kamera untuk memindai kartu pelajar siswa secara otomatis dan mencatat absensi.
              </p>
            </div>

            {/* Giant Call to Action Scan Button */}
            <button
              type="button"
              onClick={onOpenScanner}
              className="w-full py-4 px-6 bg-white hover:bg-blue-50 active:scale-[0.98] text-blue-900 rounded-2xl font-black text-sm sm:text-base shadow-xl shadow-black/15 transition-all cursor-pointer flex items-center justify-center gap-3"
            >
              <Scan className="w-5 h-5 text-blue-600" />
              <span>BUKA PEMINDAI BARCODE</span>
              <ArrowRight className="w-5 h-5 text-blue-600" />
            </button>
          </div>

          {/* Quick Manual / USB Scanner Input on Dashboard */}
          <div className="mt-5 pt-4 border-t border-white/20 relative z-10 space-y-2">
            <span className="text-[11px] font-bold text-blue-100 uppercase tracking-wider block">
              Atau Input Cepat NISN (Scanner USB):
            </span>
            <form onSubmit={handleQuickSubmit} className="flex gap-2">
              <input
                type="text"
                value={quickNisnInput}
                onChange={(e) => setQuickNisnInput(e.target.value)}
                placeholder="Ketik NISN lalu tekan Enter..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/20 border border-white/20 text-xs text-white placeholder-blue-200/70 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit"
                disabled={!quickNisnInput.trim()}
                className="px-4 py-2.5 bg-slate-900/80 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Scan
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {/* Total Registered Students */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Siswa
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {totalStudents}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Terdaftar di Dapodik</p>
          </div>
        </div>

        {/* Hadir Tepat Waktu */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Hadir Tepat
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
              {hadirCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Sebelum 07:15 WIB</p>
          </div>
        </div>

        {/* Terlambat */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Terlambat
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono">
              {terlambatCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Lewat jam masuk</p>
          </div>
        </div>

        {/* Izin & Sakit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Izin / Sakit
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">
              {izinCount + sakitCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {izinCount} Izin • {sakitCount} Sakit
            </p>
          </div>
        </div>

        {/* Belum Hadir / Belum Scan */}
        <div className="col-span-2 sm:col-span-1 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Belum Hadir
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono">
              {belumHadirCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Kehadiran: {attendancePercentage}%
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar of Attendance Today */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-2 text-slate-700">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Persentase Kehadiran Hari Ini</span>
          </div>
          <span className="text-blue-700 font-mono text-sm">{attendancePercentage}% Tercapai</span>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
          <div
            style={{ width: `${totalStudents ? (hadirCount / totalStudents) * 100 : 0}%` }}
            className="bg-emerald-500 transition-all duration-500"
            title={`Hadir: ${hadirCount}`}
          />
          <div
            style={{ width: `${totalStudents ? (terlambatCount / totalStudents) * 100 : 0}%` }}
            className="bg-amber-500 transition-all duration-500"
            title={`Terlambat: ${terlambatCount}`}
          />
          <div
            style={{ width: `${totalStudents ? ((izinCount + sakitCount) / totalStudents) * 100 : 0}%` }}
            className="bg-blue-500 transition-all duration-500"
            title={`Izin/Sakit: ${izinCount + sakitCount}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Hadir Tepat Waktu ({hadirCount})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Terlambat ({terlambatCount})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Izin & Sakit ({izinCount + sakitCount})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /> Belum Hadir ({belumHadirCount})
          </span>
        </div>
      </div>

      {/* Recent Activity: Live Attendance Feed */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-extrabold text-slate-800">
              Aktivitas Absensi Terbaru (Hari Ini)
            </h3>
          </div>

          <button
            type="button"
            onClick={onNavigateToRecords}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua ({todayRecords.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentRecords.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Clock className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
            <p className="text-xs font-medium">Belum ada absensi yang dipindai hari ini.</p>
            <p className="text-[11px] text-slate-400">
              Klik tombol &ldquo;Mulai Pemindaian Barcode&rdquo; untuk memulai absensi siswa.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentRecords.map((rec) => {
              const matchedStudent = students.find((s) => s.id === rec.studentId);
              const photo = rec.foto || matchedStudent?.foto;

              return (
                <div
                  key={rec.id}
                  className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {photo ? (
                        <img src={photo} alt={rec.nama} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-slate-400 font-mono">
                          {rec.nama.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                          {rec.nama}
                        </h4>
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 font-mono">
                          {rec.kelas}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        NISN: {rec.nisn} {rec.nis ? `• NIS: ${rec.nis}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          rec.status === 'hadir'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'terlambat'
                            ? 'bg-amber-100 text-amber-800'
                            : rec.status === 'sakit'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rec.status === 'hadir' ? 'Hadir Tepat' : rec.status}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                        {rec.timeString}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
