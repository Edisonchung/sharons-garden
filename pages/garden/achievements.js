import { useEffect, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import Confetti from 'react-confetti';
import Link from 'next/link';

const initialBadges = [
  {
    name: 'Green Thumb',
    emoji: '🌿',
    description: 'Bloom 5 flowers',
    unlocked: false,
    image: '/badges/green-thumb.png'
  },
  {
    name: 'First Seed',
    emoji: '🌱',
    description: 'Plant your first seed',
    unlocked: false,
    image: '/badges/first-seed.png'
  },
  {
    name: 'Bloom Master',
    emoji: '🌸',
    description: 'Bloom 10 flowers',
    unlocked: false,
    image: '/badges/bloom-master.png'
  },
  {
    name: 'Streak Star',
    emoji: '🔥',
    description: 'Water 7 days in a row',
    unlocked: false,
    image: '/badges/streak-star.png'
  },
  {
    name: 'Reflective Gardener',
    emoji: '🪞',
    description: 'Write 3 reflections',
    unlocked: false,
    image: '/badges/reflective-gardener.png'
  }
];

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState(initialBadges);
  const [showConfetti, setShowConfetti] = useState(false);

  // Load localStorage progress on mount
  useEffect(() => {
    const stored = localStorage.getItem('achievements');
    if (stored) {
      setAchievements(JSON.parse(stored));
    }
  }, []);

  // 🔁 Load badges from Firestore and merge with local
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

      const earned = achievements.filter(b => b.unlocked).map(b => b.name);

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
  }, [achievements]);

  // 🎉 Confetti animation when a new badge is unlocked
  useEffect(() => {
    if (achievements.some(b => b.unlocked)) {
      setShowConfetti(true);
      const timeout = setTimeout(() => setShowConfetti(false), 4000);
      return () => clearTimeout(timeout);
    }
  }, [achievements]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-orange-100 dark:from-gray-900 dark:to-black p-6 text-center">
      {showConfetti && <Confetti />}
      <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-300 mb-8">🏅 My Achievements</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {achievements.map((badge) => (
          <div
            key={badge.name}
            className={`rounded-xl border shadow-md p-4 transition-all text-center
              ${badge.unlocked
                ? 'bg-white dark:bg-gray-800 text-green-700 dark:text-green-300 border-green-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-300 opacity-60'}
            `}
          >
            <div className="text-4xl mb-2">{badge.unlocked ? badge.emoji : '🔒'}</div>
            <h3 className="font-semibold">{badge.name}</h3>
            <p className="text-sm italic mt-1">{badge.description}</p>
            {badge.unlocked && (
              <img
                src={badge.image}
                alt={badge.name}
                className="mt-2 mx-auto rounded-md w-16 h-16 object-contain"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Link href="/garden">
          <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
            ← Back to Garden
          </button>
        </Link>
      </div>
    </div>
  );
}
