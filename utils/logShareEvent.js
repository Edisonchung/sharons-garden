import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const logShareEvent = async (userId, flowerId, method = 'link') => {
  if (!userId || !flowerId) return;

  try {
    const ref = doc(db, 'users', userId, 'bloomShares', flowerId);
    await setDoc(ref, {
      sharedAt: serverTimestamp(),
      method,
      flowerId
    }, { merge: true });
  } catch (err) {
    console.error('Failed to log share event:', err);
  }
};
