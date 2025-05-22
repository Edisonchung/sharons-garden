// components/ShareQRModal.js
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import InstagramStoryLayout from './InstagramStoryLayout';

export default function ShareQRModal({ url, flower, onClose }) {
  const canvasRef = useRef(null);
  const [showStory, setShowStory] = useState(false);
  const qrRef = useRef(null);

  useEffect(() => {
    if (qrRef.current && !showStory) {
      QRCode.toCanvas(qrRef.current, url, { width: 200 }, err => {
        if (err) console.error(err);
      });
    }
  }, [url, showStory]);

  const handleStoryDownload = async () => {
    const storyElement = document.getElementById('story-preview');
    const canvas = await html2canvas(storyElement);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'sharon-story.png';
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-xl text-center relative w-[300px]">
        <h3 className="text-lg font-semibold mb-2">📲 Share</h3>

        <div className="flex justify-center gap-2 mb-3">
          <button
            onClick={() => setShowStory(false)}
            className={`px-2 py-1 text-sm border rounded ${!showStory ? 'bg-purple-100' : 'bg-white'}`}
          >
            QR
          </button>
          <button
            onClick={() => setShowStory(true)}
            className={`px-2 py-1 text-sm border rounded ${showStory ? 'bg-purple-100' : 'bg-white'}`}
          >
            IG Story
          </button>
        </div>

        {!showStory ? (
          <>
            <canvas ref={qrRef} className="mx-auto" />
            <p className="text-xs mt-2 break-all text-gray-600">{url}</p>
          </>
        ) : (
          <div className="w-[180px] h-[320px] overflow-hidden border border-gray-200 rounded shadow-sm" id="story-preview">
            <InstagramStoryLayout flower={flower} />
          </div>
        )}

        {showStory && (
          <button
            onClick={handleStoryDownload}
            className="text-xs mt-3 inline-block text-blue-600 underline hover:text-blue-800"
          >
            📷 Download Story Image
          </button>
        )}

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
