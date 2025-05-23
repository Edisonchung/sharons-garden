// components/FlowerCanvas.js
import React from 'react';

export default function FlowerCanvas({ flowers = [] }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 justify-center mt-6">
      {flowers.map((flower) => (
        <div
          key={flower.id}
          className="flex items-center justify-center w-16 h-16 rounded-lg shadow-md bg-white dark:bg-gray-800 hover:scale-105 transition transform cursor-pointer"
          title={flower.note || `${flower.type} ${flower.color}`}
        >
          <span className="text-2xl">
            {flower.bloomed ? (flower.bloomedFlower || '🌸') : '🌱'}
          </span>
        </div>
      ))}
    </div>
  );
}
