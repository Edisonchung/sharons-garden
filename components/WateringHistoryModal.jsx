import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Dialog } from '@headlessui/react';
import { Button } from './ui/button';

export default function WateringHistoryModal({ seedId, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, 'waterings'),
          where('seedId', '==', seedId),
          orderBy('timestamp', 'desc')
        );
        const snap = await getDocs(q);
        const records = snap.docs.map(doc => doc.data());
        setHistory(records);
      } catch (err) {
        console.error('Failed to load watering history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [seedId]);

  return (
    <Dialog open={true} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Panel className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 w-full max-w-md">
          <Dialog.Title className="text-xl font-bold text-purple-700 mb-4">
            💧 Watering History
          </Dialog.Title>
          {loading ? (
            <p>Loading...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-500">No one has watered this seed yet.</p>
          ) : (
            <ul className="text-sm text-gray-700 dark:text-gray-300 max-h-80 overflow-y-auto space-y-2">
              {history.map((record, i) => (
                <li key={i} className="flex justify-between border-b pb-1">
                  <span>{record.who}</span>
                  <span>{new Date(record.timestamp?.toDate?.()).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 text-center">
            <Button onClick={onClose} variant="outline">Close</Button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
