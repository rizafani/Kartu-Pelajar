import React, { useState } from 'react';
import { X, RotateCw, Download, Printer } from 'lucide-react';
import { CardSettings, Student } from '../types';
import { StudentCard } from './StudentCard';

interface SingleCardModalProps {
  isOpen: boolean;
  student: Student | null;
  settings: CardSettings;
  onClose: () => void;
  onPrintSingle: (student: Student) => void;
  onExportSingleCard: (student: Student, side: 'front' | 'back' | 'both') => void;
}

export const SingleCardModal: React.FC<SingleCardModalProps> = ({
  isOpen,
  student,
  settings,
  onClose,
  onPrintSingle,
  onExportSingleCard,
}) => {
  const [side, setSide] = useState<'front' | 'back'>('front');

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Pratinjau Kartu Pelajar: {student.nama}
            </h3>
            <p className="text-xs text-slate-500">
              NISN: {student.nisn} • Kelas: {student.kelas}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Card display */}
        <div className="py-6 flex items-center justify-center w-full">
          <StudentCard
            student={student}
            settings={settings}
            side={side}
            scale={1.25}
          />
        </div>

        {/* Action Controls */}
        <div className="w-full pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setSide((prev) => (prev === 'front' ? 'back' : 'front'))}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Balik ke Tampak {side === 'front' ? 'Belakang' : 'Depan'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onExportSingleCard(student, side)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Simpan Gambar ({side === 'front' ? 'Depan' : 'Belakang'})</span>
            </button>

            <button
              onClick={() => onPrintSingle(student)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Kartu Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
