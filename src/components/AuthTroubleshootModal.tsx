import React, { useState } from 'react';
import {
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  X,
  ShieldAlert,
  ArrowRight,
  Globe,
  Download,
  Upload,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { Student, ClassInfo, CardSettings } from '../types';
import { exportCompleteBackup, importCompleteBackup } from '../utils/backupRestore';

interface AuthTroubleshootModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorCode: string;
  errorMessage: string;
  domain: string;
  onRetryWithRedirect: () => void;
  onRetryWithPopup: () => void;
  students: Student[];
  classes: ClassInfo[];
  cardSettings: CardSettings;
  onRestoreBackup: (data: { students: Student[]; classes: ClassInfo[]; settings?: Partial<CardSettings> }) => void;
}

export const AuthTroubleshootModal: React.FC<AuthTroubleshootModalProps> = ({
  isOpen,
  onClose,
  errorCode,
  errorMessage,
  domain,
  onRetryWithRedirect,
  onRetryWithPopup,
  students,
  classes,
  cardSettings,
  onRestoreBackup,
}) => {
  const [copied, setCopied] = useState(false);
  const [restoreNotice, setRestoreNotice] = useState('');

  if (!isOpen) return null;

  const currentHost = domain || (typeof window !== 'undefined' ? window.location.hostname : '');
  const isUnauthorizedDomain = errorCode === 'auth/unauthorized-domain';
  const isPopupBlocked = errorCode === 'auth/popup-blocked';
  const isOperationNotAllowed = errorCode === 'auth/operation-not-allowed';

  const firebaseConsoleDomainUrl =
    'https://console.firebase.google.com/project/rosy-lamp-bmn89/authentication/settings';
  const firebaseConsoleProvidersUrl =
    'https://console.firebase.google.com/project/rosy-lamp-bmn89/authentication/providers';

  const handleCopyDomain = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(currentHost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleFileRestore = async (file: File) => {
    try {
      setRestoreNotice('');
      const restored = await importCompleteBackup(file);
      onRestoreBackup(restored);
      setRestoreNotice(
        `Berhasil memulihkan ${restored.students.length} siswa dan ${restored.classes.length} kelas!`
      );
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setRestoreNotice(`Gagal membaca berkas: ${err.message || 'Format tidak valid'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Penyelesaian Kendala Login Google
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Kode Error: {errorCode || 'AUTH_ERROR'}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-slate-700">
          {/* Main Error Explanation Card */}
          {isUnauthorizedDomain ? (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">
                    Domain Belum Terdaftar di Authorized Domains Firebase
                  </h4>
                  <p className="text-amber-800 text-[11.5px] mt-1 leading-relaxed">
                    Firebase Authentication menolak login karena domain aplikasi saat ini belum
                    ditambahkan ke daftar domain terpercaya proyek Firebase <code>rosy-lamp-bmn89</code>.
                  </p>
                </div>
              </div>

              {/* Domain Copy Box */}
              <div className="p-2.5 bg-white border border-amber-200 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <code className="font-mono text-xs text-slate-800 truncate font-bold">
                    {currentHost}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold transition-colors cursor-pointer flex-shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Domain</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step by step fix */}
              <div className="bg-amber-100/50 p-3 rounded-lg text-slate-800 space-y-1.5">
                <div className="font-bold text-[11px] text-amber-950 uppercase tracking-wider">
                  Langkah Cepat Memperbaiki (1 Menit):
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700">
                  <li>
                    Buka{' '}
                    <a
                      href={firebaseConsoleDomainUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 font-bold underline inline-flex items-center gap-0.5"
                    >
                      <span>Firebase Console - Authorized Domains</span>
                      <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </li>
                  <li>
                    Scroll ke bagian <strong>Authorized domains</strong>, lalu klik{' '}
                    <strong>Add domain</strong>.
                  </li>
                  <li>
                    Tempelkan domain <code>{currentHost}</code> lalu klik <strong>Save</strong>.
                  </li>
                  <li>Kembali ke sini dan klik <strong>Coba Login Ulang</strong>.</li>
                </ol>
              </div>
            </div>
          ) : isPopupBlocked ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-900 text-sm">
                    Jendela Popup Google Login Diblokir
                  </h4>
                  <p className="text-blue-800 text-[11.5px] mt-1 leading-relaxed">
                    Browser Anda (atau mode penyamaran/HP) memblokir jendela popup otomatis. Silakan
                    izinkan pop-up pada peramban Anda atau gunakan mode pengalihan (redirect).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    onClose();
                    onRetryWithRedirect();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Login dengan Pengalihan (Redirect)</span>
                </button>
              </div>
            </div>
          ) : isOperationNotAllowed ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <h4 className="font-bold text-red-900 text-sm">
                Provider Google Belum Aktif di Firebase
              </h4>
              <p className="text-red-700 text-xs">
                Penyedia Google Sign-In perlu diaktifkan di konsol Firebase.
              </p>
              <a
                href={firebaseConsoleProvidersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 font-bold underline text-xs"
              >
                <span>Buka Pengaturan Sign-in Method di Firebase</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl space-y-1.5">
              <h4 className="font-bold text-slate-800 text-xs">Pesan Kesalahan:</h4>
              <p className="text-slate-600 font-mono text-[11px] break-all bg-white p-2 rounded border border-slate-200">
                {errorMessage || 'Terjadi kendala pada komunikasi dengan server Google.'}
              </p>
            </div>
          )}

          {/* Alternative: Instant Cross-Device Offline Backup & Sync */}
          <div className="border border-slate-200 bg-slate-50/80 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Solusi Instan: Pindahkan Data Antar-Perangkat via Berkas Cadangan</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Anda tetap dapat menyinkronkan seluruh data siswa ({students.length}), foto, dan kelas ({classes.length}) ke HP atau Laptop lain tanpa harus menunggu pengaturan akun Google:
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => exportCompleteBackup(students, classes, cardSettings)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Cadangan Semua Data (.json)</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg font-semibold text-[11px] shadow-2xs transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Pulihkan dari Berkas (.json)</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileRestore(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {restoreNotice && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-bold text-[11px]">
                {restoreNotice}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Lanjutkan dalam Mode Lokal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetryWithPopup();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Login Ulang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
