// utils/getUnwateredFlowers.js
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';

export const getUnwateredTodayFlowers = async () => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return resolve([]);

      try {
        const q = query(
          collection(db, 'flowers'),
          where('userId', '==', user.uid),
          where('bloomed', '==', false)
        );

        const snapshot = await getDocs(q);
        const today = new Date().toDateString();
        const unwatered = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(flower => {
            const lastWaterKey = `lastWatered_${flower.id}`;
            const last = localStorage.getItem(lastWaterKey);
            return !last || new Date(last).toDateString() !== today;
          });

        resolve(unwatered);
      } catch (err) {
        console.error('Failed to fetch unwatered flowers', err);
        resolve([]);
      }
    });
  });
};
