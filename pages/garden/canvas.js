// pages/garden/canvas.js
import { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc
} from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function CanvasGarden() {
  const [user, setUser] = useState(null);
  const [flowers, setFlowers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const q = query(
            collection(db, 'flowers'),
            where('userId', '==', currentUser.uid)
          );
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFlowers(data);
        } catch (err) {
          console.error(err);
          toast.error('Failed to load flowers.');
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setFlowers([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleWater = async (flower) => {
    if (flower.waterCount >= 7 || !user) return;
    try {
      const newCount = flower.waterCount + 1;
      const bloomed = newCount >= 7;
      const updated = {
        ...flower,
        waterCount: newCount,
        bloomed,
        bloomedFlower: bloomed ? (flower.bloomedFlower || '🌸') : null
      };
      const ref = doc(db, 'flowers', flower.id);
      await updateDoc(ref, updated);
      setFlowers(prev => prev.map(f => f.id === flower.id ? updated : f));
      toast.success(bloomed ? 'Your flower bloomed! 🌸' : 'Watered!');
    } catch (err) {
      toast.error('Failed to water.');
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-pink-100 to-purple-200 dark:from-gray-900 dark:to-black">
      <h1 className="text-center text-3xl font-bold text-purple-700 dark:text-purple-300 mb-6">
        🌸 Garden Canvas View
      </h1>

      {loading ? (
        <p className="text-center text-gray-600 dark:text-gray-400">Loading flowers...</p>
      ) : (
        <div className="garden-grid">
          {flowers.map((flower) => (
            <div
              key={flower.id}
              className="flower-tile"
              onClick={() => setSelected(flower)}
              title={flower.type}
            >
              <span className="flower-sprite">
                {flower.bloomed ? (flower.bloomedFlower || '🌼') : '🌱'}
              </span>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-purple-600">{selected.bloomed ? `${selected.bloomedFlower} ${selected.type}` : '🌱 Seedling'}</h2>
            <p className="text-sm text-gray-600">Name: {selected.name || 'Anonymous'}</p>
            <p className="text-sm text-gray-500">Note: {selected.note || 'No note'}</p>
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
    </div>
  );
}
