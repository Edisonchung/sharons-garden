import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { Button } from './ui/button';

export default function BloomCelebrationPopup({ flower, onClose }) {
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timeout);
  }, []);

  if (!flower) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center">
      {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} />}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-xl text-center max-w-sm w-full">
        <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-2">
          🌸 Your flower has bloomed!
        </h2>
        <p className="text-lg mb-2">{flower.bloomedFlower || '🌼'} {flower.type}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          This flower has reached full bloom. Great job caring for it!
        </p>
        <Button onClick={onClose}>🌟 Reflect & Close</Button>
      </div>
    </div>
  );
}
