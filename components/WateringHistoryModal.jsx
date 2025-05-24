// components/WateringHistoryModal.jsx
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { Dialog } from '@headlessui/react';
import { Button } from './ui/button';

export default function WateringHistoryModal({ seedId, onClose }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWaterings = async () => {
      try {
        const q = query(
          collection(db, 'waterings'),
          where('seedId', '==', seedId),
          orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => doc.data());
        setEntries(data);
      } catch (err) {
        console.error('Failed to fetch waterings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWaterings();
  }, [seedId]);

  return (
    <Dialog open={true} onClose={onClose} className="fixed z-50 inset-0 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl max-w-md w-full shadow-xl">
        <Dialog.Title className="text-lg font-semibold mb-4">💧 Watering History</Dialog.Title>
        {loading ? (
          <p>Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-gray-500 italic">No watering history yet.</p>
        ) : (
          <ul className="divide-y divide-gray-300 dark:divide-gray-700">
            {entries.map((entry, index) => (
              <li key={index} className="py-2 flex items-center gap-3">
                {entry.helperPhoto && (
                  <img src={entry.helperPhoto} alt="avatar" className="w-8 h-8 rounded-full" />
                )}
                <div>
                  <p className="text-sm">
                    <strong>{entry.helperName || 'Anonymous'}</strong> watered this seed
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.timestamp?.toDate?.() || entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 text-right">
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>
      </div>
    </Dialog>
  );
}
