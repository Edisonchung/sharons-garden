// utils/streak.js
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function updateWateringStreak(userId) {
  if (!userId) return;

  const streakRef = doc(db, 'streaks', userId);
  const today = new Date().toDateString();
  let newStreak = 1;

  try {
    const snap = await getDoc(streakRef);
    if (snap.exists()) {
      const data = snap.data();
      const lastDate = new Date(data.lastWatered).toDateString();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isConsecutive = lastDate === yesterday.toDateString();

      newStreak = isConsecutive ? data.count + 1 : 1;
    }

    await setDoc(
      streakRef,
      {
        count: newStreak,
        lastWatered: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return newStreak;
  } catch (err) {
    console.error('Failed to update watering streak:', err);
  }
}
