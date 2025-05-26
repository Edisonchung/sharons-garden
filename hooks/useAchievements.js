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
    description: 'You\'ve bloomed at least 5 flowers!',
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
    description: 'You\'ve bloomed 10 flowers!',
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
    description: 'You\'ve shared 3 blooms with the world!',
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
          // Create user document if it doesn't exist
          await setDoc(userRef, { 
            badges: [],
            joinedAt: new Date(),
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || ''
          }, { merge: true });
          setBadges([]);
        }
      } catch (err) {
        console.error('Error loading achievements:', err);
        setBadges([]);
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
    if (!userId) return;
    
    try {
      const sharesRef = collection(db, 'users', userId, 'bloomShares');
      const snap = await getDocs(sharesRef);
      if (snap.size >= 3) {
        await unlockBadge('🦋 Social Butterfly');
      }
    } catch (err) {
      console.error('Failed to check share badge:', err);
    }
  };

  // 🧠 Lookup badge details by emoji or ID
  const getBadgeDetails = (key) =>
    Object.values(BADGE_CATALOG).find(b => b.emoji === key || b.id === key) || null;

  const getAllBadges = () => Object.values(BADGE_CATALOG);

  const hasBadge = (emoji) => badges.includes(emoji);

  // 📊 Calculate badge progress - UPDATED METHOD
  const getBadgeProgress = async (badge) => {
    const user = auth.currentUser;
    if (!user || !badge.progress) return null;

    const { type, target } = badge.progress;

    try {
      if (type === 'blooms') {
        const q = query(
          collection(db, 'flowers'), 
          where('userId', '==', user.uid), 
          where('bloomed', '==', true)
        );
        const snap = await getDocs(q);
        return { current: snap.size, target };
      }

      if (type === 'reflections') {
        // Fixed: Fetch all user flowers and count reflections client-side
        const q = query(
          collection(db, 'flowers'), 
          where('userId', '==', user.uid)
        );
        const snap = await getDocs(q);
        
        let count = 0;
        snap.docs.forEach(doc => {
          const data = doc.data();
          if (data.reflection && data.reflection.trim() !== '') {
            count++;
          }
        });
        
        return { current: count, target };
      }

      if (type === 'shares') {
        try {
          const sharesRef = collection(db, 'users', user.uid, 'bloomShares');
          const snap = await getDocs(sharesRef);
          return { current: snap.size, target };
        } catch (err) {
          // If subcollection doesn't exist or has permission issues
          console.log('Shares collection not accessible, returning 0');
          return { current: 0, target };
        }
      }

      if (type === 'streak') {
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          const streak = userSnap.exists() ? (userSnap.data().wateringStreak || 0) : 0;
          return { current: streak, target };
        } catch (err) {
          console.log('Could not fetch streak data');
          return { current: 0, target };
        }
      }
    } catch (err) {
      console.error(`Failed to get progress for ${badge.name}:`, err);
      return { current: 0, target };
    }

    return null;
  };

  // Check and unlock badges based on current progress
  const checkAndUnlockBadges = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Check First Seed badge
      const seedsQuery = query(
        collection(db, 'flowers'),
        where('userId', '==', user.uid)
      );
      const seedsSnap = await getDocs(seedsQuery);
      
      if (seedsSnap.size > 0 && !hasBadge('🌱')) {
        await unlockBadge('🌱 First Seed');
      }

      // Check bloom-based badges
      const bloomsQuery = query(
        collection(db, 'flowers'),
        where('userId', '==', user.uid),
        where('bloomed', '==', true)
      );
      const bloomsSnap = await getDocs(bloomsQuery);
      const bloomCount = bloomsSnap.size;

      if (bloomCount >= 5 && !hasBadge('🌿')) {
        await unlockBadge('🌿 Green Thumb');
      }

      if (bloomCount >= 10 && !hasBadge('🌸')) {
        await unlockBadge('🌸 Bloom Master');
      }

      // Check for Sharon's touch
      const touchedFlowers = bloomsSnap.docs.filter(doc => 
        doc.data().touchedBySharon !== null && doc.data().touchedBySharon !== undefined
      );
      
      if (touchedFlowers.length > 0 && !hasBadge('💜')) {
        await unlockBadge('💜 Touched by Sharon');
      }

    } catch (err) {
      console.error('Error checking badges:', err);
    }
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
    hasBadge,
    checkAndUnlockBadges,
    BADGE_CATALOG
  };
}
