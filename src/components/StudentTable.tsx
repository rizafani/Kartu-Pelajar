import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Edit,
  Camera,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Printer,
  Eye,
  FileArchive,
  FileSpreadsheet,
  Upload,
  UserCheck,
  UserX,
  X,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { Student } from '../types';
import { StudentPhotoChoiceModal } from './StudentPhotoChoiceModal';

interface StudentTableProps {
  students: Student[];
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onDeleteSelectedStudents: (ids: string[]) => void;
  selectedStudentIds: string[];
  onToggleSelectStudent: (id: string) => void;
  onSelectAllStudents: (selectAll: boolean) => void;
  onOpenCardPreview: (student: Student) => void;
  onOpenWebcamForStudent: (student: Student) => void;
  onOpenZipModal: () => void;
  onOpenImportModal?: () => void;
  onTriggerPrint: (mode?: 'selected' | 'all') => void;
  onOpenVerification?: (student: Student) => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onDeleteSelectedStudents,
  selectedStudentIds,
  onToggleSelectStudent,
  onSelectAllStudents,
  onOpenCardPreview,
  onOpenWebcamForStudent,
  onOpenZipModal,
  onOpenImportModal,
  onTriggerPrint,
  onOpenVerification,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'L' | 'P'>('all');
  const [photoFilter, setPhotoFilter] = useState<'all' | 'with' | 'without'>('all');

  // Edit / Add Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formError, setFormError] = useState('');
  
