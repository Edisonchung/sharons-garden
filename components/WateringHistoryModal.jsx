import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
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
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 py-6">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="relative z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <Dialog.Title className="text-lg font-bold text-purple-700 dark:text-white mb-4">
                💧 Watering History
              </Dialog.Title>

              {loading ? (
                <p className="text-center text-gray-500">Loading...</p>
              ) : history.length === 0 ? (
                <p className="text-center text-gray-500">No watering history yet.</p>
              ) : (
                <ul className="max-h-64 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 pr-2">
                  {history.map((h) => {
                    const wateredBy = h.fromUsername || 'Someone';
                    const when = h.timestamp?.toDate?.();
                    return (
                      <li key={h.id} className="py-2 text-sm">
                        <span className="font-medium text-purple-600 dark:text-purple-300">{wateredBy}</span>{' '}
                        watered this seed{' '}
                        <span className="text-gray-600 dark:text-gray-400">
                          {when ? formatDistanceToNow(when, { addSuffix: true }) : 'some time ago'}
                        </span>
                      </li>
                    );
                  })}
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
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
