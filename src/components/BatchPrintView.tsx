import React, { useState } from 'react';
import {
  Printer,
  ArrowLeft,
  Settings,
  Download,
  Scissors,
  Check,
  FileText,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CardSettings, PrintSettings, Student } from '../types';
import { StudentCard } from './StudentCard';
import { downloadClassCardsAsZip, CardResolution, RESOLUTION_OPTIONS } from '../utils/cardExporter';

interface BatchPrintViewProps {
  students: Student[];
  settings: CardSettings;
  printSettings: PrintSettings;
  onUpdatePrintSettings: (settings: PrintSettings) => void;
  onClose: () => void;
}

export const BatchPrintView: React.FC<BatchPrintViewProps> = ({
  students,
  settings,
  printSettings,
  onUpdatePrintSettings,
  onClose,
}) => {
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [exportResolution, setExportResolution] = useState<CardResolution>('high');

  const handlePrint = () => {
    window.print();
  };

  // Divide students into pages according to cardsPerPage
  const getPages = () => {
    const itemsPerPage = printSettings.cardsPerPage;
    const pages: Student[][] = [];
    for (let i = 0; i < students.length; i += itemsPerPage) {
      pages.push(students.slice(i, i + itemsPerPage));
    }
    return pages;
  };

  const pages = getPages();

  // Export all cards to ZIP of PNGs using client-side canvas
  const handleExportZip = async () => {
    setIsExportingZip(true);
    setErrorMsg('');
    setExportProgress('Menyiapkan berkas ZIP gambar kartu...');
    try {
      const sideOption: 'front' | 'back' | 'both' =
        printSettings.printMode === 'front_only'
          ? 'front'
          : printSettings.printMode === 'back_only'
          ? 'back'
          : 'both';

      await downloadClassCardsAsZip(
        students,
        'Cetak_Batch',
        settings,
        sideOption,
        exportResolution,
        (current, total, label) => {
          setExportProgress(`Memproses gambar ${current}/${total}: ${label}`);
        }
      );
    } catch (err: any) {
      setErrorMsg(`Gagal membuat ZIP: ${err?.message || 'Terjadi kesalahan'}`);
    } finally {
      setIsExportingZip(false);
      setExportProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900/90 text-slate-100 flex flex-col">
      {/* Top Floating Control Bar (Hidden during print) */}
      <header className="print:hidden sticky top-0 z-50 bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Editor</span>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <Printer className="w-4 h-4 text-blue-400" />
              Mode Cetak Otomatis (Batch Print)
            </h1>
            <p className="text-[11px] text-slate-400">
              Total {students.length} Siswa • {pages.length} Lembar A4
            </p>
          </div>
        </div>

        {/* Print Configuration Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Print Mode */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Sisi:</span>
            <button
              onClick={() => onUpdatePrintSettings({ ...printSettings, printMode: 'paired' })}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                printSettings.printMode === 'paired'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Depan + Belakang
            </button>
            <button
              onClick={() => onUpdatePrintSettings({ ...printSettings, printMode: 'front_only' })}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                printSettings.printMode === 'front_only'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Hanya Depan
            </button>
            <button
              onClick={() => onUpdatePrintSettings({ ...printSettings, printMode: 'back_only' })}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                printSettings.printMode === 'back_only'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Hanya Belakang
            </button>
          </div>

          {/* Cards per A4 */}
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-[11px] text-slate-400">Kartu per Lembar:</span>
            <select
              value={printSettings.cardsPerPage}
              onChange={(e) =>
                onUpdatePrintSettings({
                  ...printSettings,
                  cardsPerPage: parseInt(e.target.value, 10) as any,
                })
              }
              className="bg-slate-900 text-white text-xs rounded px-2 py-0.5 border border-slate-600 focus:outline-none"
            >
              <option value="8">8 Kartu (Standar A4)</option>
              <option value="10">10 Kartu (Hemat Kertas)</option>
              <option value="4">4 Kartu (Ukuran Besar)</option>
              <option value="1">1 Kartu (Printer PVC Langsung)</option>
            </select>
          </div>

          {/* Crop marks toggle */}
          <button
            onClick={() =>
              onUpdatePrintSettings({
                ...printSettings,
                showCropMarks: !printSettings.showCropMarks,
              })
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              printSettings.showCropMarks
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Garis Potong: {printSettings.showCropMarks ? 'ON' : 'OFF'}</span>
          </button>

          {/* Action buttons: Print & ZIP */}
          <div className="flex items-center gap-2">
            <select
              value={exportResolution}
              onChange={(e) => setExportResolution(e.target.value as CardResolution)}
              disabled={isExportingZip}
              className="bg-slate-800 text-white text-xs rounded-xl px-2.5 py-2 border border-slate-700 focus:outline-none cursor-pointer"
              title="Pilih Resolusi Ekspor Gambar ZIP"
            >
              {RESOLUTION_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.badge} ({r.name.split(' (')[0]})
                </option>
              ))}
            </select>

            <button
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer transition-all"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>{isExportingZip ? 'Mengekspor...' : 'Unduh ZIP'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang (Print)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Progress & Error status bar */}
      {isExportingZip && (
        <div className="print:hidden bg-blue-600/20 border-b border-blue-500/30 px-6 py-2.5 flex items-center justify-center gap-3 text-xs text-blue-200 animate-pulse">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>{exportProgress || 'Sedang memproses kartu ke format gambar PNG...'}</span>
        </div>
      )}
      {errorMsg && (
        <div className="print:hidden bg-rose-600/20 border-b border-rose-500/30 px-6 py-2 text-center text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Sheet Canvas Preview Area */}
      <main className="flex-1 p-4 sm:p-8 flex flex-col items-center gap-8 overflow-y-auto">
        {pages.map((pageStudents, pageIdx) => (
          <div
            key={pageIdx}
            className="print:m-0 print:p-0 print:shadow-none print:border-none print:rounded-none bg-white text-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-200/50 flex flex-col items-center relative overflow-hidden"
            style={{
              // Approximate A4 proportions: 210mm x 297mm (ratio 1:1.414)
              width: '210mm',
              minHeight: '297mm',
              margin: '0 auto 24px auto',
              boxSizing: 'border-box',
            }}
          >
            {/* Header indicator (hidden in print) */}
            <div className="print:hidden w-full flex items-center justify-between pb-3 mb-4 border-b border-slate-100 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-700">
                Lembar {pageIdx + 1} dari {pages.length} • SMAN 1 Julok
              </span>
              <span>
                {pageStudents.length} Siswa ({pageIdx * printSettings.cardsPerPage + 1} -{' '}
                {pageIdx * printSettings.cardsPerPage + pageStudents.length})
              </span>
            </div>

            {/* Grid of ID Cards */}
            <div
              className="grid gap-4 items-center justify-center w-full"
              style={{
                gridTemplateColumns:
                  settings.orientation === 'landscape'
                    ? printSettings.printMode === 'paired'
                      ? 'repeat(2, minmax(0, 1fr))'
                      : 'repeat(2, minmax(0, 1fr))'
                    : 'repeat(3, minmax(0, 1fr))',
              }}
            >
              {pageStudents.map((student) => {
                return (
                  <React.Fragment key={student.id}>
                    {/* Front side if requested */}
                    {(printSettings.printMode === 'paired' ||
                      printSettings.printMode === 'front_only' ||
                      printSettings.printMode === 'duplex') && (
                      <div className="relative group p-1 flex items-center justify-center">
                        {printSettings.showCropMarks && (
                          <div className="absolute inset-0 pointer-events-none">
                            {/* Corner crop mark crosshairs */}
                            <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-slate-400" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-slate-400" />
                            <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-slate-400" />
                            <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-slate-400" />
                          </div>
                        )}
                        <StudentCard
                          student={student}
                          settings={settings}
                          side="front"
                          scale={0.78}
                          showShadow={false}
                        />
                      </div>
                    )}

                    {/* Back side if paired or back_only */}
                    {(printSettings.printMode === 'paired' ||
                      printSettings.printMode === 'back_only') && (
                      <div className="relative group p-1 flex items-center justify-center">
                        {printSettings.showCropMarks && (
                          <div className="absolute inset-0 pointer-events-none">
                            <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-slate-400" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-slate-400" />
                            <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-slate-400" />
                            <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-slate-400" />
                          </div>
                        )}
                        <StudentCard
                          student={student}
                          settings={settings}
                          side="back"
                          scale={0.78}
                          showShadow={false}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Bottom page footnote in print */}
            <div className="mt-auto pt-4 w-full text-center text-[8px] text-slate-400 print:text-slate-500">
              Dicetak secara otomatis melalui Sistem Cetak Kartu Pelajar SMA Negeri 1 Julok • Halaman{' '}
              {pageIdx + 1}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};
