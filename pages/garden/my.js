import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function MyGarden() {
  const [user, setUser] = useState(null);
  const [flowers, setFlowers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🌿 Water reminder
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    const reminderKey = 'lastWaterReminder';
    const last = localStorage.getItem(reminderKey);
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!last || now - new Date(last) > oneDay) {
      if (Notification.permission === 'granted') {
        new Notification('💧 Time to water your seeds in Sharon’s Garden!');
        localStorage.setItem(reminderKey, now.toISOString());
      }
    }
  }, []);

  // 🧑‍🌾 Load flowers from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const flowerQuery = query(
            collection(db, 'flowers'),
            where('userId', '==', currentUser.uid)
          );
          const snapshot = await getDocs(flowerQuery);
          const userFlowers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setFlowers(userFlowers);
        } catch (err) {
          console.error(err);
          toast.error('Failed to load your garden.');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 dark:from-gray-900 dark:to-black p-6">
      <h1 className="text-3xl font-bold text-center text-purple-700 dark:text-purple-300 mb-6">
        🌿 My Garden
      </h1>

      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Loading your flowers...</p>
      ) : flowers.length === 0 ? (
        <div className="max-w-lg mx-auto">
          <Card className="bg-white dark:bg-gray-800 p-6 text-center">
            <CardContent>
              <h2 className="text-xl font-semibold mb-2 text-gray-800 dark:text-white">
                Nothing here yet 🌱
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Plant your first seed to see it grow here!
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {flowers.map(flower => (
            <Card key={flower.id} className="bg-white dark:bg-gray-800 p-4">
              <CardContent>
                <h3 className="text-lg font-bold text-purple-600 dark:text-purple-300">
                  {flower.bloomed ? `${flower.bloomedFlower} ${flower.type}` : '🌱 Seedling'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Color: {flower.color}
                </p>
                <p className="text-sm italic text-gray-400">
                  {flower.note || 'No note'}
                </p>
                <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
                  Watered {flower.waterCount || 0} / 7 times
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
