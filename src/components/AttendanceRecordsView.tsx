import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  UserCheck,
  UserX,
  History,
  Eye,
  RefreshCw,
  Plus,
  Sparkles,
  ChevronRight,
  School,
  IdCard,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, AttendanceRecord, AttendanceStatus, ClassInfo } from '../types';
import {
  formatIndonesianDate,
  getTodayDateString,
  determineAttendanceStatus,
} from '../utils/attendanceHelper';

interface AttendanceRecordsViewProps {
  students: Student[];
  classes: ClassInfo[];
  allRecords: AttendanceRecord[];
  onUpdateRecordStatus: (
    recordId: string,
    newStatus: AttendanceStatus,
    student: Student,
    dateStr: string,
    keterangan?: string
  ) => void;
  onOpenImportModal: () => void;
  onMarkAllUnmarkedAsAlpa: (dateStr: string, classFilter: string) => void;
  onOpenCardStudioForStudent?: (studentId: string) => void;
}

export const AttendanceRecordsView: React.FC<AttendanceRecordsViewProps> = ({
  students,
  classes,
  allRecords,
  onUpdateRecordStatus,
  onOpenImportModal,
  onMarkAllUnmarkedAsAlpa,
  onOpenCardStudioForStudent,
}) => {
  // Sub-tabs: 'daily' (Absensi Harian) vs 'history' (Riwayat Siswa Detail)
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'history'>('daily');

  // Filters for Daily Tab
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected student for detail history inspection
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(
    students[0] || null
  );

  // Filter students based on class selection
  const classStudents = useMemo(() => {
    return students.filter((s) => {
      if (selectedClass !== 'all' && (s.kelas || '').trim() !== selectedClass) return false;
      return true;
    });
  }, [students, selectedClass]);

  // Map of daily attendance for the selected date
  const recordsForDate = useMemo(() => {
    return allRecords.filter((r) => r.date === selectedDate);
  }, [allRecords, selectedDate]);

  // Combined daily roster: includes students who have checked in, plus students who have not yet checked in
  const combinedDailyRoster = useMemo(() => {
    return classStudents.map((std) => {
      const record = recordsForDate.find((r) => r.studentId === std.id || r.nisn === std.nisn);
      return {
        student: std,
        record: record || null,
        status: (record ? record.status : 'alpa') as AttendanceStatus | 'belum_hadir',
        timeString: record ? record.timeString : '-',
        method: record ? record.method : undefined,
      };
    });
  }, [classStudents, recordsForDate]);

  // Filtered roster by search and status
  const filteredDailyRoster = useMemo(() => {
    return combinedDailyRoster.filter((item) => {
      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'belum_hadir') {
          if (item.record !== null) return false;
        } else if (item.record?.status !== selectedStatus) {
          return false;
        }
      }

      // Search query filter (nama / nisn / nis / kelas)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.student.nama.toLowerCase().includes(q);
        const matchNisn = item.student.nisn.toLowerCase().includes(q);
        const matchNis = (item.student.nis || '').toLowerCase().includes(q);
        const matchKelas = item.student.kelas.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchNis && !matchKelas) return false;
      }

      return true;
    });
  }, [combinedDailyRoster, selectedStatus, searchQuery]);

  // Daily statistics
  const dailyHadir = recordsForDate.filter((r) => r.status === 'hadir').length;
  const dailyTerlambat = recordsForDate.filter((r) => r.status === 'terlambat').length;
  const dailyIzin = recordsForDate.filter((r) => r.status === 'izin').length;
  const dailySakit = recordsForDate.filter((r) => r.status === 'sakit').length;
  const dailyAlpa = recordsForDate.filter((r) => r.status === 'alpa').length;
  const dailyTotalAttended = dailyHadir + dailyTerlambat + dailyIzin + dailySakit;

  // Export Daily Attendance to Excel
  const handleExportDailyExcel = () => {
    const dataToExport = filteredDailyRoster.map((item, idx) => ({
      No: idx + 1,
      'Tanggal Absensi': selectedDate,
      NISN: item.student.nisn,
      NIS: item.student.nis || '-',
      'Nama Lengkap Siswa': item.student.nama,
      'Kelas / Rombel': item.student.kelas,
      Jurusan: item.student.jurusan || 'Umum',
      'Waktu Presensi': item.timeString,
      'Status Kehadiran':
        item.record?.status === 'hadir'
          ? 'Hadir Tepat Waktu'
          : item.record?.status === 'terlambat'
          ? 'Terlambat'
          : item.record?.status === 'izin'
          ? 'Izin'
          : item.record?.status === 'sakit'
          ? 'Sakit'
          : item.record?.status === 'alpa'
          ? 'Alpa'
          : 'Belum Hadir',
      'Metode Absen':
        item.record?.method === 'barcode_scan'
          ? 'Scan Barcode'
          : item.record?.method === 'qr_scan'
          ? 'Scan QR'
          : item.record?.method === 'manual_entry'
          ? 'Input Manual'
          : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Absensi Harian');

    const fileName = `Rekap_Absensi_SMAN1_Julok_${selectedDate}_${
      selectedClass === 'all' ? 'Semua_Kelas' : selectedClass
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Student specific history calculations
  const studentHistoryRecords = useMemo(() => {
    if (!selectedStudentForHistory) return [];
    return allRecords
      .filter(
        (r) =>
          r.studentId === selectedStudentForHistory.id ||
          r.nisn === selectedStudentForHistory.nisn
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allRecords, selectedStudentForHistory]);

  const historyHadir = studentHistoryRecords.filter((r) => r.status === 'hadir').length;
  const historyTerlambat = studentHistoryRecords.filter((r) => r.status === 'terlambat').length;
  const historyIzin = studentHistoryRecords.filter((r) => r.status === 'izin').length;
  const historySakit = studentHistoryRecords.filter((r) => r.status === 'sakit').length;
  const historyAlpa = studentHistoryRecords.filter((r) => r.status === 'alpa').length;
  const historyTotalRecorded = studentHistoryRecords.length;
  const historyAttendanceRate =
    historyTotalRecorded > 0
      ? Math.round(((historyHadir + historyTerlambat) / historyTotalRecorded) * 100)
      : 100;

  // Export Individual Student History to Excel
  const handleExportIndividualExcel = () => {
    if (!selectedStudentForHistory) return;

    const dataToExport = studentHistoryRecords.map((r, idx) => ({
      No: idx + 1,
      Tanggal: r.date,
      Waktu: r.timeString,
      'Nama Siswa': selectedStudentForHistory.nama,
      NISN: selectedStudentForHistory.nisn,
      Kelas: selectedStudentForHistory.kelas,
      Status: r.status.toUpperCase(),
      Keterangan: r.keterangan || '-',
      Metode: r.method || 'Scan Barcode',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Kehadiran');

    const fileName = `Riwayat_Absen_${selectedStudentForHistory.nama.replace(/\s+/g, '_')}_${
      selectedStudentForHistory.nisn
    }.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Top Header Toolbar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Data Siswa & Rekap Kehadiran
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kelola daftar absensi harian, riwayat kehadiran detail siswa, dan impor data siswa Excel.
          </p>
        </div>

        {/* Action Buttons: Import Excel & Toggle Sub-tab */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenImportModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Impor Data Siswa (Excel)</span>
          </button>

          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('daily')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'daily'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Absensi Harian
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('history')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'history'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riwayat Detail Siswa
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: DAFTAR ABSENSI HARIAN */}
      {activeSubTab === 'daily' && (
        <div className="space-y-5">
          {/* Filter Bar: Date, Class, Status & Search */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Date Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Pilih Tanggal Absensi:
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Filter Kelas / Rombel:
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Kelas ({students.length} Siswa)</option>
                  {classes.map((c) => {
                    const count = students.filter((s) => (s.kelas || '').trim() === c.nama).length;
                    return (
                      <option key={c.id} value={c.nama}>
                        {c.nama} ({count} Siswa)
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Filter Status Kehadiran:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="hadir">Hadir Tepat Waktu</option>
                  <option value="terlambat">Terlambat</option>
                  <option value="izin">Izin</option>
                  <option value="sakit">Sakit</option>
                  <option value="alpa">Alpa</option>
                  <option value="belum_hadir">Belum Hadir / Belum Scan</option>
                </select>
              </div>

              {/* Search Box */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Cari Siswa / NISN:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nama / NISN / NIS..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions Strip */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  Tanggal: <strong>{formatIndonesianDate(selectedDate)}</strong>
                </span>
                <span>•</span>
                <span>
                  Total Ditampilkan: <strong>{filteredDailyRoster.length} Siswa</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onMarkAllUnmarkedAsAlpa(selectedDate, selectedClass)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  title="Tandai semua siswa yang belum scan pada tanggal ini sebagai Alpa"
                >
                  Tandai Belum Hadir sbg Alpa
                </button>

                <button
                  type="button"
                  onClick={handleExportDailyExcel}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Unduh Rekap Excel</span>
                </button>
              </div>
            </div>
          </div>

          {/* Daily Table List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Siswa</th>
                    <th className="py-3 px-4">Kelas & Jurusan</th>
                    <th className="py-3 px-4">NISN / NIS</th>
                    <th className="py-3 px-4 text-center">Waktu Presensi</th>
                    <th className="py-3 px-4 text-center">Status Kehadiran</th>
                    <th className="py-3 px-4 text-right">Ubah Status (Guru)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDailyRoster.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 space-y-1">
                        <Users className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                        <p className="font-semibold text-xs">Tidak ada data siswa yang cocok.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDailyRoster.map((item, idx) => {
                      const std = item.student;
                      const rec = item.record;

                      return (
                        <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                            {idx + 1}
                          </td>

                          {/* Student Info */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {std.foto ? (
                                  <img
                                    src={std.foto}
                                    alt={std.nama}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 font-mono">
                                    {std.nama.substring(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedStudentForHistory(std);
                                    setActiveSubTab('history');
                                  }}
                                  className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block text-left cursor-pointer"
                                  title="Lihat riwayat kehadiran detail siswa ini"
                                >
                                  {std.nama}
                                </button>
                                <span className="text-[10px] text-slate-400">
                                  {std.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Class */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 font-mono">
                              {std.kelas}
                            </span>
                            <span className="block text-[10px] text-slate-400 truncate mt-0.5">
                              {std.jurusan || 'Fase E (Umum)'}
                            </span>
                          </td>

                          {/* NISN */}
                          <td className="py-3.5 px-4 font-mono">
                            <span className="text-slate-800 font-bold block">{std.nisn}</span>
                            <span className="text-slate-400 text-[10px]">NIS: {std.nis || '-'}</span>
                          </td>

                          {/* Waktu */}
                          <td className="py-3.5 px-4 text-center font-mono text-slate-600 text-[11px]">
                            {item.timeString}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {rec?.status === 'hadir' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Hadir Tepat</span>
                              </span>
                            )}
                            {rec?.status === 'terlambat' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>Terlambat</span>
                              </span>
                            )}
                            {rec?.status === 'izin' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                                <Sparkles className="w-3 h-3 text-blue-600" />
                                <span>Izin</span>
                              </span>
                            )}
                            {rec?.status === 'sakit' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
                                <AlertCircle className="w-3 h-3 text-purple-600" />
                                <span>Sakit</span>
                              </span>
                            )}
                            {rec?.status === 'alpa' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                                <UserX className="w-3 h-3 text-rose-600" />
                                <span>Alpa</span>
                              </span>
                            )}
                            {!rec && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                <span>Belum Hadir</span>
                              </span>
                            )}
                          </td>

                          {/* Actions: Change Status */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <select
                                value={rec?.status || 'belum_hadir'}
                                onChange={(e) => {
                                  const val = e.target.value as AttendanceStatus;
                                  if (val !== 'alpa' && val !== 'hadir' && val !== 'terlambat' && val !== 'izin' && val !== 'sakit') return;
                                  onUpdateRecordStatus(rec?.id || `att-${selectedDate}-${std.id}`, val, std, selectedDate);
                                }}
                                className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="belum_hadir" disabled>
                                  Pilih Status
                                </option>
                                <option value="hadir">Set Hadir</option>
                                <option value="terlambat">Set Terlambat</option>
                                <option value="izin">Set Izin</option>
                                <option value="sakit">Set Sakit</option>
                                <option value="alpa">Set Alpa</option>
                              </select>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudentForHistory(std);
                                  setActiveSubTab('history');
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Lihat Riwayat Lengkap"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RIWAYAT DETAIL SISWA */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          {/* Student Selector Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Pilih Siswa untuk Melihat Riwayat Kehadiran Lengkap:
              </label>
              <select
                value={selectedStudentForHistory?.id || ''}
                onChange={(e) => {
                  const found = students.find((s) => s.id === e.target.value);
                  if (found) setSelectedStudentForHistory(found);
                }}
                className="w-full md:max-w-md px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nama} ({s.kelas} • NISN: {s.nisn})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportIndividualExcel}
                disabled={!selectedStudentForHistory || studentHistoryRecords.length === 0}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Unduh Riwayat Siswa (Excel)</span>
              </button>

              {selectedStudentForHistory && onOpenCardStudioForStudent && (
                <button
                  type="button"
                  onClick={() => onOpenCardStudioForStudent(selectedStudentForHistory.id)}
                  className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-2xl flex items-center gap-2 transition-all cursor-pointer"
                >
                  <IdCard className="w-4 h-4 text-blue-600" />
                  <span>Lihat Kartu Pelajar</span>
                </button>
              )}
            </div>
          </div>

          {selectedStudentForHistory ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Student Profile & Stats */}
              <div className="lg:col-span-4 space-y-4">
                {/* Profile Card */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 text-center space-y-4">
                  <div className="w-28 h-36 mx-auto rounded-2xl bg-slate-100 border-2 border-slate-200 overflow-hidden shadow-md flex items-center justify-center">
                    {selectedStudentForHistory.foto ? (
                      <img
                        src={selectedStudentForHistory.foto}
                        alt={selectedStudentForHistory.nama}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-black text-slate-400 font-mono">
                        {selectedStudentForHistory.nama.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {selectedStudentForHistory.nama}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      NISN: {selectedStudentForHistory.nisn} • NIS: {selectedStudentForHistory.nis || '-'}
                    </p>
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-bold font-mono">
                      Kelas: {selectedStudentForHistory.kelas}
                    </span>
                  </div>

                  <div className="border-t border-slate-100 pt-3 text-left text-xs space-y-1.5 text-slate-600">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Jurusan / Fase:</span>
                      <strong>{selectedStudentForHistory.jurusan || 'Fase E (Umum)'}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">TTL:</span>
                      <span>
                        {selectedStudentForHistory.tempatLahir}, {selectedStudentForHistory.tanggalLahir}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Alamat Siswa:</span>
                      <span className="text-[11px] leading-snug">{selectedStudentForHistory.alamat}</span>
                    </div>
                  </div>
                </div>

                {/* Individual Stats Box */}
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Persentase Kehadiran</span>
                    <span className="text-sm font-black text-blue-600 font-mono">
                      {historyAttendanceRate}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-emerald-800 font-bold uppercase block">
                        Hadir
                      </span>
                      <span className="text-lg font-black text-emerald-700 font-mono">
                        {historyHadir}
                      </span>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-amber-800 font-bold uppercase block">
                        Terlambat
                      </span>
                      <span className="text-lg font-black text-amber-700 font-mono">
                        {historyTerlambat}
                      </span>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-blue-800 font-bold uppercase block">
                        Izin / Sakit
                      </span>
                      <span className="text-lg font-black text-blue-700 font-mono">
                        {historyIzin + historySakit}
                      </span>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] text-rose-800 font-bold uppercase block">
                        Alpa
                      </span>
                      <span className="text-lg font-black text-rose-700 font-mono">
                        {historyAlpa}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Attendance History Log */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600" />
                    <h4 className="text-sm font-extrabold text-slate-800">
                      Riwayat Rekap Kehadiran Siswa ({studentHistoryRecords.length} Hari)
                    </h4>
                  </div>
                </div>

                {studentHistoryRecords.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <Clock className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                    <p className="text-xs font-semibold">
                      Belum ada riwayat kehadiran tercatat untuk siswa ini.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Gunakan fitur pemindai barcode untuk mencatat absensi siswa.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-3 px-4">Tanggal</th>
                          <th className="py-3 px-4">Jam Absen</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4">Metode</th>
                          <th className="py-3 px-4">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {studentHistoryRecords.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {formatIndonesianDate(r.date)}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {r.timeString}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {r.status === 'hadir' && (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                  Hadir
                                </span>
                              )}
                              {r.status === 'terlambat' && (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                                  Terlambat
                                </span>
                              )}
                              {r.status === 'izin' && (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
                                  Izin
                                </span>
                              )}
                              {r.status === 'sakit' && (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800">
                                  Sakit
                                </span>
                              )}
                              {r.status === 'alpa' && (
                                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                                  Alpa
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {r.method === 'barcode_scan'
                                ? 'Scan Barcode'
                                : r.method === 'qr_scan'
                                ? 'Scan QR'
                                : 'Input Guru'}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {r.keterangan || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              Pilih siswa terlebih dahulu untuk melihat riwayat kehadiran.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
