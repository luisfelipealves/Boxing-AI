import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let animationFrameId: number;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } 
        });
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", "true"); // required to tell iOS safari we don't want fullscreen
          await video.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Error accessing camera", err);
        setError("Camera permission denied or unavailable.");
      }
    };

    const tick = () => {
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            onScan(code.data);
            return; // Stop scanning loop once found
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (video && video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center">
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 text-white p-2 rounded-full bg-gray-800 hover:bg-gray-700"
      >
        <X size={24} />
      </button>
      
      <div className="w-full max-w-md px-4 flex flex-col items-center">
        <h2 className="text-white text-xl font-semibold mb-4">Scan Box QR Code</h2>
        {error ? (
          <div className="text-red-400 bg-red-900/30 p-4 rounded-lg text-center">
            {error}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl border-2 border-indigo-500 shadow-2xl shadow-indigo-500/20">
            <video ref={videoRef} className="w-full h-auto object-cover" muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-white/30 rounded-xl pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-indigo-400 rounded-lg bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none animate-pulse"></div>
          </div>
        )}
        <p className="text-gray-400 mt-6 text-sm text-center">
          Point your camera at the BoxTrack QR label.
        </p>
      </div>
    </div>
  );
};
