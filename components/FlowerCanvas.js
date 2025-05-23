// components/FlowerCanvas.js
import React, { useEffect, useState } from 'react';

export default function FlowerCanvas({ flowers = [] }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true); // ensure client-only rendering
  }, []);

  if (!isClient) return null; // avoid rendering on server

  return (
    <div
      className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 justify-center mt-6"
      role="list"
      aria-label="User's planted flowers"
    >
      {flowers.map((flower) => (
        <div
          key={flower.id}
          role="listitem"
          className="flex items-center justify-center w-16 h-16 rounded-lg shadow-md bg-white dark:bg-gray-800 hover:scale-105 transition transform cursor-pointer"
          title={flower.note || `${flower.type} ${flower.color}`}
        >
          <span
            className="text-2xl"
            aria-label={
              flower.bloomed
                ? `${flower.bloomedFlower || 'Bloomed Flower'} (${flower.type})`
                : `Seedling (${flower.type})`
            }
          >
            {flower.bloomed ? (flower.bloomedFlower || '🌸') : '🌱'}
          </span>
        </div>
      ))}
    </div>
  );
}
