import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Dialog } from '@headlessui/react';
import { formatDistanceToNow } from 'date-fns';

export default function WateringHistoryModal({ seedId, isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !seedId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'waterings'),
          where('seedId', '==', seedId),
          orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistory(items);
      } catch (err) {
        console.error('Failed to fetch watering history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen, seedId]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
          <Dialog.Title className="text-lg font-bold text-purple-700 dark:text-white mb-4">
            💧 Watering History
          </Dialog.Title>

          {loading ? (
            <p className="text-center text-gray-500">Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-center text-gray-500">No watering history yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {history.map((h) => (
                <li key={h.id} className="py-2 text-sm">
                  <span className="font-medium text-purple-600 dark:text-purple-300">{h.fromUsername || 'Anonymous'}</span>{' '}
                  watered this seed{' '}
                  <span className="text-gray-600 dark:text-gray-400">
                    {formatDistanceToNow(h.timestamp?.toDate?.(), { addSuffix: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 text-right">
            <button
              onClick={onClose}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
