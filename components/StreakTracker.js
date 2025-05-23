// components/StreakTracker.js
import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function StreakTracker() {
  const [user, setUser] = useState(null);
  const [streak, setStreak] = useState(0);
  const [lastDate, setLastDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;
      setUser(currentUser);

      const streakRef = doc(db, 'users', currentUser.uid, 'meta', 'streak');
      const snap = await getDoc(streakRef);
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (!snap.exists()) {
        await setDoc(streakRef, { streak: 1, lastWatered: today });
        setStreak(1);
        setLastDate(today);
      } else {
        const data = snap.data();
        setLastDate(data.lastWatered);

        if (data.lastWatered === today) {
          setStreak(data.streak);
        } else if (data.lastWatered === yesterday) {
          const newStreak = data.streak + 1;
          await updateDoc(streakRef, { streak: newStreak, lastWatered: today });
          setStreak(newStreak);
        } else {
          await updateDoc(streakRef, { streak: 1, lastWatered: today });
          setStreak(1);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <div className="text-center text-sm text-purple-700 dark:text-purple-300 mt-4">
      🔥 Watering Streak: <strong>{streak}</strong> day{streak > 1 ? 's' : ''}!
    </div>
  );
}
