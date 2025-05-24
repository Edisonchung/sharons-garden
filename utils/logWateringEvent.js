// utils/logWateringEvent.js
import {
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { unlockBadge } from './unlockBadge'; // optional helper if you split badge logic

export const logWateringEvent = async (user, flower) => {
  if (!user || !flower) return;

  const today = new Date().toISOString().split('T')[0]; // e.g. '2024-07-21'
  const logRef = doc(db, 'users', user.uid, 'wateringLogs', today);

  try {
    await setDoc(logRef, {
      date: today,
      wateredAt: serverTimestamp(),
      flowerId: flower.id,
      type: flower.type
    });

    console.log('✅ Watering log saved to Firestore');

    // Check streak
    const logsSnap = await getDocs(collection(db, 'users', user.uid, 'wateringLogs'));
    const dates = logsSnap.docs.map(doc => doc.id).sort().reverse();

    let streak = 0;
    let current = new Date();
    for (let i = 0; i < 10; i++) {
      const dateStr = current.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        streak++;
        current.setDate(current.getDate() - 1);
      } else {
        break;
      }
    }

    if (streak >= 3) await unlockBadge(user.uid, '💧 3-Day Watering Streak');
    if (streak >= 7) await unlockBadge(user.uid, '🌈 7-Day Watering Master');

  } catch (err) {
    console.error('❌ Failed to log watering:', err);
  }
};
