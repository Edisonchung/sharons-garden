import { useEffect, useRef, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import WateringHistoryModal from '../../components/WateringHistoryModal';
import SurpriseDrawModal from '../../components/SurpriseDrawModal';

export default function MyGardenPage() {
  const [user, setUser] = useState(null);
  const [seeds, setSeeds] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState(null);
  const [audioOn, setAudioOn] = useState(true);
  const [showDraw, setShowDraw] = useState(false);
  const [bloomCount, setBloomCount] = useState(0);
  const [latestBloom, setLatestBloom] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'flowers'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSeeds(data);
      setBloomCount(data.filter(d => d.bloomed).length);
    });
    return () => unsub();
  }, [user]);

  const handleWater = async (seed) => {
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${seed.id}`;
    const last = localStorage.getItem(lastKey);

    if (last && new Date(last).toDateString() === today) {
      alert('💧 Already watered today!');
      return;
    }

    try {
      const flowerRef = doc(db, 'flowers', seed.id);
      const flowerSnap = await getDoc(flowerRef);
      if (!flowerSnap.exists()) return;

      const flowerData = flowerSnap.data();
      const newCount = (flowerData.waterCount || 0) + 1;
      const bloomed = newCount >= 7;

      await updateDoc(flowerRef, {
        waterCount: newCount,
        bloomed,
        bloomedFlower: bloomed ? flowerData.bloomedFlower || '🌸' : null,
        lastWatered: new Date().toISOString()
      });

      // 💾 Add watering log
      await addDoc(collection(db, 'waterings'), {
        seedId: seed.id,
        userId: user.uid,
        fromUsername: user.displayName || user.email || 'Anonymous',
        timestamp: serverTimestamp(),
      });

      localStorage.setItem(lastKey, new Date().toISOString());

      // 🔧 Streak logic
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const lastWatered = userData.lastWateredDate ? new Date(userData.lastWateredDate) : null;

      const todayDate = new Date();
      const yesterday = new Date(todayDate);
      yesterday.setDate(todayDate.getDate() - 1);

      let newStreak = 1;
      if (lastWatered) {
        const last = new Date(lastWatered.toDate ? lastWatered.toDate() : lastWatered);
        if (last.toDateString() === yesterday.toDateString()) {
          newStreak = (userData.streakCount || 0) + 1;
        } else if (last.toDateString() === todayDate.toDateString()) {
          newStreak = userData.streakCount || 1;
        }
      }

      await updateDoc(userRef, {
        streakCount: newStreak,
        lastWateredDate: todayDate.toISOString(),
      });

      // 🌸 Reward logic
      if (bloomed && !flowerData.bloomed) {
        setLatestBloom(seed);
        setShowDraw(true);
        if (audioOn && audioRef.current) audioRef.current.play();
      }

    } catch (err) {
      console.error('💥 Watering failed:', err);
      alert('Something went wrong while watering.');
    }
  };

  const handleViewHistory = (seed) => {
    setSelectedSeed(seed);
    setShowHistory(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 relative">
      <audio ref={audioRef} src="/audio/bloom.mp3" preload="auto" />
      <h1 className="text-3xl font-bold text-purple-700 mb-4">🌱 My Garden</h1>

      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-700">🌸 Blooms: {bloomCount}</p>
        <Button onClick={() => setAudioOn(!audioOn)} variant="outline">
          {audioOn ? '🔊 Sound On' : '🔇 Sound Off'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {seeds.map(seed => (
          <Card key={seed.id} className="bg-white shadow-xl rounded-xl p-4 relative">
            <CardContent>
              <h3 className={`text-xl font-semibold ${seed.bloomed ? 'animate-bounce text-green-700' : 'text-purple-700'}`}>
                {seed.bloomed ? `${seed.bloomedFlower} ${seed.type}` : '🌱 Seedling'}
              </h3>
              <p className="text-sm text-gray-600 italic">— {seed.name || 'Anonymous'} | {seed.color}</p>
              {seed.note && <p className="text-sm text-gray-500 mt-1">“{seed.note}”</p>}
              <p className="text-sm text-gray-500 mt-2">Watered {seed.waterCount} / 7 times</p>
              <div className="mt-2 flex flex-col gap-2">
                {!seed.bloomed ? (
                  <Button onClick={() => handleWater(seed)}>💧 Water</Button>
                ) : (
                  <p className="text-green-600 font-medium">Bloomed! 🌟</p>
                )}
                <Button onClick={() => handleViewHistory(seed)} variant="outline">📜 View History</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showHistory && selectedSeed && (
        <WateringHistoryModal
          seedId={selectedSeed.id}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}

      {showDraw && latestBloom && (
        <SurpriseDrawModal
          isOpen={showDraw}
          onClose={() => setShowDraw(false)}
          seedType={latestBloom.type}
        />
      )}
    </div>
  );
}
