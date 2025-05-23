// components/FlowerCanvas.js
import React, { useState } from 'react';

export default function FlowerCanvas({ flowers = [] }) {
  const [selected, setSelected] = useState(null);

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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-lg max-w-xs text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-2">
              {selected.bloomed ? `${selected.bloomedFlower} ${selected.type}` : '🌱 Seedling'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Color: {selected.color}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Note: {selected.note || 'No note'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Watered {selected.waterCount} / 7 times</p>
            <button
              onClick={() => setSelected(null)}
              className="mt-4 px-4 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
