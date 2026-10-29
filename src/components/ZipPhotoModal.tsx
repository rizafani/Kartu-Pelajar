import React, { useState } from 'react';
import {
  FileArchive,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  ArrowRight,
  Sparkles,
  Info,
  Image as ImageIcon,
} from 'lucide-react';
import { Student } from '../types';
import { matchPhotosFromZip, downloadSampleZipByNis, downloadSampleZipByNisn } from '../utils/excelParser';

interface ZipPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onApplyPhotos: (updatedStudents: Student[]) => void;
}

export const ZipPhotoModal: React.FC<ZipPhotoModalProps> = ({
  isOpen,
  onClose,
  students,
  onApplyPhotos,
}) => {
  const [matchField, setMatchField] = useState<'nis' | 'nisn' | 'nama' | 'auto'>('nisn');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [matchResult, setMatchResult] = useState<{
    matchedCount: number;
    updatedStudents: Student[];
    matchedFileDetails: { filename: string; studentName: string; studentNis: string; studentNisn: string; previewUrl: string }[];
    unmatchedFiles: string[];
  } | null>(null);
  const [successApplied, setSuccessApplied] = useState(false);

  if (!isOpen) return null;

  const handleZipFile = async (file: File) => {
    setErrorMsg('');
    setMatchResult(null);
    setSuccessApplied(false);
    setIsProcessing(true);
    setZipFile(file);

    try {
      const result = await matchPhotosFromZip(file, students, matchField);
      if (result.matchedCount === 0 && result.unmatchedFiles.length === 0) {
        setErrorMsg('File ZIP tidak berisi file gambar pas foto (.jpg, .jpeg, .png, .webp).');
      } else {
        setMatchResult(result);
      }
    } catch (err: any) {
      setErrorMsg(`Gagal membaca berkas ZIP: ${err.message || 'Format tidak valid'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!matchResult) return;
    onApplyPhotos(matchResult.updatedStudents);
    setSuccessApplied(true);
    setTimeout(() => {
      onClose();
      setZipFile(null);
      setMatchResult(null);
      setSuccessApplied(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Upload Foto Massal dari Berkas ZIP
              </h3>
              <p className="text-xs text-slate-500">
                Otomatis membaca dan memasangkan pas foto siswa berdasarkan nomor NISN (10 Digit)
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Method Selector: NISN vs NIS vs Auto */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Pilihan Pola Pembacaan Nama File Foto dalam ZIP:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label
                className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                  matchField === 'nisn'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="matchField"
                  value="nisn"
                  checked={matchField === 'nisn'}
                  onChange={() => setMatchField('nisn')}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <span className="block font-bold">1. Sesuai NISN (Utama)</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Contoh: <code>0096011503.jpg</code>
                  </span>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                  matchField === 'nis'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="matchField"
                  value="nis"
                  checked={matchField === 'nis'}
                  onChange={() => setMatchField('nis')}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <span className="block font-bold">2. Sesuai NIS</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Contoh: <code>22231018.jpg</code>
                  </span>
                </div>
              </label>

              <label
                className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition-all ${
                  matchField === 'auto'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="matchField"
                  value="auto"
                  checked={matchField === 'auto'}
                  onChange={() => setMatchField('auto')}
                  className="mt-0.5 accent-blue-600"
                />
                <div>
                  <span className="block font-bold">3. Deteksi Cerdas</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    NISN / NIS / Nama Siswa
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Dropzone */}
          {!matchResult ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleZipFile(file);
              }}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-7 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center cursor-pointer"
            >
              <div className="w-12 h-12 bg-white rounded-full shadow-xs flex items-center justify-center text-blue-600 mb-2.5 border border-slate-200">
                <FileArchive className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Tarik Berkas .ZIP Berisi Pas Foto ke Sini
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Nama file di dalam ZIP dapat berupa nomor{' '}
                <strong className="text-blue-700 uppercase">{matchField === 'nisn' ? 'NISN (10 digit)' : matchField}</strong> siswa
                (contoh: <code>0078129341.jpg</code> atau <code>0078129341.png</code>).
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih Berkas .ZIP</span>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleZipFile(file);
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => downloadSampleZipByNisn(students)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold rounded-lg border border-blue-200 transition-colors cursor-pointer"
                  title="Unduh contoh file ZIP berisi foto dummy dengan nama sesuai nomor NISN siswa saat ini"
                >
                  <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Unduh Contoh ZIP (Format NISN)</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadSampleZipByNis(students)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  title="Unduh contoh file ZIP berisi foto dummy dengan nama sesuai NIS"
                >
                  <FileCheck className="w-3.5 h-3.5 text-slate-600" />
                  <span>Contoh ZIP (Format NIS)</span>
                </button>
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-800 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    Ditemukan <strong>{matchResult.matchedCount} foto</strong> yang berhasil dicocokkan dengan data{' '}
                    <strong>{matchField.toUpperCase()}</strong> siswa.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMatchResult(null)}
                  className="text-xs text-emerald-700 hover:underline cursor-pointer font-semibold"
                >
                  Ganti File ZIP
                </button>
              </div>

              {/* Matched Details List with Image Preview */}
              {matchResult.matchedFileDetails.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase sticky top-0 z-10">
                      <tr>
                        <th className="py-2 px-3">Foto</th>
                        <th className="py-2 px-3">Nama Berkas</th>
                        <th className="py-2 px-3">NISN</th>
                        <th className="py-2 px-3">NIS</th>
                        <th className="py-2 px-3">Nama Siswa</th>
                        <th className="py-2 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {matchResult.matchedFileDetails.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-1 px-3">
                            {item.previewUrl ? (
                              <img
                                src={item.previewUrl}
                                alt={item.studentName}
                                className="w-7 h-9 object-cover rounded shadow-2xs border border-slate-200"
                              />
                            ) : (
                              <div className="w-7 h-9 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-slate-600">
                            {item.filename}
                          </td>
                          <td className="py-1.5 px-3 font-mono font-bold text-blue-900">
                            {item.studentNisn || '-'}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-slate-600">
                            {item.studentNis || '-'}
                          </td>
                          <td className="py-1.5 px-3 font-semibold text-slate-900">
                            {item.studentName}
                          </td>
                          <td className="py-1.5 px-3 text-right text-emerald-600 font-bold text-[10px]">
                            Cocok ✓
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Unmatched Warning if any */}
              {matchResult.unmatchedFiles.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      {matchResult.unmatchedFiles.length} file tidak ditemukan kecocokannya:
                    </span>
                    <span className="block text-slate-600 mt-0.5 truncate max-w-md">
                      {matchResult.unmatchedFiles.slice(0, 5).join(', ')}
                      {matchResult.unmatchedFiles.length > 5 && ` (+${matchResult.unmatchedFiles.length - 5} lainnya)`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successApplied && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Foto berhasil diterapkan ke data siswa!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Total Siswa Terdaftar: <strong>{students.length}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Tutup
            </button>

            {matchResult && matchResult.matchedCount > 0 && (
              <button
                onClick={handleApply}
                disabled={successApplied}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                <span>Terapkan {matchResult.matchedCount} Foto ke Siswa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