  // Custom Delete Confirmations
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);

  // Photo Choice Modal state (Upload File Manual vs Camera Webcam)
  const [photoChoiceStudent, setPhotoChoiceStudent] = useState<Student | null>(null);

  // Available classes list from current data
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.kelas) set.add(s.kelas);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.nisn.includes(searchQuery) ||
        s.nis.includes(searchQuery) ||
        s.alamat.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = classFilter === 'all' || s.kelas === classFilter;
      const matchGender = genderFilter === 'all' || s.jenisKelamin === genderFilter;
      const matchPhoto =
        photoFilter === 'all' ||
        (photoFilter === 'with' && !!s.foto) ||
        (photoFilter === 'without' && !s.foto);

      return matchSearch && matchClass && matchGender && matchPhoto;
    });
  }, [students, searchQuery, classFilter, genderFilter, photoFilter]);

  const allFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedStudentIds.includes(s.id));

  const handleOpenAdd = () => {
    setFormError('');
    setEditingStudent({
      id: `std-${Date.now()}`,
      nis: '',
      nisn: '',
      nama: '',
      tempatLahir: 'Buket Seuraja',
      tanggalLahir: '2009-01-01',
      jenisKelamin: 'L',
      kelas: 'X-1',
      jurusan: 'Fase E (Umum)',
      alamat: 'Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur',
      golonganDarah: '-',
      masaBerlaku: '06/2028',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setFormError('');
    setEditingStudent({ ...student });
    setIsModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    if (!editingStudent.nama.trim()) {
      setFormError('Nama siswa wajib diisi');
      return;
    }
    if (!editingStudent.nis.trim()) {
      setFormError('NIS siswa wajib diisi (untuk identifikasi dan pencocokan foto)');
      return;
    }

    const exists = students.some((s) => s.id === editingStudent.id);
    if (exists) {
      onUpdateStudent(editingStudent);
    } else {
      onAddStudent(editingStudent);
    }
    setIsModalOpen(false);
    setEditingStudent(null);
    setFormError('');
  };

  const handlePhotoUploadForStudent = (student: Student, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      onUpdateStudent({ ...student, foto: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Top Filter & Action Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between bg-slate-50/50">
        {/* Search & Select dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NIS, NISN, atau alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">Semua Kelas ({students.length})</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                Kelas {cls}
              </option>
            ))}
          </select>

          {/* Gender Filter */}
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">Semua Gender</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </select>

          {/* Photo Filter */}
          <select
            value={photoFilter}
            onChange={(e) => setPhotoFilter(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="all">Semua Status Foto</option>
            <option value="with">Sudah Ada Foto ({students.filter(s => !!s.foto).length})</option>
            <option value="without">Belum Ada Foto ({students.filter(s => !s.foto).length})</option>
          </select>
        </div>

        {/* Buttons: Mass ZIP Upload, Add Student & Batch Print */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Import Excel / CSV Button */}
          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Impor data siswa dari file Excel (.xlsx) atau CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Impor Excel / CSV</span>
            </button>
          )}

          {/* Mass ZIP Upload Button */}
          <button
            onClick={onOpenZipModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Upload banyak foto sekaligus dari file ZIP (dibaca sesuai NIS)"
          >
            <FileArchive className="w-3.5 h-3.5 text-blue-600" />
            <span>Upload Foto Massal (ZIP by NIS)</span>
          </button>

          {selectedStudentIds.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onTriggerPrint('selected')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Terpilih ({selectedStudentIds.length})</span>
              </button>

              <button
                onClick={() => setIsBatchDeleteConfirmOpen(true)}
                className="p-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors cursor-pointer"
                title="Hapus Terpilih"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Siswa Manual</span>
          </button>
        </div>
      </div>

      {/* Roster Statistics bar */}
      <div className="px-5 py-2.5 bg-slate-100/60 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-4">
          <span>
            Menampilkan <strong className="text-slate-900">{filteredStudents.length}</strong> dari{' '}
            <strong>{students.length}</strong> siswa
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline">
            Foto lengkap: <strong className="text-emerald-700">{students.filter((s) => !!s.foto).length}</strong>
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="hidden sm:inline">
            Belum ada foto: <strong className="text-amber-700">{students.filter((s) => !s.foto).length}</strong>
          </span>
        </div>

        {selectedStudentIds.length > 0 && (
          <span className="text-blue-700 font-semibold">
            {selectedStudentIds.length} siswa dipilih untuk cetak
          </span>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 w-10 text-center">
                <button
                  onClick={() => onSelectAllStudents(!allFilteredSelected)}
                  className="cursor-pointer text-slate-600 hover:text-blue-600 inline-flex items-center justify-center"
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              </th>
              <th className="py-3 px-3 w-16 text-center">Pas Foto</th>
              <th className="py-3 px-3">NIS</th>
              <th className="py-3 px-3">NISN</th>
              <th className="py-3 px-3">Nama Lengkap Siswa</th>
              <th className="py-3 px-3">Kelas / Jurusan</th>
              <th className="py-3 px-3">Tempat & Tgl Lahir</th>
              <th className="py-3 px-3">Gender</th>
              <th className="py-3 px-3">Alamat</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <p className="text-sm font-medium">Tidak ada data siswa yang cocok dengan filter.</p>
                  <p className="text-xs mt-1">Gunakan tombol Impor Excel/CSV atau Tambah Siswa Manual.</p>
                </td>
              </tr>
            ) : (
              filteredStudents.map((std) => {
                const isSelected = selectedStudentIds.includes(std.id);
                return (
                  <tr
                    key={std.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isSelected ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => onToggleSelectStudent(std.id)}
                        className="cursor-pointer inline-flex items-center justify-center text-slate-600 hover:text-blue-600"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>
                    </td>

                    {/* Pas Foto (2 Opsi: Upload File Manual & Camera Webcam) */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => setPhotoChoiceStudent(std)}
                          className="relative group w-11 h-14 rounded-lg border-2 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 mx-auto"
                          title="Klik untuk memilih foto (Upload File atau Webcam)"
                        >
                          {std.foto ? (
                            <img
                              src={std.foto}
                              alt={std.nama}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-400">
                              <ImageIcon className="w-4 h-4" />
                              <span className="text-[7.5px] font-bold mt-0.5">Pilih</span>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-blue-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                            Ganti
                          </div>
                        </button>

                        {/* Quick 2 options buttons */}
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => setPhotoChoiceStudent(std)}
                            className="p-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer"
                            title="1. Upload File Manual"
                          >
                            <Upload className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onOpenWebcamForStudent(std)}
                            className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer"
                            title="2. Camera Web Cam"
                          >
                            <Camera className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* NIS (Featured prominently for ZIP matching) */}
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-blue-50 text-blue-900 border border-blue-200">
                        {std.nis}
                      </span>
                    </td>

                    {/* NISN */}
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                      {std.nisn}
                    </td>

                    {/* Nama Lengkap */}
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 uppercase">{std.nama}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>Gol: {std.golonganDarah || '-'}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">{std.masaBerlaku}</span>
                      </div>
                    </td>

                    {/* Kelas / Jurusan */}
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-800">{std.kelas}</span>
                      {std.jurusan && (
                        <div className="text-[10px] text-slate-500">{std.jurusan}</div>
                      )}
                    </td>

                    {/* TTL */}
                    <td className="py-2.5 px-3">
                      <div className="text-slate-800 font-medium">
                        {std.tempatLahir ? `${std.tempatLahir}, ` : ''}
                        {std.tanggalLahir}
                      </div>
                    </td>

                    {/* Gender */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          std.jenisKelamin === 'L'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {std.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                      </span>
                    </td>

                    {/* Alamat */}
                    <td className="py-2.5 px-3 text-slate-600 max-w-[160px] truncate" title={std.alamat}>
                      {std.alamat}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPhotoChoiceStudent(std)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Ganti Foto (Upload File atau Webcam)"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenCardPreview(std)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Pratinjau Kartu Pelajar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {onOpenVerification && (
                          <button
                            onClick={() => onOpenVerification(std)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Buka Link Verifikasi Keaslian (Scan Preview)"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(std)}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Siswa"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setStudentToDelete(std)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Siswa"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Edit / Add Modal */}
      {isModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {students.some((s) => s.id === editingStudent.id)
                  ? 'Edit Data Identitas Siswa'
                  : 'Tambah Siswa Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
                  {formError}
                </div>
              )}

              {/* Photo selector inside Edit Form */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-15 rounded-lg border border-slate-300 bg-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {editingStudent.foto ? (
                      <img src={editingStudent.foto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-slate-400 font-bold">No Foto</span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Pas Foto Siswa</span>
                    <span className="text-[11px] text-slate-500">
                      {editingStudent.foto ? 'Foto tersedia' : 'Belum ada pas foto'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setEditingStudent({ ...editingStudent, foto: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenWebcamForStudent(editingStudent);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Webcam</span>
                  </button>
                </div>
              </div>

              {/* 1. NIS & NISN (NIS first for ZIP matching!) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-blue-900 block mb-1">
                    1. NIS (Nomor Induk Siswa) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.nis}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, nis: e.target.value })
                    }
                    placeholder="Contoh: 22231018"
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Digunakan untuk pencocokan otomatis nama file foto ZIP
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    2. NISN (10 Digit Nasional) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingStudent.nisn}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, nisn: e.target.value })
                    }
                    placeholder="Contoh: 0096011503"
                    className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Standar nomor induk siswa nasional
                  </span>
                </div>
              </div>

              {/* 2. Nama Lengkap Siswa */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  value={editingStudent.nama}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, nama: e.target.value })
                  }
                  placeholder="Contoh: HARIZATUL AKHMAR"
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 uppercase"
                />
              </div>

              {/* 3. Tempat, Tanggal Lahir */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Tempat Lahir
                  </label>
                  <input
                    type="text"
                    value={editingStudent.tempatLahir}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, tempatLahir: e.target.value })
                    }
                    placeholder="Contoh: BUKET SEURAJA"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={editingStudent.tanggalLahir}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, tanggalLahir: e.target.value })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* 4. Gender, Kelas, Gol Darah */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={editingStudent.jenisKelamin}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, jenisKelamin: e.target.value as any })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Kelas / Rombel
                  </label>
                  <input
                    type="text"
                    value={editingStudent.kelas}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, kelas: e.target.value })
                    }
                    placeholder="Contoh: X-1, XI MIPA 1"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Golongan Darah
                  </label>
                  <select
                    value={editingStudent.golonganDarah || '-'}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, golonganDarah: e.target.value as any })
                    }
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <option value="-">-</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="AB">AB</option>
                    <option value="O">O</option>
                  </select>
                </div>
              </div>

              {/* 5. Jurusan / Peminatan & Masa Berlaku */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Jurusan / Peminatan
                  </label>
                  <input
                    type="text"
                    value={editingStudent.jurusan || ''}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, jurusan: e.target.value })
                    }
                    placeholder="Contoh: Fase E, MIPA, IPS"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Masa Berlaku Kartu
                  </label>
                  <input
                    type="text"
                    value={editingStudent.masaBerlaku}
                    onChange={(e) =>
                      setEditingStudent({ ...editingStudent, masaBerlaku: e.target.value })
                    }
                    placeholder="Contoh: 06/2028"
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* 6. Alamat Tempat Tinggal */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Alamat Lengkap Siswa
                </label>
                <textarea
                  rows={2}
                  value={editingStudent.alamat}
                  onChange={(e) =>
                    setEditingStudent({ ...editingStudent, alamat: e.target.value })
                  }
                  placeholder="Desa Buket Seuraja, Kec. Julok, Kab. Aceh Timur"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Data</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Student Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Konfirmasi Hapus Siswa</h3>
            <p className="text-xs text-slate-600 mb-4">
              Apakah Anda yakin ingin menghapus data siswa <strong>{studentToDelete.nama}</strong> ({studentToDelete.nis})? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteStudent(studentToDelete.id);
                  setStudentToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {isBatchDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Hapus Siswa Terpilih</h3>
            <p className="text-xs text-slate-600 mb-4">
              Apakah Anda yakin ingin menghapus <strong>{selectedStudentIds.length}</strong> siswa yang dipilih?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteConfirmOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSelectedStudents(selectedStudentIds);
                  setIsBatchDeleteConfirmOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs cursor-pointer"
              >
                Hapus {selectedStudentIds.length} Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Choice Modal: Upload File Manual vs Camera Webcam */}
      <StudentPhotoChoiceModal
        isOpen={!!photoChoiceStudent}
        student={photoChoiceStudent}
        onClose={() => setPhotoChoiceStudent(null)}
        onChooseWebcam={(s) => {
          onOpenWebcamForStudent(s);
        }}
        onUploadFile={(s, file) => {
          handlePhotoUploadForStudent(s, file);
        }}
        onOpenZipModal={onOpenZipModal}
      />
    </div>
  );
};
