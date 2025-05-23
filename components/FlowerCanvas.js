// components/FlowerCanvas.js
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function FlowerCanvas({ flowers = [] }) {
  const [selected, setSelected] = useState(null);

  const handleWater = async (flower) => {
    if (!flower || flower.bloomed || flower.waterCount >= 7) return;
    try {
      const updatedCount = flower.waterCount + 1;
      const bloomed = updatedCount >= 7;
      const updated = {
        waterCount: updatedCount,
        bloomed,
        bloomedFlower: bloomed ? (flower.bloomedFlower || '🌸') : null
      };
      const ref = doc(db, 'flowers', flower.id);
      await updateDoc(ref, updated);
      toast.success(bloomed ? 'Your flower bloomed! 🌸' : 'Watered successfully');
      setSelected(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to water this flower.');
    }
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 justify-center mt-6">
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
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-2">
              {selected.bloomed ? `${selected.bloomedFlower} ${selected.type}` : '🌱 Seedling'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Name: {selected.name || 'Anonymous'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Note: {selected.note || 'No note'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Watered {selected.waterCount} / 7 times</p>
            {!selected.bloomed && (
              <button
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded mb-2"
                onClick={() => handleWater(selected)}
              >
                Water this Seed 💧
              </button>
            )}
            <button
              onClick={() => setSelected(null)}
              className="text-sm text-purple-600 dark:text-purple-300 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
