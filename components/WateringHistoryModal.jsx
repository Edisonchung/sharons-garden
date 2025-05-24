import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from './ui/button';
import { formatDistanceToNow, format } from 'date-fns';

export default function WateringHistoryModal({ seedId, onClose }) {
  const [groupedHistory, setGroupedHistory] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWateringHistory = async () => {
      if (!seedId) return;
      try {
        const q = query(
          collection(db, 'waterings'),
          where('seedId', '==', seedId),
          orderBy('wateredAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => doc.data());

        const grouped = results.reduce((acc, item) => {
          const day = format(new Date(item.wateredAt), 'PPP');
          if (!acc[day]) acc[day] = [];
          acc[day].push(item);
          return acc;
        }, {});

        setGroupedHistory(grouped);
      } catch (err) {
        console.error('Failed to fetch watering history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWateringHistory();
  }, [seedId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold text-purple-700 dark:text-purple-300 mb-4">
          💧 Watering History
        </h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : Object.keys(groupedHistory).length === 0 ? (
          <p className="text-gray-500 italic">No one has watered this seed yet.</p>
        ) : (
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {Object.entries(groupedHistory).map(([date, entries]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{date}</h3>
                <ul className="space-y-2">
                  {entries.map((entry, index) => (
                    <li key={index} className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                      {entry.photoURL ? (
                        <img src={entry.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm">
                          {entry.userName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          <strong>{entry.userName || 'Anonymous'}</strong> watered this
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(entry.wateredAt), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>
      </div>
    </div>
  );
}
