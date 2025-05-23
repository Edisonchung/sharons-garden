// components/FlowerCanvas.js
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import './FlowerCanvas.css';

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
        bloomedFlower: bloomed ? (flower.bloomedFlower || '🌸') : null
      };
      await updateDoc(doc(db, 'flowers', flower.id), updated);
      toast.success(bloomed ? 'Your flower bloomed! 🌼' : 'Watered!');
      setSelected({ ...flower, ...updated });
    } catch (err) {
      console.error(err);
      toast.error('Failed to water flower.');
    }
  };

  return (
    <div className="flower-canvas">
      <div className="flower-grid">
        {flowers.map((flower) => (
          <div
            key={flower.id}
            className="flower-tile"
            onClick={() => setSelected(flower)}
            title={`${flower.type} (${flower.color})`}
          >
            <span className="flower-icon">
              {flower.bloomed ? (flower.bloomedFlower || '🌸') : '🌱'}
            </span>
          </div>
        ))}
      </div>

      {selected && (
        <div className="flower-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="flower-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selected.bloomed ? `${selected.bloomedFlower} ${selected.type}` : '🌱 Seedling'}</h2>
            <p><strong>Name:</strong> {selected.name || 'Anonymous'}</p>
            <p><strong>Note:</strong> {selected.note || 'No note'}</p>
            <p><strong>Color:</strong> {selected.color}</p>
            <p><strong>Watered:</strong> {selected.waterCount} / 7</p>
            {!selected.bloomed && (
              <button onClick={() => handleWater(selected)} className="water-btn">
                Water this Seed 💧
              </button>
            )}
            <button onClick={() => setSelected(null)} className="close-btn">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
