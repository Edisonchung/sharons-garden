import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import toast from 'react-hot-toast';

export default function MyGardenPage() {
  const [user, setUser] = useState(null);
  const [seeds, setSeeds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const q = query(
            collection(db, 'flowers'),
            where('userId', '==', currentUser.uid)
          );
          const snap = await getDocs(q);
          const data = snap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setSeeds(data);
        } catch (error) {
          console.error('Failed to load seeds:', error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleWater = async (seed) => {
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${seed.id}`;
    const last = localStorage.getItem(lastKey);

    if (last && new Date(last).toDateString() === today) {
      toast('💧 Already watered today');
      return;
    }

    try {
      const ref = doc(db, 'flowers', seed.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const data = snap.data();
      const count = (data.waterCount || 0) + 1;
      const bloomed = count >= 7;
      const flowerIcon = seed.bloomedFlower || '🌸';

      await updateDoc(ref, {
        waterCount: count,
        bloomed,
        bloomedFlower: bloomed ? flowerIcon : null,
        lastWatered: new Date().toISOString()
      });

      localStorage.setItem(lastKey, new Date().toISOString());
      toast.success('💧 Watered successfully');

      // Refresh the seed list
      const q = query(collection(db, 'flowers'), where('userId', '==', user.uid));
      const snapRefresh = await getDocs(q);
      const dataRefresh = snapRefresh.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSeeds(dataRefresh);

    } catch (err) {
      console.error('Watering failed:', err);
      toast.error('Failed to water this seed.');
    }
  };

  const handleShare = (seedId) => {
    const url = `${window.location.origin}/flower/${seedId}`;
    navigator.clipboard.writeText(url);
    toast.success('📋 Shareable link copied!');
  };

  if (loading) {
    return <p className="text-center mt-10">Loading your garden...</p>;
  }

  if (!user) {
    return <p className="text-center mt-10">Please log in to view your garden.</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-lime-100 dark:from-gray-900 dark:to-black p-6">
      <div className="mb-6 text-center">
        <img
          src={user.photoURL || '/default-avatar.png'}
          alt={user.displayName || 'User'}
          className="mx-auto rounded-full w-24 h-24 mb-2 border-4 border-white shadow"
        />
        <h1 className="text-3xl font-bold text-green-700 dark:text-green-300">
          🌿 Welcome, {user.displayName || user.email}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {seeds.map((seed) => (
          <Card key={seed.id} className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
            <CardContent>
              <h3 className="text-xl font-semibold text-purple-700">
                {seed.bloomed ? `${seed.bloomedFlower} ${seed.type}` : '🌱 Seedling'}
              </h3>
              <p className="text-sm italic text-gray-500 mb-1">— {seed.name || 'Anonymous'} | {seed.color}</p>
              {seed.note && <p className="text-sm text-gray-600 mb-2">“{seed.note}”</p>}
              <p className="text-sm text-gray-500">Watered {seed.waterCount} / 7 times</p>

              {!seed.bloomed ? (
                <Button onClick={() => handleWater(seed)} className="mt-2">💧 Water</Button>
              ) : (
                <p className="text-green-600 font-medium mt-2">Bloomed! 🌟</p>
              )}

              <Button
                onClick={() => handleShare(seed.id)}
                variant="outline"
                className="mt-2 w-full"
              >
                🔗 Share
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
