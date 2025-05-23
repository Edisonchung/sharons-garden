// components/FlowerCanvas.js
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import '../styles/FlowerCanvas.css';

export default function FlowerCanvas({ flowers = [] }) {
  const [selected, setSelected] = useState(null);

  const handleWater = async (flower) => {
    if (flower.waterCount >= 7) return;

    try {
      const newCount = flower.waterCount + 1;
      const bloomed = newCount >= 7;
      const updated = {
        ...flower,
        waterCount: newCount,
        bloomed,
        bloomedFlower: bloomed ? flower.bloomedFlower || '🌸' : null,
      };

      const ref = doc(db, 'flowers', flower.id);
      await updateDoc(ref, updated);

      toast.success(bloomed ? 'Your flower bloomed! 🌸' : 'Watered!');
      setSelected({ ...flower, ...updated });
    } catch (err) {
      console.error(err);
      toast.error('Failed to water.');
    }
  };

  return (
    <>
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
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-purple-600 mb-2">
              {selected.bloomed ? `${selected.bloomedFlower} ${selected.type}` : '🌱 Seedling'}
            </h2>
            <p className="text-sm text-gray-600 mb-1">Name: {selected.name || 'Anonymous'}</p>
            <p className="text-sm text-gray-500 mb-1">Note: {selected.note || 'No note'}</p>
            <p className="text-xs text-gray-400">Watered {selected.waterCount} / 7 times</p>

            {!selected.bloomed && (
              <button
                onClick={() => handleWater(selected)}
                className="mt-4 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
              >
                Water this Seed 💧
              </button>
            )}
            <button
              onClick={() => setSelected(null)}
              className="mt-2 text-sm text-purple-500 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
