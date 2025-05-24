// pages/garden/achievements.js
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Link from 'next/link';
import confetti from 'canvas-confetti';

const ALL_ACHIEVEMENTS = [
  { name: 'First Bloom', icon: '🌸', desc: 'Bloomed your first flower!', condition: (b, t, w) => b >= 1, image: '/badges/first-bloom.png' },
  { name: 'Gardener', icon: '🌼', desc: 'Bloomed 3 flowers', condition: (b, t, w) => b >= 3, image: '/badges/gardener.png' },
  { name: 'Flower Fanatic', icon: '🌻', desc: 'Bloomed 7 flowers', condition: (b, t, w) => b >= 7, image: '/badges/fanatic.png' },
  { name: 'Garden Master', icon: '👑', desc: 'Collected all flower types', condition: (b, t, w) => t >= 5, image: '/badges/master.png' },
  { name: 'Diligent Waterer', icon: '💧', desc: 'Watered 20 times', condition: (b, t, w) => w >= 20, image: '/badges/waterer.png' }
];


  // 🔁 Load badges from Firestore and merge with local ones
  useEffect(() => {
    const preloadBadgesFromFirestore = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const serverBadges = snap.data().badges || [];

          const merged = achievements.map(badge => ({
            ...badge,
            unlocked: badge.unlocked || serverBadges.includes(badge.name)
          }));

          setAchievements(merged);
          localStorage.setItem('achievements', JSON.stringify(merged));
          console.log('✅ Loaded badges from Firestore:', serverBadges);
        }
      } catch (err) {
        console.error('❌ Failed to load badges from Firestore:', err);
      }
    };

    if (typeof window !== 'undefined' && auth.currentUser) {
      preloadBadgesFromFirestore();
    }
  }, []);

  // ☁️ Sync unlocked badges to Firestore
  useEffect(() => {
    const syncToFirestore = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const earned = unlocked.filter(b => b.unlocked).map(b => b.name);

      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);

        const current = snap.exists() ? (snap.data().badges || []) : [];
        const newBadges = earned.filter(b => !current.includes(b));

        if (newBadges.length > 0) {
          const updated = Array.from(new Set([...current, ...newBadges]));
          if (snap.exists()) {
            await updateDoc(ref, { badges: updated });
          } else {
            await setDoc(ref, { badges: updated });
          }
          console.log('✅ Synced badges to Firestore:', updated);
        }
      } catch (err) {
        console.error('❌ Firestore sync failed:', err);
      }
    };

    if (typeof window !== 'undefined' && auth.currentUser) {
      syncToFirestore();
    }
  }, [unlocked]);

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState([]);
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);
  const hasMounted = useRef(false);

  useEffect(() => {
    const cached = JSON.parse(localStorage.getItem('flowers') || '{}');
    const all = Object.values(cached);
    const bloomed = all.filter(f => f.bloomed);
    const types = new Set(bloomed.map(f => f.type));
    const waterCounts = all.reduce((sum, f) => sum + (f.waterCount || 0), 0);

    const unlocked = ALL_ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: a.condition(bloomed.length, types.size, waterCounts),
      progress: a.name === 'Diligent Waterer' ? waterCounts : a.name === 'Flower Fanatic' ? bloomed.length : 0
    }));

    const newUnlocks = unlocked.filter(u => u.unlocked && !localStorage.getItem(`badge_${u.name}`));
    newUnlocks.forEach(u => localStorage.setItem(`badge_${u.name}`, 'true'));
    if (hasMounted.current && newUnlocks.length > 0) confetti();

    setAchievements(unlocked);
    setNewlyUnlocked(newUnlocks);
    hasMounted.current = true;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-purple-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-800">🏅 My Achievements</h1>
        <Link href="/">
          <Button variant="outline">🏡 Back to Garden</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {achievements.map((a, index) => (
          <Card
            key={index}
            className={`rounded-xl p-4 shadow-lg border-l-4 ${a.unlocked ? 'border-yellow-400 bg-white' : 'border-gray-300 bg-gray-100 opacity-70'}`}
          >
            <CardContent>
              <h3 className={`text-xl font-semibold ${a.unlocked ? 'text-yellow-600' : 'text-gray-400'}`}>
                {a.icon} {a.name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{a.desc}</p>
              {!a.unlocked && (
                <p className="text-xs text-gray-500 mt-2 italic">Not yet unlocked</p>
              )}
              {a.name === 'Diligent Waterer' && (
                <div className="text-xs mt-1 text-gray-500">Progress: {a.progress}/20</div>
              )}
              {a.name === 'Flower Fanatic' && (
                <div className="text-xs mt-1 text-gray-500">Progress: {a.progress}/7</div>
              )}
              {a.unlocked && (
                <a
                  href={a.image}
                  download
                  className="text-xs mt-3 inline-block text-blue-600 underline hover:text-blue-800"
                >
                  Download Badge
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
