import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Users,
  Palette,
  Printer,
  FolderArchive,
  Edit,
  Trash2,
  ArrowRightLeft,
  School,
  Building,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
  CheckSquare,
  Square,
  Sparkles,
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { ClassInfo, Student } from '../types';

interface ClassManagementProps {
  classes: ClassInfo[];
  students: Student[];
  onAddClass: (classInfo: ClassInfo) => void;
  onUpdateClass: (classInfo: ClassInfo, oldName?: string) => void;
  onDeleteClass: (classId: string) => void;
  onBulkMoveStudents: (fromClass: string, toClass: string, studentIds?: string[]) => void;
  onNavigateToStudents: (className: string) => void;
  onNavigateToStudio: (className: string) => void;
  onNavigateToBatchPrint: (className: string) => void;
  onTriggerMassDownloadZip: (className: string) => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
  classes,
  students,
  onAddClass,
  onUpdateClass,
  onDeleteClass,
  onBulkMoveStudents,
  onNavigateToStudents,
  onNavigateToStudio,
  onNavigateToBatchPrint,
  onTriggerMassDownloadZip,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<'all' | 'X' | 'XI' | 'XII' | 'Lainnya'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal Add / Edit Class State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [isNewClass, setIsNewClass] = useState(false);
  const [originalClassName, setOriginalClassName] = useState('');
  const [formError, setFormError] = useState('');
  const [syncStudentsOnRename, setSyncStudentsOnRename] = useState(true);

  // Modal Delete Confirmation State
  const [classToDelete, setClassToDelete] = useState<ClassInfo | null>(null);

