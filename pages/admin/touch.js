
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function AdminTouchPage() {
  const [flowers, setFlowers] = useState([]);
  const [selectedFlowerId, setSelectedFlowerId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUntouchedFlowers = async () => {
      try {
        const flowerQuery = query(collection(db, 'flowers'), where('touchedBySharon', '==', null));
        const snap = await getDocs(flowerQuery);
        const flowerList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFlowers(flowerList);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load flowers:', err);
        toast.error('Failed to fetch flowers');
      }
    };

    fetchUntouchedFlowers();
  }, []);

  const handleTouch = async () => {
    if (!selectedFlowerId) {
      toast.error('Please select a flower.');
      return;
    }

    setSubmitting(true);
    try {
      const flowerRef = doc(db, 'flowers', selectedFlowerId);
      await updateDoc(flowerRef, {
        touchedBySharon: {
          message: message || "With love, Sharon 💜",
          touchedAt: new Date()
        }
      });
      toast.success('🌸 Flower has been touched by Sharon!');
      setFlowers(flowers.filter(f => f.id !== selectedFlowerId));
      setSelectedFlowerId('');
      setMessage('');
    } catch (err) {
      console.error('Failed to touch flower:', err);
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 to-pink-100">
      <h1 className="text-2xl font-bold text-purple-700 mb-4 text-center">💜 Sharon’s Touch Panel</h1>

      {loading ? (
        <p className="text-center text-gray-500">Loading flowers...</p>
      ) : (
        <>
          <div className="max-w-xl mx-auto mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">Select a Flower</label>
            <select
              value={selectedFlowerId}
              onChange={(e) => setSelectedFlowerId(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">-- Choose --</option>
              {flowers.map((flower) => (
                <option key={flower.id} value={flower.id}>
                  {flower.name || 'Unnamed'} – {flower.type} ({flower.color})
                </option>
              ))}
            </select>
          </div>

          <div className="max-w-xl mx-auto mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">Message from Sharon</label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Keep blooming 💜 – Sharon"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="max-w-xl mx-auto">
            <button
              onClick={handleTouch}
              disabled={submitting}
              className="w-full py-2 px-4 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting ? 'Touching...' : '🌸 Bless This Flower'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
