import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const BADGE_CATALOG = {
  '🌿 Green Thumb': {
    id: 'green-thumb',
    emoji: '🌿',
    name: 'Green Thumb',
    description: 'You’ve bloomed at least 5 flowers!'
  },
  '🌱 First Seed': {
    id: 'first-seed',
    emoji: '🌱',
    name: 'First Seed',
    description: 'You planted your first seed!'
  },
  '🌸 Bloom Master': {
    id: 'bloom-master',
    emoji: '🌸',
    name: 'Bloom Master',
    description: 'You’ve bloomed 10 flowers!'
  },
  '⭐ Streak Star': {
    id: 'streak-star',
    emoji: '⭐',
    name: 'Streak Star',
    description: 'You watered 7 days in a row!'
  },
  '📝 Reflective Gardener': {
    id: 'reflective-gardener',
    emoji: '📝',
    name: 'Reflective Gardener',
    description: 'You wrote 3 reflections.'
  },
  '💜 Touched by Sharon': {
    id: 'touched-by-sharon',
    emoji: '💜',
    name: 'Touched by Sharon',
    description: 'One of your flowers was personally blessed by Sharon.'
  }
};

export default function useAchievements() {
  const [badges, setBadges] = useState([]);
  const [newBadge, setNewBadge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setBadges([]);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setBadges(userSnap.data().badges || []);
        } else {
          await setDoc(userRef, { badges: [] });
          setBadges([]);
        }
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const unlockBadge = async (badgeName) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const currentBadges = userSnap.exists() ? (userSnap.data().badges || []) : [];

      if (!currentBadges.includes(badgeName)) {
        const updated = [...currentBadges, badgeName];
        await updateDoc(userRef, { badges: updated });
        setBadges(updated);
        setNewBadge(badgeName);
      }
    } catch (err) {
      console.error('Error unlocking badge:', err);
    }
  };

  const getBadgeDetails = (emoji) => BADGE_CATALOG[emoji] || null;

  const getAllBadges = () => Object.values(BADGE_CATALOG);

  return {
    badges,
    newBadge,
    loading,
    unlockBadge,
    getBadgeDetails,
    getAllBadges
  };
}