  // Modal Mass Move (Mutasi Siswa) State
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveFromClass, setMoveFromClass] = useState('');
  const [moveToClass, setMoveToClass] = useState('');
  const [selectedStudentIdsToMove, setSelectedStudentIdsToMove] = useState<string[]>([]);
  const [moveSuccessMsg, setMoveSuccessMsg] = useState('');

  // Calculate live statistics for each class
  const classStats = useMemo(() => {
    const stats: Record<
      string,
      {
        total: number;
        male: number;
        female: number;
        withPhoto: number;
        withoutPhoto: number;
      }
    > = {};

    classes.forEach((c) => {
      stats[c.nama] = {
        total: 0,
        male: 0,
        female: 0,
        withPhoto: 0,
        withoutPhoto: 0,
      };
    });

    students.forEach((s) => {
      const clsName = (s.kelas || '').trim();
      if (!stats[clsName]) {
        stats[clsName] = {
          total: 0,
          male: 0,
          female: 0,
          withPhoto: 0,
          withoutPhoto: 0,
        };
      }
      stats[clsName].total++;
      if (s.jenisKelamin === 'L') stats[clsName].male++;
      else stats[clsName].female++;

      if (s.foto) stats[clsName].withPhoto++;
      else stats[clsName].withoutPhoto++;
    });

    return stats;
  }, [classes, students]);

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.waliKelas && c.waliKelas.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.jurusan && c.jurusan.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.ruangan && c.ruangan.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGrade = gradeFilter === 'all' || c.tingkat === gradeFilter;

      return matchesSearch && matchesGrade;
    });
  }, [classes, searchQuery, gradeFilter]);

  // KPI calculations
  const totalStudentsInClasses = useMemo(() => {
    return students.filter((s) => classes.some((c) => c.nama === (s.kelas || '').trim())).length;
  }, [students, classes]);

  const gradeCounts = useMemo(() => {
    return {
      X: classes.filter((c) => c.tingkat === 'X').length,
      XI: classes.filter((c) => c.tingkat === 'XI').length,
      XII: classes.filter((c) => c.tingkat === 'XII').length,
    };
  }, [classes]);

  // Handlers for Add / Edit
  const handleOpenAdd = () => {
    setIsNewClass(true);
    setOriginalClassName('');
    setFormError('');
    setEditingClass({
      id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nama: '',
      tingkat: 'X',
      fase: 'Fase E (Umum)',
      jurusan: 'Kurikulum Merdeka',
      waliKelas: '',
      nipWaliKelas: '',
      tahunAjaran: '2024/2025',
      ruangan: 'Gedung A',
      keterangan: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (classInfo: ClassInfo) => {
    setIsNewClass(false);
    setOriginalClassName(classInfo.nama);
    setFormError('');
    setEditingClass({ ...classInfo });
    setSyncStudentsOnRename(true);
    setIsModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    const trimmedName = editingClass.nama.trim();
    if (!trimmedName) {
      setFormError('Nama kelas tidak boleh kosong.');
      return;
    }

    // Check duplicate name
    const isDuplicate = classes.some(
      (c) => c.nama.trim().toLowerCase() === trimmedName.toLowerCase() && c.id !== editingClass.id
    );
    if (isDuplicate) {
      setFormError(`Kelas dengan nama "${trimmedName}" sudah terdaftar.`);
      return;
    }

    const payload: ClassInfo = {
      ...editingClass,
      nama: trimmedName,
    };

    if (isNewClass) {
      onAddClass(payload);
    } else {
      onUpdateClass(payload, syncStudentsOnRename ? originalClassName : undefined);
    }

    setIsModalOpen(false);
    setEditingClass(null);
  };

  // Handlers for Delete
  const handleConfirmDelete = () => {
    if (!classToDelete) return;
    onDeleteClass(classToDelete.id);
    setClassToDelete(null);
  };

  // Handlers for Mass Move
  const handleOpenMoveModal = (fromClassName?: string) => {
    const from = fromClassName || (classes[0]?.nama || '');
    setMoveFromClass(from);
    const destination = classes.find((c) => c.nama !== from)?.nama || '';
    setMoveToClass(destination);
    // Auto select all students in fromClass
    const studentsInClass = students.filter((s) => (s.kelas || '').trim() === from);
    setSelectedStudentIdsToMove(studentsInClass.map((s) => s.id));
    setMoveSuccessMsg('');
    setIsMoveModalOpen(true);
  };

  const handleFromClassChange = (newFrom: string) => {
    setMoveFromClass(newFrom);
    const studentsInClass = students.filter((s) => (s.kelas || '').trim() === newFrom);
    setSelectedStudentIdsToMove(studentsInClass.map((s) => s.id));
    if (moveToClass === newFrom) {
      const alt = classes.find((c) => c.nama !== newFrom)?.nama || '';
      setMoveToClass(alt);
    }
  };

  const handleToggleStudentSelection = (studentId: string) => {
    setSelectedStudentIdsToMove((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllStudentsInMove = () => {
    const studentsInClass = students.filter((s) => (s.kelas || '').trim() === moveFromClass);
    if (selectedStudentIdsToMove.length === studentsInClass.length) {
      setSelectedStudentIdsToMove([]);
    } else {
      setSelectedStudentIdsToMove(studentsInClass.map((s) => s.id));
    }
  };

  const handleExecuteMove = () => {
    if (!moveFromClass || !moveToClass) return;
    if (moveFromClass === moveToClass) {
      alert('Kelas tujuan tidak boleh sama dengan kelas asal.');
      return;
    }
    if (selectedStudentIdsToMove.length === 0) {
      alert('Pilih setidaknya satu siswa untuk dipindahkan.');
      return;
    }

    onBulkMoveStudents(moveFromClass, moveToClass, selectedStudentIdsToMove);
    setMoveSuccessMsg(
      `Berhasil memindahkan ${selectedStudentIdsToMove.length} siswa dari Kelas ${moveFromClass} ke Kelas ${moveToClass}!`
    );
    setTimeout(() => {
      setIsMoveModalOpen(false);
      setMoveSuccessMsg('');
    }, 1500);
  };

  // Grade badge styling helper
  const getGradeBadge = (tingkat: string) => {
    switch (tingkat) {
      case 'X':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'XI':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'XII':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Key Metrics */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-5 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              <School className="w-3.5 h-3.5" />
              Sistem Pengelolaan Rombongan Belajar (Rombel)
            </div>
            <h2 className="text-base sm:text-xl font-extrabold tracking-tight flex items-center gap-2">
              <span>Manajemen Kelas SMA Negeri 1 Julok</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Atur daftar kelas, wali kelas, kurikulum, dan peminatan jurusan. Akses cepat untuk melihat
              anggota siswa, pratinjau kartu per kelas, cetak massal, serta mutasi/kenaikan kelas siswa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenMoveModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs transition-colors cursor-pointer border border-white/20"
              title="Pindahkan siswa dari satu kelas ke kelas lain secara massal"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-300" />
              <span>Mutasi / Pindah Kelas</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas Baru</span>
            </button>
          </div>
        </div>

        {/* Metric Cards inside Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">Total Rombel</span>
            <span className="text-lg font-black text-white">{classes.length} Kelas</span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">Siswa Terdaftar</span>
            <span className="text-lg font-black text-white">{totalStudentsInClasses} Siswa</span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">Sebaran Tingkat</span>
            <span className="text-xs font-bold text-amber-300">
              X ({gradeCounts.X}) • XI ({gradeCounts.XI}) • XII ({gradeCounts.XII})
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">Tahun Ajaran</span>
            <span className="text-xs font-bold text-emerald-300">2024/2025 (Aktif)</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & View Mode Controls Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="flex-1 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama kelas, wali kelas, jurusan, ruangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          {/* Tingkat Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 px-2">Tingkat:</span>
            {(['all', 'X', 'XI', 'XII', 'Lainnya'] as const).map((grade) => (
              <button
                key={grade}
                onClick={() => setGradeFilter(grade)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                  gradeFilter === grade
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {grade === 'all' ? 'Semua' : grade === 'Lainnya' ? 'Lainnya' : `Kelas ${grade}`}
              </button>
            ))}
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === 'grid' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-500'
              }`}
              title="Tampilan Kartu Kisi (Grid)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                viewMode === 'table' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-500'
              }`}
              title="Tampilan Tabel Rinci"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Class List: Grid View */}
      {viewMode === 'grid' ? (
        filteredClasses.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <School className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Tidak Ada Kelas yang Ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              {searchQuery || gradeFilter !== 'all'
                ? 'Tidak ada kelas yang cocok dengan kata kunci pencarian atau filter tingkat saat ini.'
                : 'Belum ada rombel / kelas yang terdaftar. Silakan tambahkan kelas baru.'}
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kelas Baru</span>
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClasses.map((cls) => {
            const stats = classStats[cls.nama] || {
              total: 0,
              male: 0,
              female: 0,
              withPhoto: 0,
              withoutPhoto: 0,
            };
            const photoPercentage = stats.total > 0 ? Math.round((stats.withPhoto / stats.total) * 100) : 0;

            return (
              <div
                key={cls.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top: Class Badge & Actions */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
                        {cls.nama}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                            Kelas {cls.nama}
                          </h3>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getGradeBadge(
                              cls.tingkat
                            )}`}
                          >
                            Tingkat {cls.tingkat}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          {cls.fase || 'Kurikulum Merdeka'} • {cls.jurusan || 'Umum'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Edit/Delete */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(cls)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Data Kelas"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setClassToDelete(cls)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Kelas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Middle Info: Wali Kelas & Ruangan */}
                  <div className="py-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] text-slate-400 font-medium">Wali Kelas:</span>
                      <span className="font-bold text-slate-800 truncate max-w-[180px]">
                        {cls.waliKelas || 'Belum Ditentukan'}
                      </span>
                    </div>

                    {cls.nipWaliKelas && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[11px] text-slate-400 font-medium">NIP Wali:</span>
                        <span className="font-mono text-[11px] text-slate-600">{cls.nipWaliKelas}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] text-slate-400 font-medium">Ruang Belajar:</span>
                      <span className="font-semibold text-slate-700">{cls.ruangan || '-'}</span>
                    </div>

                    {/* Student Statistics Bar */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <Users className="w-3 h-3 text-blue-600" />
                          <span>{stats.total} Siswa Terdaftar</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold">
                          L: {stats.male} • P: {stats.female}
                        </span>
                      </div>

                      {/* Photo progress bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${photoPercentage}%` }}
                          title={`${stats.withPhoto} dari ${stats.total} siswa telah memiliki pas foto`}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>{stats.withPhoto} Berfoto ({photoPercentage}%)</span>
                        <span>{stats.withoutPhoto} Belum Foto</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Card Actions: Integration with other app modules */}
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    onClick={() => onNavigateToStudents(cls.nama)}
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                    title="Buka Data Siswa untuk Kelas ini"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Lihat Siswa</span>
                  </button>

                  <button
                    onClick={() => onNavigateToStudio(cls.nama)}
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                    title="Lihat Pratinjau Kartu Siswa Kelas ini di Studio"
                  >
                    <Palette className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Studio Kartu</span>
                  </button>

                  <button
                    onClick={() => onNavigateToBatchPrint(cls.nama)}
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-slate-50 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                    title="Cetak Massal Lembaran A4 Kartu Kelas ini"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cetak Lembar</span>
                  </button>

                  <button
                    onClick={() => onTriggerMassDownloadZip(cls.nama)}
                    className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-lg transition-colors cursor-pointer"
                    title="Download Massal File Gambar PNG (ZIP) untuk Kelas ini"
                  >
                    <FolderArchive className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unduh ZIP</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )
      ) : (
        /* 4. Class List: Detailed Table View */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="py-3 px-4">Nama Kelas</th>
                  <th className="py-3 px-4">Tingkat & Fase</th>
                  <th className="py-3 px-4">Wali Kelas</th>
                  <th className="py-3 px-4">Ruangan</th>
                  <th className="py-3 px-4 text-center">Jumlah Siswa</th>
                  <th className="py-3 px-4 text-center">Kelengkapan Foto</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                        <School className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-xs text-slate-800">Tidak ada kelas yang ditemukan</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                        {searchQuery || gradeFilter !== 'all'
                          ? 'Coba sesuaikan kata kunci atau filter tingkat.'
                          : 'Belum ada rombel / kelas yang terdaftar.'}
                      </p>
                      <button
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Kelas Baru</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                filteredClasses.map((cls) => {
                  const stats = classStats[cls.nama] || {
                    total: 0,
                    male: 0,
                    female: 0,
                    withPhoto: 0,
                    withoutPhoto: 0,
                  };
                  const photoPercentage =
                    stats.total > 0 ? Math.round((stats.withPhoto / stats.total) * 100) : 0;

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-900 font-black text-xs flex items-center justify-center flex-shrink-0">
                            {cls.nama}
                          </span>
                          <span>Kelas {cls.nama}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getGradeBadge(
                            cls.tingkat
                          )}`}
                        >
                          Kelas {cls.tingkat}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">{cls.fase || '-'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{cls.waliKelas || '-'}</div>
                        {cls.nipWaliKelas && (
                          <div className="text-[10.5px] font-mono text-slate-400">
                            NIP. {cls.nipWaliKelas}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{cls.ruangan || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
                          {stats.total} Siswa
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          L: {stats.male} • P: {stats.female}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-emerald-700">
                          {stats.withPhoto}/{stats.total} ({photoPercentage}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onNavigateToStudents(cls.nama)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Data Siswa"
                          >
                            <Users className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onNavigateToStudio(cls.nama)}
                            className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Pratinjau Kartu di Studio"
                          >
                            <Palette className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onTriggerMassDownloadZip(cls.nama)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Download ZIP Gambar Kartu"
                          >
                            <FolderArchive className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cls)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Kelas"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setClassToDelete(cls)}
                            className="p-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Kelas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* 5. Modal Tambah / Edit Kelas */}
      {isModalOpen && editingClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <School className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isNewClass ? 'Tambah Rombel / Kelas Baru' : `Edit Kelas: ${originalClassName}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Isi informasi rombongan belajar resmi SMA Negeri 1 Julok
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveClass} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* Nama Kelas */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nama Kelas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: X-1, XI MIPA 1"
                    value={editingClass.nama}
                    onChange={(e) => {
                      setEditingClass({ ...editingClass, nama: e.target.value });
                      if (formError) setFormError('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tingkat */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tingkat / Jenjang</label>
                  <select
                    value={editingClass.tingkat}
                    onChange={(e) =>
                      setEditingClass({
                        ...editingClass,
                        tingkat: e.target.value as any,
                        fase:
                          e.target.value === 'X'
                            ? 'Fase E (Umum)'
                            : e.target.value === 'XI' || e.target.value === 'XII'
                            ? 'Fase F'
                            : 'Umum',
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="X">Kelas X (Sepuluh)</option>
                    <option value="XI">Kelas XI (Sebelas)</option>
                    <option value="XII">Kelas XII (Dua Belas)</option>
                    <option value="Lainnya">Lainnya / Khusus</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Fase Kurikulum */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Fase / Kurikulum</label>
                  <input
                    type="text"
                    placeholder="Contoh: Fase E (Umum)"
                    value={editingClass.fase || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, fase: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Peminatan / Jurusan */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jurusan / Peminatan</label>
                  <input
                    type="text"
                    placeholder="Contoh: MIPA, IPS, Umum"
                    value={editingClass.jurusan || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, jurusan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Nama Wali Kelas */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Wali Kelas</label>
                  <input
                    type="text"
                    placeholder="Contoh: Dra. Salmawati, M.Pd"
                    value={editingClass.waliKelas || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, waliKelas: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* NIP Wali Kelas */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NIP Wali Kelas</label>
                  <input
                    type="text"
                    placeholder="19800101 200501 1 001"
                    value={editingClass.nipWaliKelas || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, nipWaliKelas: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Ruangan */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ruang Belajar / Gedung</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gedung A - R.101"
                    value={editingClass.ruangan || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, ruangan: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tahun Ajaran */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    placeholder="2024/2025"
                    value={editingClass.tahunAjaran || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, tahunAjaran: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  placeholder="Catatan tambahan kelas..."
                  value={editingClass.keterangan || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, keterangan: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Jika rename kelas: opsi sinkronisasi siswa */}
              {!isNewClass && originalClassName && originalClassName !== editingClass.nama.trim() && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5 text-amber-900">
                  <label className="flex items-center gap-2 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={syncStudentsOnRename}
                      onChange={(e) => setSyncStudentsOnRename(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                    <span>Perbarui nama kelas siswa otomatis</span>
                  </label>
                  <p className="text-[11px] text-amber-700">
                    Nama kelas seluruh siswa yang terdaftar di "{originalClassName}" akan otomatis
                    diperbarui ke "{editingClass.nama.trim()}".
                  </p>
                </div>
              )}

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isNewClass ? 'Simpan Kelas' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal Konfirmasi Hapus Kelas */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Hapus Kelas {classToDelete.nama}?
                </h3>
                <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus kelas{' '}
              <span className="font-bold text-slate-900">"{classToDelete.nama}"</span>?
              {classStats[classToDelete.nama]?.total > 0 && (
                <span className="block mt-2 font-bold text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  ⚠️ Perhatian: Terdapat {classStats[classToDelete.nama].total} siswa terdaftar di
                  kelas ini. Data siswa tidak akan terhapus, namun status kelasnya dapat dialihkan.
                </span>
              )}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Ya, Hapus Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Mutasi / Pindah Kelas Massal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Mutasi / Pindah Kelas Siswa Massal
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pindahkan siswa antar-kelas sekaligus (cocok untuk kenaikan kelas)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {moveSuccessMsg ? (
              <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span className="font-semibold">{moveSuccessMsg}</span>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Selectors: Asal -> Tujuan */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kelas Asal:</label>
                    <select
                      value={moveFromClass}
                      onChange={(e) => handleFromClassChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.nama}>
                          Kelas {cls.nama} ({students.filter((s) => (s.kelas || '').trim() === cls.nama).length} Siswa)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kelas Tujuan:</label>
                    <select
                      value={moveToClass}
                      onChange={(e) => setMoveToClass(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {classes
                        .filter((cls) => cls.nama !== moveFromClass)
                        .map((cls) => (
                          <option key={cls.id} value={cls.nama}>
                            Kelas {cls.nama} ({cls.tingkat})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Siswa Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700">
                      Pilih Siswa yang Dipindahkan:
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllStudentsInMove}
                      className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      {selectedStudentIdsToMove.length ===
                      students.filter((s) => (s.kelas || '').trim() === moveFromClass).length
                        ? 'Batal Pilih Semua'
                        : 'Pilih Semua'}
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {students
                      .filter((s) => (s.kelas || '').trim() === moveFromClass)
                      .map((std) => {
                        const isChecked = selectedStudentIdsToMove.includes(std.id);
                        return (
                          <label
                            key={std.id}
                            className={`flex items-center justify-between p-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${
                              isChecked ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleStudentSelection(std.id)}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                              />
                              <div className="truncate">
                                <span className="font-bold text-slate-800 block truncate">
                                  {std.nama}
                                </span>
                                <span className="text-[10.5px] text-slate-400 font-mono">
                                  NISN: {std.nisn} • NIS: {std.nis || '-'}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {std.jenisKelamin === 'L' ? 'L' : 'P'}
                            </span>
                          </label>
                        );
                      })}

                    {students.filter((s) => (s.kelas || '').trim() === moveFromClass).length === 0 && (
                      <div className="p-6 text-center text-slate-400">
                        Tidak ada siswa yang terdaftar di Kelas {moveFromClass}.
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {selectedStudentIdsToMove.length} siswa terpilih
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMoveModalOpen(false)}
                      className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteMove}
                      disabled={selectedStudentIdsToMove.length === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Pindahkan {selectedStudentIdsToMove.length} Siswa</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
