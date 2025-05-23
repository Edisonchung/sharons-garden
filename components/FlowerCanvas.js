// components/FlowerCanvas.js
import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export default function FlowerCanvas({ flowers = [], refresh }) {
  const [selected, setSelected] = useState(null);

  const handleWater = async (flower) => {
    if (!flower || flower.waterCount >= 7) return;
    const newCount = flower.waterCount + 1;
    const bloomed = newCount >= 7;
    const updateData = {
      waterCount: newCount,
      bloomed,
      bloomedFlower: bloomed ? (flower.bloomedFlower || '🌸') : null,
    };

    try {
      const flowerRef = doc(db, 'flowers', flower.id);
      await updateDoc(flowerRef, updateData);
      toast.success(bloomed ? '🎉 It bloomed!' : '💧 Watered!');
      if (refresh) refresh();
      setSelected(null);
    } catch (err) {
      toast.error('Failed to water the flower.');
      console.error(err);
    }
  };

  return (
    <div className="mt-6">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 justify-center">
        {flowers.map((flower) => (
          <div
            key={flower.id}
            className="flex items-center justify-center w-16 h-16 rounded-lg shadow-md bg-white dark:bg-gray-800 hover:scale-105 transition transform cursor-pointer"
            title={flower.note || `${flower.type} ${flower.color}`}
            onClick={() => setSelected(flower)}
          >
            <span className="text-2xl">
              {flower.bloomed ? (flower.bloomedFlower || '🌸') : '🌱'}
            </span>
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-xl max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-purple-600 dark:text-purple-300 mb-2">
              {selected.bloomed ? `${selected.bloomedFlower || '🌸'} ${selected.type}` : '🌱 Seedling'}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">Color: {selected.color}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Note: {selected.note || 'No note added'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Watered {selected.waterCount} / 7 times</p>

            {!selected.bloomed && (
              <button
                onClick={() => handleWater(selected)}
                className="mt-2 px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
              >
                Water this Seed 💧
              </button>
            )}

            <button
              onClick={() => setSelected(null)}
              className="mt-3 px-4 py-2 text-sm text-purple-500 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
