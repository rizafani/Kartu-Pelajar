import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  Keyboard,
  CheckCircle2,
  Volume2,
  VolumeX,
  Scan,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { playSuccessChime, playWarningBeep, playErrorBuzz } from '../utils/soundEffects';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcodeText: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
}) => {
  const [activeMode, setActiveMode] = useState<'camera' | 'manual'>('camera');
  const [manualInput, setManualInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraList, setCameraList] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scanCooldown, setScanCooldown] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-scanner-viewport';
  const manualInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize and list cameras when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    setErrorMessage('');
    setScanCooldown(false);

    if (activeMode === 'camera') {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameraList(devices);
            // Default to back/environment camera if available
            const backCam = devices.find((d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('belakang') ||
              d.label.toLowerCase().includes('environment')
            );
            const defaultId = backCam ? backCam.id : devices[0].id;
            setSelectedCameraId(defaultId);
            startCamera(defaultId);
          } else {
            setErrorMessage('Tidak ada kamera yang terdeteksi di perangkat ini.');
            setActiveMode('manual');
          }
        })
        .catch((err) => {
          console.warn('Camera access error:', err);
          setErrorMessage(
            'Izin kamera tidak diberikan atau diblokir oleh browser. Anda dapat menggunakan mode input barcode manual di bawah.'
          );
          setActiveMode('manual');
        });
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Focus manual input when manual mode is selected
  useEffect(() => {
    if (activeMode === 'manual' && isOpen) {
      setTimeout(() => manualInputRef.current?.focus(), 150);
    }
  }, [activeMode, isOpen]);

  const startCamera = async (cameraId: string) => {
    try {
      setErrorMessage('');
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.ITF,
        ],
        verbose: false,
      });

      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 15,
          qrbox: { width: 280, height: 200 },
          aspectRatio: 1.333,
        },
        (decodedText) => {
          handleSuccessfulScan(decodedText);
        },
        () => {
          // Frame error (normal during scanning frames without barcode)
        }
      );

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      setIsCameraActive(false);
      setErrorMessage(
        'Gagal mengakses kamera: ' + (err.message || 'Izin kamera ditolak atau kamera sedang digunakan aplikasi lain.')
      );
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Stop camera notice:', err);
      } finally {
        html5QrCodeRef.current = null;
        setIsCameraActive(false);
      }
    }
  };

  const handleSuccessfulScan = (code: string) => {
    if (scanCooldown) return;
    setScanCooldown(true);

    if (soundEnabled) {
      playSuccessChime();
    }

    onBarcodeDetected(code);

    // Cooldown to prevent duplicate triggers
    setTimeout(() => {
      setScanCooldown(false);
    }, 2500);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    if (soundEnabled) {
      playSuccessChime();
    }
    onBarcodeDetected(manualInput.trim());
    setManualInput('');
  };

  const handleSwitchCamera = (newCamId: string) => {
    setSelectedCameraId(newCamId);
    startCamera(newCamId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Pemindai Barcode Presensi
              </h2>
              <p className="text-xs text-slate-400">
                Pindai Barcode / QR Code NISN pada Kartu Pelajar Siswa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
              title={soundEnabled ? 'Suara Beep Aktif' : 'Suara Beep Nonaktif'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Toggle: Camera vs Manual Input / USB Scanner */}
        <div className="px-6 pt-4 pb-2 bg-slate-950/40 border-b border-white/5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveMode('camera');
              if (selectedCameraId) startCamera(selectedCameraId);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'camera'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Kamera Barcode</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('manual');
              stopCamera();
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeMode === 'manual'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Input Manual / Scanner USB</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {activeMode === 'camera' ? (
            <div className="space-y-4">
              {/* Camera Selector */}
              {cameraList.length > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-400 bg-white/5 px-3 py-2 rounded-xl">
                  <span>Pilih Kamera:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleSwitchCamera(e.target.value)}
                    className="bg-slate-800 text-white text-xs rounded-lg px-2 py-1 border border-white/10 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {cameraList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || `Kamera ${c.id.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Viewport Box */}
              <div className="relative rounded-2xl overflow-hidden bg-black border-2 border-slate-700 aspect-4/3 flex items-center justify-center">
                <div id={scannerContainerId} className="w-full h-full overflow-hidden" />

                {/* Laser scan animation overlay */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* Targeting Box */}
                    <div className="relative w-64 h-40 border-2 border-blue-400/80 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center overflow-hidden">
                      {/* Corner Target Accents */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-400" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-400" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-400" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-400" />

                      {/* Moving Red/Cyan Laser Beam */}
                      <div className="w-full h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-bounce duration-1000" />
                    </div>

                    <span className="mt-3 px-3 py-1 bg-slate-950/80 text-white text-[11px] font-medium rounded-full backdrop-blur-sm border border-white/10">
                      Arahkan barcode / QR kartu siswa ke dalam kotak
                    </span>
                  </div>
                )}

                {scanCooldown && (
                  <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-400 gap-2 animate-fade-in">
                    <CheckCircle2 className="w-12 h-12 animate-scale-up" />
                    <span className="text-sm font-bold">Barcode Terbaca! Memproses...</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Manual / USB Scanner Input Mode */
            <div className="space-y-4 py-2">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                  <Keyboard className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Mode Scanner USB / Ketik NISN</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Gunakan perangkat barcode scanner laser (USB/Bluetooth) atau ketik langsung nomor NISN siswa lalu tekan <strong>Enter</strong>.
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    ref={manualInputRef}
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Contoh NISN: 0078129301..."
                    className="w-full px-4 py-3.5 bg-slate-800/80 border-2 border-blue-500/50 rounded-2xl text-base font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-400 transition-all text-center tracking-wider"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!manualInput.trim()}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Catat Kehadiran Siswa</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3.5 bg-slate-950/60 border-t border-white/10 text-center text-[11px] text-slate-400 flex items-center justify-between">
          <span>Format didukung: Code 128, QR Code, Code 39, EAN</span>
          <span className="font-semibold text-emerald-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Terhubung Database SMAN 1 Julok
          </span>
        </div>
      </div>
    </div>
  );
};
