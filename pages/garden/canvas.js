// pages/garden/canvas.js
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Image from 'next/image';
import '../../styles/canvas.css';

export default function GardenCanvas() {
  const [user, setUser] = useState(null);
  const [flowers, setFlowers] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const flowerQuery = query(
          collection(db, 'flowers'),
          where('userId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(flowerQuery);
        const userFlowers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFlowers(userFlowers);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="canvas-container min-h-screen bg-green-50 dark:bg-black p-6">
      <h1 className="text-3xl font-bold text-center text-green-700 dark:text-green-300 mb-6">🌸 My Pixel Garden</h1>
      <div className="grid-container">
        {flowers.map((flower, index) => (
          <div key={flower.id || index} className="tile">
            <Image
              src={`/pixel/${flower.type.toLowerCase()}.png`}
              alt={flower.type}
              width={64}
              height={64}
              className="pixel-art"
            />
            <p className="caption">{flower.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
