import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  User,
  AlertTriangle,
  X,
  Volume2,
  ArrowRight,
  Sparkles,
  School,
  IdCard,
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceStatus } from '../types';

interface AttendanceNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  student: Student | null;
  onUpdateStatus?: (newStatus: AttendanceStatus, note?: string) => void;
  autoCloseDelayMs?: number; // default 4000
}

export const AttendanceNotificationModal: React.FC<AttendanceNotificationModalProps> = ({
  isOpen,
  onClose,
  record,
  student,
  onUpdateStatus,
  autoCloseDelayMs = 4500,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(autoCloseDelayMs / 1000);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !record) return;

    setTimeLeft(Math.round(autoCloseDelayMs / 1000));
    setIsPaused(false);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (isPaused) return prev;
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, record, isPaused, autoCloseDelayMs, onClose]);

  if (!isOpen || !record || !student) return null;

  const isLate = record.status === 'terlambat';
  const isPresent = record.status === 'hadir';
  const isPermit = record.status === 'izin';
  const isSick = record.status === 'sakit';

  const statusBadge = () => {
    if (isPresent) {
      return {
        bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
        badge: 'bg-emerald-500 text-white',
        title: 'HADIR TEPAT WAKTU',
        desc: 'Presensi berhasil dicatat dalam basis data.',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
      };
    }
    if (isLate) {
      return {
        bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
        badge: 'bg-amber-500 text-white',
        title: 'TERLAMBAT',
        desc: 'Presensi melewati batas waktu kedatangan (07:15 WIB).',
        icon: <Clock className="w-5 h-5 text-amber-400" />,
      };
    }
    if (isSick) {
      return {
        bg: 'bg-purple-500/15 border-purple-500/30 text-purple-400',
        badge: 'bg-purple-500 text-white',
        title: 'SAKIT',
        desc: 'Kehadiran ditandai sebagai Sakit.',
        icon: <AlertTriangle className="w-5 h-5 text-purple-400" />,
      };
    }
    return {
      bg: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
      badge: 'bg-blue-500 text-white',
      title: 'IZIN',
      desc: 'Kehadiran ditandai sebagai Izin.',
      icon: <Sparkles className="w-5 h-5 text-blue-400" />,
    };
  };

  const badgeInfo = statusBadge();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 animate-scale-up">
        {/* Animated Top Header Strip */}
        <div
          className={`h-2.5 w-full ${
            isPresent
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
              : isLate
              ? 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600'
              : 'bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-600'
          }`}
        />

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          title="Tutup Notifikasi"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7 space-y-6">
          {/* Header Status Tag */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                {badgeInfo.icon}
              </div>
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase ${badgeInfo.badge}`}
                >
                  {badgeInfo.title}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">{badgeInfo.desc}</p>
              </div>
            </div>

            {/* Live Clock of Recorded Time */}
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Waktu Presensi</span>
              <span className="text-base font-extrabold text-white font-mono">
                {record.timeString}
              </span>
            </div>
          </div>

          {/* Student Profile & Photo Card Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-center gap-5">
            {/* Student Photo */}
            <div className="relative w-24 h-32 sm:w-28 sm:h-36 rounded-2xl overflow-hidden bg-slate-800 border-2 border-white/20 shadow-lg flex-shrink-0 flex items-center justify-center">
              {student.foto ? (
                <img
                  src={student.foto}
                  alt={student.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                  <User className="w-10 h-10 mb-1 opacity-60" />
                  <span className="text-[10px]">Tanpa Foto</span>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 py-0.5 text-center text-[9px] font-bold text-white font-mono uppercase tracking-wider">
                {student.kelas}
              </div>
            </div>

            {/* Student Info Details */}
            <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
              <div>
                <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">
                  Siswa Terdaftar di Database Sekolah
                </span>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight truncate">
                  {student.nama}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-medium">No. NISN:</span>
                  <span className="font-mono font-bold text-slate-200 truncate block">
                    {student.nisn}
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-medium">No. NIS:</span>
                  <span className="font-mono font-bold text-slate-200 truncate block">
                    {student.nis || '-'}
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-medium">Kelas / Rombel:</span>
                  <span className="font-bold text-slate-200 truncate block">
                    {student.kelas}
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <span className="text-[10px] text-slate-400 block font-medium">Jurusan / Fase:</span>
                  <span className="font-bold text-slate-200 truncate block">
                    {student.jurusan || 'Fase E (Umum)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Status Adjustment for Teachers */}
          {onUpdateStatus && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Koreksi / Ganti Status Kehadiran (Guru/Piket):
              </span>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateStatus('hadir')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    record.status === 'hadir'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  Hadir
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus('terlambat')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    record.status === 'terlambat'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  Terlambat
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus('izin')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    record.status === 'izin'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  Izin
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStatus('sakit')}
                  className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    record.status === 'sakit'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  Sakit
                </button>
              </div>
            </div>
          )}

          {/* Footer Action & Auto-close Bar */}
          <div className="pt-2 flex items-center justify-between gap-4 border-t border-white/10">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Tersimpan otomatis • Menutup dalam {timeLeft}d
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer ml-auto"
            >
              <span>Scan Siswa Berikutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
