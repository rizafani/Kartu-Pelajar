import React, { useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon, FileArchive, CheckCircle2, ArrowRight } from 'lucide-react';
import { Student } from '../types';

interface StudentPhotoChoiceModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onChooseWebcam: (student: Student) => void;
  onUploadFile: (student: Student, file: File) => void;
  onOpenZipModal?: () => void;
}

export const StudentPhotoChoiceModal: React.FC<StudentPhotoChoiceModalProps> = ({
  isOpen,
  student,
  onClose,
  onChooseWebcam,
  onUploadFile,
  onOpenZipModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !student) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(student, file);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Pilihan Sumber Pas Foto Siswa
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {student.nama} • NIS: <strong className="text-blue-900 font-mono">{student.nis}</strong> • NISN: <span className="font-mono">{student.nisn}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Photo Preview & Student Status */}
        <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-4">
          <div className="w-12 h-16 rounded-lg border-2 border-slate-300 overflow-hidden bg-[#0284c7] flex items-center justify-center flex-shrink-0 shadow-2xs">
            {student.foto ? (
              <img src={student.foto} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-6 h-6 text-white/80" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {student.foto ? 'Foto Saat Ini Terpasang' : 'Belum Ada Foto Terpasang'}
              </span>
              {student.foto && (
                <span className="text-[10px] text-emerald-700 bg-emerald-100 font-semibold px-2 py-0.2 rounded-full">
                  Siap Cetak
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pilih salah satu dari 2 metode di bawah untuk memperbarui pas foto siswa.
            </p>
          </div>
        </div>

        {/* 2 Primary Options */}
        <div className="space-y-4">
          {/* ===================== OPSI 1: UPLOAD FILE MANUAL ===================== */}
          <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50/30">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
                1
              </span>
              <h4 className="text-sm font-bold text-blue-950">
                Upload File Manual
              </h4>
            </div>

            <div className="space-y-2.5 pl-8">
              {/* Sub-option 1A: Upload Satu per Satu */}
              <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Upload Satu per Satu (Siswa Ini)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Pilih berkas foto dari komputer (.jpg, .png, .webp).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Pilih Berkas Foto</span>
                </button>
              </div>

              {/* Sub-option 1B: Upload Massal dari Data ZIP */}
              <div className="bg-white p-3 rounded-xl border border-blue-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <FileArchive className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Upload Massal dari Data ZIP (Sesuai NIS)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Otomatis membaca nama file dalam ZIP sesuai <strong>NIS ({student.nis})</strong> untuk seluruh siswa.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenZipModal) onOpenZipModal();
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  <FileArchive className="w-3.5 h-3.5" />
                  <span>Buka ZIP Massal</span>
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* ===================== OPSI 2: CAMERA WEB CAM ===================== */}
          <div className="border-2 border-emerald-200 rounded-xl p-4 bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center">
                2
              </span>
              <h4 className="text-sm font-bold text-emerald-950">
                Camera Web Cam
              </h4>
            </div>

            <div className="pl-8 bg-white p-3 rounded-xl border border-emerald-100 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Jepret Foto Langsung dari Webcam</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Buka kamera web komputer/laptop dengan bingkai panduan pas foto wajah 3:4.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onChooseWebcam(student);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Buka Webcam</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};
