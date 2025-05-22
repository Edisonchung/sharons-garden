// components/ShareQRModal.js
import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function ShareQRModal({ url, onClose }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, { width: 200 }, err => {
        if (err) console.error(err);
      });
    }
  }, [url]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-xl text-center relative w-[260px]">
        <h3 className="text-lg font-semibold mb-2">📱 Share this via QR</h3>
        <canvas ref={canvasRef} className="mx-auto" />
        <p className="text-sm mt-3 break-all text-gray-600">{url}</p>
        <button
          onClick={onClose}
          className="absolute top-1 right-2 text-sm text-gray-500 hover:text-black"
        >
          ✖
        </button>
      </div>
    </div>
  );
}
