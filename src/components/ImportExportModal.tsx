import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  ArrowRight,
  Database,
  Sparkles,
} from 'lucide-react';
import { Student } from '../types';
import {
  parseSpreadsheetFile,
  autoDetectColumns,
  convertRowsToStudents,
  ColumnMapping,
  downloadExcelTemplate,
  exportStudentsToExcel,
  matchPhotosFromZip,
} from '../utils/excelParser';
import { INITIAL_STUDENTS } from '../data/defaults';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onImportStudents: (newStudents: Student[], replaceExisting: boolean) => void;
  onUpdateStudents: (updatedList: Student[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  students,
  onImportStudents,
  onUpdateStudents,
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'photos_zip' | 'export'>('import');
  
  // Spreadsheet import state
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping | null>(null);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [importError, setImportError] = useState('');

  // ZIP Photo matcher state
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipSuccessMsg, setZipSuccessMsg] = useState('');
  const [zipErrorMsg, setZipErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleFileDrop = async (file: File) => {
    setImportError('');
    setImportSuccessMsg('');
    setIsProcessing(true);
    try {
      setSpreadsheetFile(file);
      const result = await parseSpreadsheetFile(file);
      if (result.rows.length === 0) {
        setImportError('File kosong atau tidak ditemukan baris data siswa yang valid.');
        setIsProcessing(false);
        return;
      }
      setRawHeaders(result.headers);
      setRawRows(result.rows);
      const detected = autoDetectColumns(result.headers);
      setColumnMapping(detected);

      if (!detected.nama) {
        setImportError('Perhatian: Kolom "Nama Lengkap" belum terdeteksi otomatis. Silakan pilih kolom nama pada daftar pemetaan di bawah.');
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setImportError(`Gagal membaca file: ${err.message || 'Format spreadsheet tidak valid'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExecuteImport = () => {
    if (!rawRows.length || !columnMapping) {
      setImportError('Tidak ada data siswa untuk diimpor.');
      return;
    }

    if (!columnMapping.nama) {
      setImportError('Kolom "Nama Lengkap" wajib dipilih sebelum melanjutkan impor.');
      return;
    }

    try {
      setIsProcessing(true);
      setImportError('');
      const parsedStudents = convertRowsToStudents(rawRows, columnMapping);
      if (parsedStudents.length === 0) {
        setImportError('Tidak ada data siswa yang berhasil diekstrak. Pastikan isi tabel tidak kosong.');
        setIsProcessing(false);
        return;
      }

      onImportStudents(parsedStudents, replaceExisting);
      setImportSuccessMsg(`Berhasil mengimpor ${parsedStudents.length} data siswa!`);
      setTimeout(() => {
        onClose();
        setSpreadsheetFile(null);
        setRawRows([]);
        setColumnMapping(null);
        setImportSuccessMsg('');
        setIsProcessing(false);
      }, 1200);
    } catch (err: any) {
      console.error('Import processing error:', err);
      setImportError(`Gagal memproses data: ${err.message || 'Terjadi kesalahan sistem'}`);
      setIsProcessing(false);
    }
  };

  const handleZipUpload = async (file: File) => {
    setZipSuccessMsg('');
    setZipErrorMsg('');
    setIsProcessing(true);
    try {
      const { matchedCount, updatedStudents } = await matchPhotosFromZip(file, students);
      onUpdateStudents(updatedStudents);
      setZipSuccessMsg(
        `Sukses! Berhasil mencocokkan dan menyematkan ${matchedCount} foto siswa berdasarkan NISN/NIS.`
      );
    } catch (err: any) {
      setZipErrorMsg(`Gagal membaca file ZIP: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadSampleData = () => {
    onImportStudents(INITIAL_STUDENTS, true);
    setImportSuccessMsg('Berhasil memuat 8 data contoh siswa SMAN 1 Julok!');
    setTimeout(() => {
      onClose();
      setImportSuccessMsg('');
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Pusat Impor & Ekspor Data Siswa
              </h2>
              <p className="text-xs text-slate-500">
                SMA Negeri 1 Julok • Kompatibel dengan format Excel Dapodik & EMIS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 py-3">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'import'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            1. Impor Excel / CSV
          </button>
          <button
            onClick={() => setActiveTab('photos_zip')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'photos_zip'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            2. Impor Foto Massal (ZIP)
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'export'
                ? 'bg-blue-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            3. Unduh Template & Ekspor
          </button>
        </div>

        {/* Tab 1: Impor Excel/CSV */}
        {activeTab === 'import' && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Quick Sample Button */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Mulai Cepat dengan Contoh
                </span>
                <span className="text-[11px] text-blue-700">
                  Muat langsung 8 profil siswa contoh SMAN 1 Julok beserta foto dan NISN valid.
                </span>
              </div>
              <button
                onClick={handleLoadSampleData}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer whitespace-nowrap"
              >
                Muat Data Contoh
              </button>
            </div>

            {/* Dropzone */}
            {!rawRows.length ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileDrop(file);
                }}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center cursor-pointer"
              >
                <div className="w-12 h-12 bg-white rounded-full shadow-xs flex items-center justify-center text-blue-600 mb-3 border border-slate-200">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Pilih atau Tarik File Excel / CSV ke Sini
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Mendukung format .xlsx, .xls, dan .csv (pemisah koma atau titik koma).
                </p>

                <label className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer">
                  <span>Pilih File dari Komputer</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileDrop(file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              /* Column Mapping & Confirmation */
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      File <strong>{spreadsheetFile?.name}</strong> berhasil dibaca ({rawRows.length}{' '}
                      baris siswa).
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setRawRows([]);
                      setColumnMapping(null);
                      setSpreadsheetFile(null);
                    }}
                    className="text-xs text-emerald-700 hover:underline cursor-pointer font-medium"
                  >
                    Ganti File
                  </button>
                </div>

                {/* Column Mapping Fields */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                    Konfirmasi Pemetaan Kolom Excel
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Sistem mendeteksi kolom secara otomatis. Sesuaikan jika nama kolom berbeda.
                  </p>

                  {columnMapping && (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Kolom NISN *
                        </label>
                        <select
                          value={columnMapping.nisn}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, nisn: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Pilih Kolom --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Kolom Nama Lengkap *
                        </label>
                        <select
                          value={columnMapping.nama}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, nama: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Pilih Kolom --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Kolom NIS / NIPD
                        </label>
                        <select
                          value={columnMapping.nis}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, nis: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Lewati / Otomatis --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Kolom Kelas / Rombel
                        </label>
                        <select
                          value={columnMapping.kelas}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, kelas: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Pilih Kolom --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Kolom TTL (Tempat & Tgl Lahir Gabung)
                        </label>
                        <select
                          value={columnMapping.ttl || ''}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, ttl: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Lewati / Kolom Terpisah --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Kolom Tempat Lahir
                        </label>
                        <select
                          value={columnMapping.tempatLahir}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, tempatLahir: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Lewati / Otomatis --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Kolom Tanggal Lahir
                        </label>
                        <select
                          value={columnMapping.tanggalLahir}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, tanggalLahir: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Lewati / Otomatis --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Kolom Jenis Kelamin (L/P)
                        </label>
                        <select
                          value={columnMapping.jenisKelamin}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, jenisKelamin: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Lewati / Otomatis --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Kolom Jurusan / Fase
                        </label>
                        <select
                          value={columnMapping.jurusan || ''}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, jurusan: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Lewati / Otomatis --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Kolom Alamat
                        </label>
                        <select
                          value={columnMapping.alamat}
                          onChange={(e) =>
                            setColumnMapping({ ...columnMapping, alamat: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs"
                        >
                          <option value="">-- Lewati / Otomatis --</option>
                          {rawHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Data Preview Table (First 3 Rows) */}
                {rawRows.length > 0 && columnMapping && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        Pratinjau Hasil Ekstraksi (3 Baris Pertama)
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Total {rawRows.length} baris terdeteksi
                      </span>
                    </div>
                    <div className="overflow-x-auto text-[11px]">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-1 px-2 font-semibold">Nama Siswa</th>
                            <th className="py-1 px-2 font-semibold">NISN</th>
                            <th className="py-1 px-2 font-semibold">NIS</th>
                            <th className="py-1 px-2 font-semibold">L/P</th>
                            <th className="py-1 px-2 font-semibold">TTL</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rawRows.slice(0, 3).map((r, i) => {
                            const nama = columnMapping.nama ? r[columnMapping.nama] : '(Belum dipetakan)';
                            const nisn = columnMapping.nisn ? r[columnMapping.nisn] : '-';
                            const nis = columnMapping.nis ? r[columnMapping.nis] : '-';
                            const jk = columnMapping.jenisKelamin ? r[columnMapping.jenisKelamin] : 'L';
                            const ttl = columnMapping.ttl
                              ? r[columnMapping.ttl]
                              : `${columnMapping.tempatLahir ? r[columnMapping.tempatLahir] : ''}, ${columnMapping.tanggalLahir ? r[columnMapping.tanggalLahir] : ''}`;
                            return (
                              <tr key={i} className="hover:bg-slate-100/60">
                                <td className="py-1 px-2 font-bold text-slate-800 truncate max-w-[140px]">{String(nama || '-')}</td>
                                <td className="py-1 px-2 font-mono text-slate-700">{String(nisn || '-')}</td>
                                <td className="py-1 px-2 font-mono text-slate-700">{String(nis || '-')}</td>
                                <td className="py-1 px-2 font-semibold text-slate-700">{String(jk || 'L')}</td>
                                <td className="py-1 px-2 text-slate-600 truncate max-w-[140px]">{String(ttl || '-')}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Import options */}
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="replaceMode"
                      checked={!replaceExisting}
                      onChange={() => setReplaceExisting(false)}
                      className="accent-blue-600"
                    />
                    <span>Tambahkan ke data siswa yang sudah ada ({students.length} siswa)</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="replaceMode"
                      checked={replaceExisting}
                      onChange={() => setReplaceExisting(true)}
                      className="accent-blue-600"
                    />
                    <span>Ganti seluruh data dengan file ini</span>
                  </label>
                </div>
              </div>
            )}

            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{importError}</span>
              </div>
            )}

            {importSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{importSuccessMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Impor Foto Massal (ZIP) */}
        {activeTab === 'photos_zip' && (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-slate-700">
              <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                <FileArchive className="w-4 h-4 text-blue-600" />
                Cara Kerja Impor Foto Massal ZIP
              </h4>
              <p className="text-slate-600 leading-relaxed">
                Kumpulkan file pas foto seluruh siswa (format .jpg, .jpeg, atau .png) ke dalam satu
                arsip <strong>.zip</strong>. Berikan nama setiap file foto sesuai dengan{' '}
                <strong>NISN</strong> (contoh: <code>0078129341.jpg</code>), <strong>NIS</strong>{' '}
                (contoh: <code>22231001.jpg</code>), atau nama siswa. Sistem akan otomatis
                menghubungkan foto ke kartu masing-masing siswa!
              </p>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleZipUpload(file);
              }}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-12 h-12 bg-white rounded-full shadow-xs flex items-center justify-center text-blue-600 mb-3 border border-slate-200">
                <FileArchive className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Pilih atau Tarik File ZIP Foto Siswa
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Sistem akan memindai isi file ZIP dan menyematkan foto ke {students.length} siswa yang
                terdaftar.
              </p>

              <label className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer">
                <span>Pilih File .ZIP</span>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleZipUpload(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {zipSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{zipSuccessMsg}</span>
              </div>
            )}

            {zipErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span>{zipErrorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Unduh Template & Ekspor */}
        {activeTab === 'export' && (
          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                Unduh Format Template Kosong
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Gunakan template ini untuk mengisi data siswa melalui Microsoft Excel atau Google
                Sheets sebelum diimpor kembali.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => downloadExcelTemplate('xlsx')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Template Excel (.xlsx)</span>
                </button>

                <button
                  onClick={() => downloadExcelTemplate('csv')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Format CSV (.csv)</span>
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                Ekspor Data Siswa Saat Ini
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Simpan cadangan data {students.length} siswa SMA Negeri 1 Julok ke dalam format Excel
                atau CSV.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => exportStudentsToExcel(students, 'xlsx')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor ke Excel ({students.length} Siswa)</span>
                </button>

                <button
                  onClick={() => exportStudentsToExcel(students, 'csv')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor ke CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Total Siswa Terdaftar: <strong>{students.length}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Tutup
            </button>

            {activeTab === 'import' && rawRows.length > 0 && (
              <button
                onClick={handleExecuteImport}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-all"
              >
                <span>
                  {isProcessing ? 'Memproses Impor...' : `Mulai Impor (${rawRows.length} Siswa)`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
