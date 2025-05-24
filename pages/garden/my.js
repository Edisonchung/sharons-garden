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
  getDocs,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import WateringHistoryModal from '../../components/WateringHistoryModal';
import SurpriseDrawModal from '../../components/SurpriseDrawModal';

const STREAK_REWARDS = [
  { day: 3, reward: 'Sticker Pack', description: '3-Day Watering Champion 🎖️' },
  { day: 7, reward: 'Wallpaper Unlock', description: '7-Day Garden Master 🖼️' },
  { day: 14, reward: 'Exclusive Voice Note', description: '14-Day Sharon Whisper 🎧' }
];

export default function MyGardenPage() {
  const [user, setUser] = useState(null);
  const [seeds, setSeeds] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedSeed, setSelectedSeed] = useState(null);
  const [audioOn, setAudioOn] = useState(true);
  const [showDraw, setShowDraw] = useState(false);
  const [bloomCount, setBloomCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [rewardToShow, setRewardToShow] = useState(null);
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

  useEffect(() => {
    if (!user) return;
    const today = new Date().toDateString();
    const streakKey = `streak_${user.uid}`;
    const lastKey = `lastStreak_${user.uid}`;
    const last = localStorage.getItem(lastKey);

    if (last && new Date(last).toDateString() === today) return;

    let currentStreak = parseInt(localStorage.getItem(streakKey) || '0', 10);
    currentStreak++;
    localStorage.setItem(streakKey, currentStreak);
    localStorage.setItem(lastKey, new Date().toISOString());
    setStreakCount(currentStreak);

    (async () => {
      const rewardsSnap = await getDocs(query(collection(db, 'rewards'), where('userId', '==', user.uid)));
      const claimed = rewardsSnap.docs.map(doc => doc.data().rewardType);
      const reward = STREAK_REWARDS.find(r => r.day === currentStreak && !claimed.includes(r.reward));

      if (reward) {
        await addDoc(collection(db, 'rewards'), {
          userId: user.uid,
          rewardType: reward.reward,
          seedType: `Day ${reward.day} Streak`,
          description: reward.description,
          timestamp: serverTimestamp(),
        });
        setRewardToShow(reward);
        setShowDraw(true);
      }
    })();
  }, [user]);

  const handleWater = async (seed) => {
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${seed.id}`;
    const last = localStorage.getItem(lastKey);

    if (last && new Date(last).toDateString() === today) {
      alert('💧 Already watered today!');
      return;
    }

    const ref = doc(db, 'flowers', seed.id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const data = snap.data();
    const newCount = (data.waterCount || 0) + 1;
    const bloomed = newCount >= 7;

    await updateDoc(ref, {
      waterCount: newCount,
      bloomed,
      bloomedFlower: bloomed ? data.bloomedFlower || '🌸' : null,
      lastWatered: new Date().toISOString()
    });

    await addDoc(collection(db, 'waterings'), {
      seedId: seed.id,
      userId: user.uid,
      fromUsername: user.displayName || user.email || 'Anonymous',
      timestamp: serverTimestamp(),
    });

    localStorage.setItem(lastKey, new Date().toISOString());

    if (bloomed && !data.bloomed) {
      setShowDraw(true);
      if (audioOn && audioRef.current) audioRef.current.play();
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
        <p className="text-gray-700">🌸 Blooms: {bloomCount} • 🔥 Streak: {streakCount} days</p>
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

      {showDraw && rewardToShow && (
        <SurpriseDrawModal
          isOpen={showDraw}
          onClose={() => setShowDraw(false)}
          seedType={rewardToShow.seedType}
          rewardLabel={rewardToShow.reward}
        />
      )}
    </div>
  );
}
