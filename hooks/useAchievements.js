import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// 🔖 Badge Catalog
export const BADGE_CATALOG = {
  '🌿 Green Thumb': {
    id: 'green-thumb',
    emoji: '🌿',
    name: 'Green Thumb',
    description: 'You’ve bloomed at least 5 flowers!',
    progress: { type: 'blooms', target: 5 }
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
    description: 'You’ve bloomed 10 flowers!',
    progress: { type: 'blooms', target: 10 }
  },
  '⭐ Streak Star': {
    id: 'streak-star',
    emoji: '⭐',
    name: 'Streak Star',
    description: 'You watered 7 days in a row!',
    progress: { type: 'streak', target: 7 }
  },
  '📝 Reflective Gardener': {
    id: 'reflective-gardener',
    emoji: '📝',
    name: 'Reflective Gardener',
    description: 'You wrote 3 reflections.',
    progress: { type: 'reflections', target: 3 }
  },
  '💜 Touched by Sharon': {
    id: 'touched-by-sharon',
    emoji: '💜',
    name: 'Touched by Sharon',
    description: 'One of your flowers was personally blessed by Sharon.'
  },
  '🦋 Social Butterfly': {
    id: 'social-butterfly',
    emoji: '🦋',
    name: 'Social Butterfly',
    description: 'You’ve shared 3 blooms with the world!',
    progress: { type: 'shares', target: 3 }
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
      } catch (err) {
        console.error('Error loading achievements:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 🏅 Add a new badge to the user's list
  const unlockBadge = async (badgeName) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      const currentBadges = snap.exists() ? (snap.data().badges || []) : [];

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

  // 🦋 Triggered when bloom is shared
  const checkShareBadge = async (userId) => {
    try {
      const sharesRef = collection(db, 'users', userId, 'bloomShares');
      const snap = await getDocs(sharesRef);
      if (snap.size >= 3) await unlockBadge('🦋 Social Butterfly');
    } catch (err) {
      console.error('Failed to check share badge:', err);
    }
  };

  // 🧠 Lookup badge details by emoji or ID
  const getBadgeDetails = (key) =>
    Object.values(BADGE_CATALOG).find(b => b.emoji === key || b.id === key) || null;

  const getAllBadges = () => Object.values(BADGE_CATALOG);

  const hasBadge = (emoji) => badges.includes(emoji);

  // 📊 Calculate badge progress
  const getBadgeProgress = async (badge) => {
    const user = auth.currentUser;
    if (!user || !badge.progress) return null;

    const { type, target } = badge.progress;

    try {
      if (type === 'blooms') {
        const q = query(collection(db, 'flowers'), where('userId', '==', user.uid), where('bloomed', '==', true));
        const snap = await getDocs(q);
        return { current: snap.size, target };
      }

      if (type === 'reflections') {
        const q = query(collection(db, 'flowers'), where('userId', '==', user.uid), where('reflection', '!=', ''));
        const snap = await getDocs(q);
        return { current: snap.size, target };
      }

      if (type === 'shares') {
        const snap = await getDocs(collection(db, 'users', user.uid, 'bloomShares'));
        return { current: snap.size, target };
      }

      if (type === 'streak') {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const streak = snap.exists() ? snap.data().wateringStreak || 0 : 0;
        return { current: streak, target };
      }
    } catch (err) {
      console.error(`Failed to get progress for ${badge.name}`, err);
    }

    return null;
  };

  return {
    badges,
    newBadge,
    loading,
    unlockBadge,
    checkShareBadge,
    getBadgeDetails,
    getAllBadges,
    getBadgeProgress,
    hasBadge
  };
}
