import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import WateringHistoryModal from '../../components/WateringHistoryModal';
import toast from 'react-hot-toast';

export default function MyGardenPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [seeds, setSeeds] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedSeedId, setSelectedSeedId] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth');
      } else {
        setUser(currentUser);
        const q = query(collection(db, 'flowers'), where('userId', '==', currentUser.uid));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSeeds(data);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const today = new Date().toDateString();
  const filteredSeeds = seeds.filter((seed) => {
    if (filter === 'bloomed') return seed.bloomed;
    if (filter === 'unbloomed') return !seed.bloomed;
    if (filter === 'needsWater') {
      const lastKey = `lastWatered_${seed.id}`;
      const last = localStorage.getItem(lastKey);
      return !last || new Date(last).toDateString() !== today;
    }
    return true;
  });

  const handleWater = async (seed) => {
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

      await updateDoc(ref, {
        waterCount: count,
        bloomed,
        bloomedFlower: bloomed ? seed.bloomedFlower || '🌸' : null,
        lastWatered: new Date().toISOString()
      });

      localStorage.setItem(lastKey, new Date().toISOString());
      toast.success('💧 Watered successfully');
    } catch (err) {
      console.error('Watering failed:', err);
      toast.error('Failed to water');
    }
  };

  if (loading) {
    return <p className="text-center mt-10">Loading your garden...</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 p-6">
      <h1 className="text-3xl font-bold text-center text-purple-700 mb-6">🌺 My Garden</h1>

      <div className="flex gap-2 justify-center mb-6">
        {['all', 'bloomed', 'unbloomed', 'needsWater'].map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            {f === 'all' && '🌼 All'}
            {f === 'bloomed' && '🌸 Bloomed'}
            {f === 'unbloomed' && '🌱 Seedlings'}
            {f === 'needsWater' && '💧 Needs Water'}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {filteredSeeds.map((seed) => (
          <Card key={seed.id} className="bg-white shadow-xl rounded-xl p-4">
            <CardContent>
              <h3 className="text-xl font-semibold text-purple-700">
                {seed.bloomed ? `${seed.bloomedFlower} ${seed.type}` : '🌱 Seedling'}
              </h3>
              <p className="text-sm italic text-gray-500 mb-1">— {seed.name || 'Anonymous'} | {seed.color}</p>
              {seed.note && <p className="text-sm text-gray-600 mb-2">“{seed.note}”</p>}
              <p className="text-sm text-gray-500">Watered {seed.waterCount} / 7 times</p>
              <div className="mt-2 flex gap-2">
                {!seed.bloomed && (
                  <Button onClick={() => handleWater(seed)}>💧 Water</Button>
                )}
                <Button variant="outline" onClick={() => setSelectedSeedId(seed.id)}>📜 History</Button>
              </div>
              {seed.bloomed && <p className="text-green-600 font-medium mt-2">Bloomed! 🌟</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <WateringHistoryModal
        seedId={selectedSeedId}
        isOpen={!!selectedSeedId}
        onClose={() => setSelectedSeedId(null)}
      />
    </div>
  );
}
