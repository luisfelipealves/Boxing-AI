import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        video.srcObject = stream;
        // Required for iOS Safari
        video.setAttribute('playsinline', 'true'); 
        await video.play();
        requestAnimationFrame(tick);
      } catch (err) {
        setError('Camera access denied or unavailable. Please ensure you have granted camera permissions.');
        console.error("Camera error:", err);
      }
    };

    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            // Found a QR code
            onScan(code.data);
            return; // Stop scanning loop
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      const stream = video.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm text-white absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-2">
          <Camera size={20} />
          <span className="font-semibold">Scan QR Code</span>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {error ? (
          <div className="text-white p-6 text-center max-w-xs">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
              <X size={24} />
            </div>
            <p className="text-red-400 font-medium mb-2">Camera Error</p>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="hidden" />
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
            
            {/* Overlay Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-xl -mb-1 -mr-1"></div>
              </div>
            </div>

            <p className="absolute bottom-24 text-white bg-black/60 backdrop-blur-md px-6 py-2 rounded-full text-sm font-medium border border-white/10">
              Point camera at a box QR code
            </p>
          </>
        )}
      </div>
    </div>
  );
};