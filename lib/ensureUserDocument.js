import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export const ensureUserDocument = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    const baseUsername = (user.displayName || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    const uniqueUsername = baseUsername + Math.floor(Math.random() * 10000);

    await setDoc(userRef, {
      username: uniqueUsername,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      public: true,
      joinedAt: new Date()
    });

    console.log(`✅ Created new user profile for ${uniqueUsername}`);
  }
};
