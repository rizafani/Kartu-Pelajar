import React, { useState } from 'react';
import {
  Palette,
  Layout,
  School,
  FileCheck2,
  ListOrdered,
  RotateCw,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Copy,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import { CardSettings, CardTemplateStyle, CardThemePreset, Student } from '../types';
import { StudentCard } from './StudentCard';
import { buildStudentVerificationUrl } from '../utils/barcodeGenerator';
import {
  THEME_PRESETS,
  SMAN1_JULOK_LOGO_PATH,
  ACEH_GOV_LOGO_PATH,
  OFFICIAL_STAMP_SVG,
  OFFICIAL_SIGNATURE_SVG,
} from '../data/defaults';

interface CardStudioProps {
  settings: CardSettings;
  onUpdateSettings: (settings: CardSettings) => void;
  students: Student[];
  selectedStudentId: string;
  onSelectStudentId: (id: string) => void;
  onExportSingleCard: (student: Student, side: 'front' | 'back' | 'both') => void;
  onOpenVerification?: (student: Student) => void;
}

export const CardStudio: React.FC<CardStudioProps> = ({
  settings,
  onUpdateSettings,
  students,
  selectedStudentId,
  onSelectStudentId,
  onExportSingleCard,
  onOpenVerification,
}) => {
  const [activeTab, setActiveTab] = useState<'template' | 'theme' | 'layout' | 'school' | 'legal' | 'back'>('template');
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  const [isFlipping, setIsFlipping] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  const handleFlip = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setCardSide((prev) => (prev === 'front' ? 'back' : 'front'));
      setIsFlipping(false);
    }, 150);
  };

  const handlePresetChange = (preset: CardThemePreset) => {
    const presetValues = THEME_PRESETS[preset];
    onUpdateSettings({
      ...settings,
      ...presetValues,
      themePreset: preset,
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateSettings({ ...settings, schoolLogo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAcehLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateSettings({ ...settings, pancasilaLogo: reader.result as string, showPancasila: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateSettings({ ...settings, stempelUrl: reader.result as string, showStempel: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateSettings({ ...settings, tandaTanganUrl: reader.result as string, showTandaTangan: true });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Live Card Preview Studio (5 Cols) */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <div className="w-full bg-slate-900/5 border border-slate-200/80 rounded-2xl p-4 sm:p-6 flex flex-col items-center shadow-xs">
          {/* Top Controls: Student picker & Flip toggle */}
          <div className="w-full flex items-center justify-between gap-2 mb-4">
            <div className="flex-1 min-w-0">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Siswa Pratinjau
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => onSelectStudentId(e.target.value)}
                className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 truncate"
              >
                {students.map((std) => (
                  <option key={std.id} value={std.id}>
                    {std.nama} (NIS: {std.nis} • {std.kelas})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleFlip}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{cardSide === 'front' ? 'Lihat Belakang' : 'Lihat Depan'}</span>
            </button>
          </div>

          {/* Interactive Card Canvas with 3D Flip transition - Direct Full Preview */}
          <div className="relative py-3 sm:py-5 flex items-center justify-center w-full overflow-hidden">
            <div
              className={`w-full max-w-[520px] flex items-center justify-center transition-transform duration-200 ease-in-out ${
                isFlipping ? 'scale-90 opacity-70 rotate-y-90' : 'scale-100 opacity-100'
              }`}
            >
              {currentStudent && (
                <StudentCard
                  student={currentStudent}
                  settings={settings}
                  side={cardSide}
                  autoFit={true}
                  onOpenVerification={onOpenVerification}
                />
              )}
            </div>
          </div>

          {/* Bottom Action Bar (Zoom/Persen dihilangkan, kartu otomatis fit penuh) */}
          <div className="w-full pt-3 mt-1 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Indikator Tampilan Penuh Otomatis */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Tampilan Penuh Otomatis (CR-80 ISO)
              </span>
            </div>

            {/* Quick Export & Flip Buttons */}
            {currentStudent && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleFlip}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  title="Balik ke sisi depan atau belakang kartu"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Lihat {cardSide === 'front' ? 'Belakang' : 'Depan'}</span>
                </button>

                <button
                  onClick={() => onExportSingleCard(currentStudent, cardSide)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh PNG ({cardSide === 'front' ? 'Depan' : 'Belakang'})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Digital Verification Link & Authenticity Test Box */}
        {currentStudent && (
          <div className="w-full mt-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Tautan Verifikasi Keaslian Kartu Siswa
                  </h4>
                  <p className="text-[11px] text-emerald-800 font-medium">
                    {currentStudent.nama} • NISN: {currentStudent.nisn}
                  </p>
                </div>
              </div>

              <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                ● Link QR Aktif
              </span>
            </div>

            <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
              QR Code dan Barcode pada kartu terhubung ke tautan verifikasi keaslian digital.
              Ketika di-scan dengan kamera smartphone, halaman sertifikat keabsahan resmi akan terbuka secara otomatis.
            </p>

            <div className="mt-3 pt-3 border-t border-emerald-200/80 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => {
                  if (onOpenVerification) {
                    onOpenVerification(currentStudent);
                  } else {
                    window.open(buildStudentVerificationUrl(currentStudent, settings), '_blank');
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Uji Buka Halaman Verifikasi Keaslian</span>
              </button>

              <button
                onClick={() => {
                  const url = buildStudentVerificationUrl(currentStudent, settings);
                  navigator.clipboard.writeText(url).then(() => {
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>{copiedLink ? 'Tautan Tersalin! ✓' : 'Salin Tautan'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Settings & Customizer Tabs (7 Cols) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-slate-200 pb-2 mb-5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('template')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'template'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pilihan Template</span>
          </button>

          <button
            onClick={() => setActiveTab('theme')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'theme'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Tema & Warna</span>
          </button>

          <button
            onClick={() => setActiveTab('layout')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'layout'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span>Tata Letak & Format</span>
          </button>

          <button
            onClick={() => setActiveTab('school')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'school'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>Kop & Identitas</span>
          </button>

          <button
            onClick={() => setActiveTab('legal')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'legal'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Pengesahan & Stempel</span>
          </button>

          <button
            onClick={() => setActiveTab('back')}
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'back'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Tata Tertib (Belakang)</span>
          </button>
        </div>

        {/* Tab 0: Template Selection (Pilihan Template Resmi) */}
        {activeTab === 'template' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Model Desain Template Kartu
                </h4>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Template Resmi Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Pilih format template yang sesuai kebutuhan sekolah. Template resmi kedinasan menggunakan standar Kop Dinas Pendidikan dan tabel identitas presisi.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'resmi_kedinasan' as CardTemplateStyle,
                    title: 'Resmi Kedinasan Nasional',
                    badge: 'Standar Resmi Dinas (Utama)',
                    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    desc: 'Kop Surat Dinas Pendidikan dengan garis ganda resmi (tebal & tipis), logo sekolah di kiri & logo Pemerintah Aceh di kanan, pas foto formal dengan badge NIS, tabel identitas presisi, dan pengesahan Kepala Sekolah berstempel dinas.',
                    icon: '🏛️',
                  },
                  {
                    id: 'garuda_emas' as CardTemplateStyle,
                    title: 'Garuda Presisi Keemasan',
                    badge: 'Presidential Gold Edition',
                    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
                    desc: 'Aksen pita emas royal kebangsaan, latar sekuriti guilloche elegan berbalut lambang negara, bingkai foto keemasan, dan tipografi monarki kedinasan yang mewah dan berwibawa tinggi.',
                    icon: '🦅',
                  },
                  {
                    id: 'cyber_smart_id' as CardTemplateStyle,
                    title: 'Smart Card Elektronik ID & RFID',
                    badge: 'Kartu Pintar ISO-7810',
                    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
                    desc: 'Tampilan smart card futuristik dengan visual Gold EMV Chip, ikon transmisi nirkabel RFID/NFC contactless, indikator sekuriti digital, dan identitas kartu pelajar terintegrasi.',
                    icon: '💳',
                  },
                  {
                    id: 'batik_nusantara' as CardTemplateStyle,
                    title: 'Warisan Nusantara & Ornamen Aceh',
                    badge: 'Karakter Budaya Luhur',
                    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
                    desc: 'Memadukan kebanggaan kearifan lokal dengan ornamen etnik Pintu Aceh & songket nusantara di sudut kartu, pita marun-emas agung, dan stempel jaminan keaslian.',
                    icon: '🏮',
                  },
                  {
                    id: 'minimalis_modern' as CardTemplateStyle,
                    title: 'Metro Studio Minimalis Kontemporer',
                    badge: 'Modern Swiss Typography',
                    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
                    desc: 'Desain ultra-modern yang bersih dan elegan dengan hierarki tipografi tegas, tata letak asimetris kontras tinggi, foto framed tajam, dan QR verifikasi yang menonjol.',
                    icon: '✨',
                  },
                  {
                    id: 'kartu_hijau_islami' as CardTemplateStyle,
                    title: 'Zamrud Islami Serambi Mekkah',
                    badge: 'Khas Pendidikan Aceh',
                    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    desc: 'Nuansa syiar pendidikan Serambi Mekkah dengan sentuhan hijau zamrud menyejukkan, ornamen geometris islami keemasan, dan kop surat berwibawa tinggi.',
                    icon: '🕌',
                  },
                ].map((tmpl) => {
                  const isSelected = settings.templateStyle === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => onUpdateSettings({ ...settings, templateStyle: tmpl.id })}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-base">{tmpl.icon}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tmpl.badgeColor}`}>
                            {tmpl.badge}
                          </span>
                        </div>
                        <h5 className="text-xs font-black text-slate-900 leading-tight">
                          {tmpl.title}
                        </h5>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {tmpl.desc}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-medium">Status:</span>
                        {isSelected ? (
                          <span className="font-bold text-blue-700 flex items-center gap-1">
                            ✓ Sedang Digunakan
                          </span>
                        ) : (
                          <span className="text-slate-600 font-semibold group-hover:text-blue-600">
                            Klik untuk Menggunakan
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template Features Highlights */}
            <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                Keunggulan Template Resmi Kedinasan:
              </h5>
              <ul className="text-xs text-slate-600 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Kop Dinas Resmi:</strong> Format penulisan baku Pemerintah Aceh, Dinas Pendidikan, dan SMA Negeri 1 Julok.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Garis Ganda Kop Surat:</strong> Sesuai kaidah tata naskah dinas kedinasan Indonesia (2px + 0.75px).</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Tabel Identitas Presisi:</strong> Kolom label, titik dua sejajar, dan nilai identitas siswa yang mudah diverifikasi.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span><strong>Pengesahan Resmi:</strong> Jabatan, tanda tangan digital, stempel basah transparan, dan NIP Kepala Sekolah.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 1: Theme & Presets */}
        {activeTab === 'theme' && (
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                Preset Desain Resmi
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'royal_navy', label: 'Biru Navy Resmi', color: '#0f2752', desc: 'Standar Nasional' },
                  { id: 'emerald_aceh', label: 'Hijau Zamrud Aceh', color: '#064e3b', desc: 'Nuansa Serambi Mekkah' },
                  { id: 'maroon_gold', label: 'Marun & Emas', color: '#7f1d1d', desc: 'Elegan Prestasi' },
                  { id: 'cyan_tech', label: 'Biru Digital Modern', color: '#0e7490', desc: 'Smart School Tech' },
                  { id: 'minimal_slate', label: 'Slate Minimalis', color: '#1e293b', desc: 'Monokrom Bersih' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetChange(preset.id as CardThemePreset)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      settings.themePreset === preset.id
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="w-4 h-4 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="text-xs font-bold text-slate-800">{preset.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">{preset.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Overrides */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Penyesuaian Warna Bebas
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Warna Utama (Header/Bar)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => onUpdateSettings({ ...settings, primaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) => onUpdateSettings({ ...settings, primaryColor: e.target.value })}
                      className="text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded px-2 py-1 w-24 text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Warna Gradasi Sekunder
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => onUpdateSettings({ ...settings, secondaryColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) => onUpdateSettings({ ...settings, secondaryColor: e.target.value })}
                      className="text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded px-2 py-1 w-24 text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Warna Aksen / Pita
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) => onUpdateSettings({ ...settings, accentColor: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.accentColor}
                      onChange={(e) => onUpdateSettings({ ...settings, accentColor: e.target.value })}
                      className="text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded px-2 py-1 w-24 text-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Watermark settings */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Watermark Lambang Sekolah</span>
                <span className="text-[11px] text-slate-500">
                  Bayangan logo sekolah transparan di latar belakang kartu
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.02"
                  max="0.25"
                  step="0.01"
                  value={settings.watermarkOpacity}
                  disabled={!settings.showWatermark}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, watermarkOpacity: parseFloat(e.target.value) })
                  }
                  className="w-24 accent-blue-600 cursor-pointer"
                />
                <input
                  type="checkbox"
                  checked={settings.showWatermark}
                  onChange={(e) => onUpdateSettings({ ...settings, showWatermark: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Layout & Format */}
        {activeTab === 'layout' && (
          <div className="space-y-5">
            {/* Template Style Selector */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                Format Template Kartu
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'resmi_kedinasan', label: 'Resmi Kedinasan', desc: 'Standar Kop Dinas & Tabel' },
                  { id: 'smart_card', label: 'Smart Card', desc: 'Chip Emas & Guilloche Sekuriti' },
                  { id: 'classic_kop', label: 'Klasik Kop Pemda', desc: 'Format Tradisional Hitam' },
                  { id: 'canva_modern', label: 'Grafis Modern', desc: 'Gelombang Dinamis Canva' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onUpdateSettings({ ...settings, templateStyle: item.id as any })}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      settings.templateStyle === item.id
                        ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-500/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800 block">{item.label}</span>
                    <span className="text-[10px] text-slate-500">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                Orientasi Kartu
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onUpdateSettings({ ...settings, orientation: 'landscape' })}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer ${
                    settings.orientation === 'landscape'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-9 h-6 border-2 border-slate-600 rounded-sm bg-white" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-800 block">Landscape (Mendatar)</span>
                    <span className="text-[10px] text-slate-500">Ukuran Standar ID-1 ISO 7810</span>
                  </div>
                </button>

                <button
                  onClick={() => onUpdateSettings({ ...settings, orientation: 'portrait' })}
                  className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer ${
                    settings.orientation === 'portrait'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-6 h-9 border-2 border-slate-600 rounded-sm bg-white" />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-800 block">Portrait (Tegak)</span>
                    <span className="text-[10px] text-slate-500">Model Kartu Gantung / Lanyard</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Photo Frame Style */}
            <div className="pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-2">
                Bentuk Bingkai Pas Foto
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'rounded', label: 'Sudut Membulat' },
                  { id: 'square', label: 'Persegi Rata' },
                  { id: 'circle', label: 'Lingkaran (Oval)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      onUpdateSettings({ ...settings, photoBorderRadius: item.id as any })
                    }
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center cursor-pointer ${
                      settings.photoBorderRadius === item.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Hologram badge toggle */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Pita Hologram Keamanan Foto
                </span>
                <span className="text-[11px] text-slate-500">
                  Label keaslian emas di sudut bawah foto siswa
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.showHoloBadge}
                onChange={(e) => onUpdateSettings({ ...settings, showHoloBadge: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
              />
            </div>

            {/* QR Content setting */}
            <div className="pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-1.5">
                Isi Data QR Code
              </label>
              <select
                value={settings.qrContent}
                onChange={(e) => onUpdateSettings({ ...settings, qrContent: e.target.value as any })}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="url">Tautan Verifikasi Keaslian Kartu (Bisa Di-scan & Dibuka di HP)</option>
                <option value="nisn">Nomor NISN Siswa (Teks Standar)</option>
                <option value="nis">Nomor Induk Siswa (NIS Lokal)</option>
                <option value="all_info">Data Lengkap Siswa (JSON)</option>
              </select>
            </div>
          </div>
        )}

        {/* Tab 3: School Kop & Identity */}
        {activeTab === 'school' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Pemerintah / Instansi Atas
                </label>
                <input
                  type="text"
                  value={settings.provinsiText}
                  onChange={(e) => onUpdateSettings({ ...settings, provinsiText: e.target.value })}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Dinas Pendidikan / Cabang Dinas
                </label>
                <input
                  type="text"
                  value={settings.dinasText}
                  onChange={(e) => onUpdateSettings({ ...settings, dinasText: e.target.value })}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Judul Kartu
                </label>
                <input
                  type="text"
                  value={settings.cardTitle}
                  onChange={(e) => onUpdateSettings({ ...settings, cardTitle: e.target.value })}
                  placeholder="KARTU PELAJAR"
                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Nama Sekolah
                </label>
                <input
                  type="text"
                  value={settings.schoolName}
                  onChange={(e) => onUpdateSettings({ ...settings, schoolName: e.target.value })}
                  className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Alamat Sekolah / Desa
              </label>
              <input
                type="text"
                value={settings.schoolAddress}
                onChange={(e) => onUpdateSettings({ ...settings, schoolAddress: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  NPSN Sekolah
                </label>
                <input
                  type="text"
                  value={settings.npsn}
                  onChange={(e) => onUpdateSettings({ ...settings, npsn: e.target.value })}
                  className="w-full text-xs font-mono font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Website Sekolah
                </label>
                <input
                  type="text"
                  value={settings.website}
                  onChange={(e) => onUpdateSettings({ ...settings, website: e.target.value })}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Email Resmi
                </label>
                <input
                  type="text"
                  value={settings.email}
                  onChange={(e) => onUpdateSettings({ ...settings, email: e.target.value })}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>

            {/* Decorative and Badge Toggles */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Logo Merdeka Belajar (Kiri Atas)</span>
                  <span className="text-[10px] text-slate-500">Ikon Tut Wuri & Tulisan Merdeka Belajar</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showMerdekaBelajar}
                  onChange={(e) => onUpdateSettings({ ...settings, showMerdekaBelajar: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Logo Pemerintah Aceh (Kanan Atas)</span>
                  <span className="text-[10px] text-slate-500">Lambang Pancacita Pemerintah Aceh</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showPancasila}
                  onChange={(e) => onUpdateSettings({ ...settings, showPancasila: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Matriks Titik Dekoratif (Dot Matrix)</span>
                  <span className="text-[10px] text-slate-500">Titik cyan di kanan dan titik putih di kiri bawah</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showDotGrids}
                  onChange={(e) => onUpdateSettings({ ...settings, showDotGrids: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Logo Sekolah (Kiri Atas) custom upload */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={settings.schoolLogo}
                  alt="Logo Sekolah"
                  className="w-10 h-10 object-contain p-1 border rounded-lg bg-slate-50 shadow-2xs"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Logo Sekolah (Kiri Atas)</span>
                  <span className="text-[10px] text-slate-500">SMA Negeri 1 Julok (PNG Resmi)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Ganti</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, schoolLogo: SMAN1_JULOK_LOGO_PATH })}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 cursor-pointer"
                  title="Kembalikan ke lambang resmi SMAN 1 Julok"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Logo Pemerintah Aceh (Kanan Atas) custom upload */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={settings.pancasilaLogo}
                  alt="Logo Pemerintah Aceh"
                  className="w-10 h-10 object-contain p-1 border rounded-lg bg-slate-50 shadow-2xs"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Logo Pemerintah Aceh (Kanan Atas)</span>
                  <span className="text-[10px] text-slate-500">Lambang Pancacita (PNG Resmi)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Ganti</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAcehLogoUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, pancasilaLogo: ACEH_GOV_LOGO_PATH })}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 cursor-pointer"
                  title="Kembalikan ke lambang resmi Pemerintah Aceh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Legal & Signature & Stamp */}
        {activeTab === 'legal' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Kota Penerbit
                </label>
                <input
                  type="text"
                  value={settings.kotaPenerbit}
                  onChange={(e) => onUpdateSettings({ ...settings, kotaPenerbit: e.target.value })}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Tanggal Terbit Kartu
                </label>
                <input
                  type="text"
                  value={settings.tanggalTerbit}
                  onChange={(e) => onUpdateSettings({ ...settings, tanggalTerbit: e.target.value })}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Jabatan Penandatangan (Teks di Atas TTD)
              </label>
              <input
                type="text"
                value={settings.kepalaSekolahJabatan || 'Kepala SMA Negeri 1 Julok'}
                onChange={(e) => onUpdateSettings({ ...settings, kepalaSekolahJabatan: e.target.value })}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Nama Kepala Sekolah & Gelar
                </label>
                <input
                  type="text"
                  value={settings.kepalaSekolahNama}
                  onChange={(e) => onUpdateSettings({ ...settings, kepalaSekolahNama: e.target.value })}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  NIP Kepala Sekolah
                </label>
                <input
                  type="text"
                  value={settings.kepalaSekolahNip}
                  onChange={(e) => onUpdateSettings({ ...settings, kepalaSekolahNip: e.target.value })}
                  className="w-full text-xs font-mono font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                />
              </div>
            </div>

            {/* Official Stamp config */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={settings.stempelUrl}
                  alt="Stempel"
                  className="w-10 h-10 object-contain p-1 border rounded-lg bg-slate-50 mix-blend-multiply"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Stempel Dinas Resmi SMAN 1 Julok
                  </span>
                  <span className="text-[10px] text-slate-500">Otomatis menimpa tanda tangan</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Stempel</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleStampUpload}
                    className="hidden"
                  />
                </label>
                <input
                  type="checkbox"
                  checked={settings.showStempel}
                  onChange={(e) => onUpdateSettings({ ...settings, showStempel: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer ml-1"
                />
              </div>
            </div>

            {/* Signature config */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={settings.tandaTanganUrl}
                  alt="TTD"
                  className="w-14 h-8 object-contain p-1 border rounded-lg bg-slate-50"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Tanda Tangan Kepala Sekolah
                  </span>
                  <span className="text-[10px] text-slate-500">Format gambar PNG transparan</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah TTD</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                </label>
                <input
                  type="checkbox"
                  checked={settings.showTandaTangan}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showTandaTangan: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer ml-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Back Side Rules */}
        {activeTab === 'back' && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Judul Bagian Belakang
              </label>
              <input
                type="text"
                value={settings.backTitle}
                onChange={(e) => onUpdateSettings({ ...settings, backTitle: e.target.value })}
                className="w-full text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                Poin Tata Tertib & Ketentuan (Klik untuk mengubah)
              </label>
              <div className="space-y-2">
                {settings.backRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-5 text-right text-xs font-bold text-slate-400">
                      {idx + 1}.
                    </span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => {
                        const newRules = [...settings.backRules];
                        newRules[idx] = e.target.value;
                        onUpdateSettings({ ...settings, backRules: newRules });
                      }}
                      className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Catatan Pengembalian / Kontak Darurat
              </label>
              <input
                type="text"
                value={settings.backFooterNote}
                onChange={(e) => onUpdateSettings({ ...settings, backFooterNote: e.target.value })}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
