import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertTriangle, Upload, SwitchCamera } from 'lucide-react';
import { Student } from '../types';
import { optimizeStudentPhoto } from '../utils/imageCompressor';

interface WebcamModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onPhotoCaptured: (student: Student, photoDataUrl: string) => void;
}

export const WebcamModal: React.FC<WebcamModalProps> = ({
  isOpen,
  student,
  onClose,
  onPhotoCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      loadDevices();
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, capturedPhoto, selectedDeviceId]);

  const loadDevices = async () => {
    try {
      if (navigator?.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
      }
    } catch {
      // ignore
    }
  };

  const startCamera = async () => {
    setErrorMsg('');
    setIsPermissionDenied(false);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setErrorMsg('Perangkat atau browser ini tidak mendukung akses kamera secara langsung.');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access request error:', err);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.toLowerCase()?.includes('permission denied') ||
        err?.message?.toLowerCase()?.includes('not allowed');

      setIsPermissionDenied(isDenied);
      if (isDenied) {
        setErrorMsg(
          'Izin akses kamera belum diizinkan oleh browser atau dibatasi oleh sistem. Anda dapat mengizinkan kamera atau langsung menggunakan opsi Upload File Manual.'
        );
      } else {
        setErrorMsg(
          'Kamera tidak terdeteksi atau sedang aktif di aplikasi lain. Anda dapat mencoba kembali atau langsung mengunggah file foto dari komputer.'
        );
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      try {
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      setStream(null);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    // Standard 3:4 portrait photo crop
    const targetWidth = 360;
    const targetHeight = 480;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate center crop from video dimensions
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    const videoAspect = videoWidth / videoHeight;
    const targetAspect = targetWidth / targetHeight;

    let sx = 0,
      sy = 0,
      sWidth = videoWidth,
      sHeight = videoHeight;
    if (videoAspect > targetAspect) {
      sWidth = videoHeight * targetAspect;
      sx = (videoWidth - sWidth) / 2;
    } else {
      sHeight = videoWidth / targetAspect;
      sy = (videoHeight - sHeight) / 2;
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const optimized = await optimizeStudentPhoto(file);
        setCapturedPhoto(optimized);
        stopCamera();
      } catch (err) {
        console.error('Gagal mengoptimasi foto:', err);
        const reader = new FileReader();
        reader.onload = () => {
          setCapturedPhoto(reader.result as string);
          stopCamera();
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (student && capturedPhoto) {
      onPhotoCaptured(student, capturedPhoto);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedPhoto(null);
    setErrorMsg('');
    onClose();
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Camera Web Cam - Pas Foto Siswa</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {student.nama} • NIS: <strong className="text-slate-900 font-mono">{student.nis}</strong>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Switcher if multiple webcams */}
        {availableDevices.length > 1 && !capturedPhoto && (
          <div className="w-full mb-3 flex items-center justify-end gap-1.5 text-xs">
            <SwitchCamera className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
            >
              {availableDevices.map((d, idx) => (
                <option key={d.deviceId || idx} value={d.deviceId}>
                  {d.label || `Kamera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Video / Photo Preview with Guide Frame */}
        <div className="relative w-64 h-84 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border-2 border-slate-300 shadow-inner">
          {errorMsg ? (
            <div className="p-4 text-center text-slate-300 text-xs flex flex-col items-center justify-center h-full gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/20 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <p className="leading-relaxed px-1 text-[11px] text-slate-200">{errorMsg}</p>

              {/* Direct Fallback Buttons */}
              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File Manual dari Komputer</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Coba Akses Kamera Lagi</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : capturedPhoto ? (
            <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
              {/* Passport Guide Oval */}
              <div className="absolute inset-0 pointer-events-none border-2 border-white/40 border-dashed rounded-lg m-3 flex flex-col items-center justify-center">
                <div className="w-40 h-54 border-2 border-amber-300/80 rounded-full shadow-xs" />
                <span className="text-[10px] text-amber-200 font-semibold mt-2 drop-shadow bg-black/40 px-2 py-0.5 rounded">
                  Posisikan wajah di dalam lingkaran
                </span>
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col items-center gap-3 mt-4">
          {capturedPhoto ? (
            <div className="flex items-center gap-3 w-full justify-center">
              <button
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Foto Ulang</span>
              </button>

              <button
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Gunakan Foto Ini</span>
              </button>
            </div>
          ) : !errorMsg ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCapture}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Jepret Foto Sekarang</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-3 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                title="Atau pilih file dari komputer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih File</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
