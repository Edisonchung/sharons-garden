import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { Button } from './ui/button';

export default function BloomShareCard({ flower, onClose }) {
  const cardRef = useRef();

  const handleDownload = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current);
    const link = document.createElement('a');
    link.download = `bloom-${flower.id || 'flower'}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (!flower) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center px-4">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl text-center max-w-sm w-full relative">
        <div
          ref={cardRef}
          className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 text-center"
        >
          <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-2">
            🌸 My Bloom in Sharon’s Garden
          </h2>
          <p className="text-3xl mb-1">
            {flower.bloomedFlower || '🌼'} {flower.type}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 italic">
            {flower.name || 'Anonymous'} • {flower.color}
          </p>
          <p className="text-xs text-gray-400 mb-2">
            Bloomed:{' '}
            {new Date(
              flower.bloomTime?.toDate?.() || flower.bloomTime
            ).toLocaleDateString()}
          </p>
          {flower.photo && (
            <img
              src={flower.photo}
              alt="Bloom"
              className="w-full rounded mb-2 max-h-48 object-contain shadow"
            />
          )}
          {flower.reflection && (
            <p className="text-sm text-purple-800 dark:text-purple-200 mt-2">
              “{flower.reflection}”
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={handleDownload}>📥 Download as Image</Button>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
