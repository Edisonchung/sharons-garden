import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../../components/Avatar';

export default function MyGardenPage() {
  const { user } = useAuth();
  const [seeds, setSeeds] = useState([]);
  const [helpers, setHelpers] = useState({});

  useEffect(() => {
    if (!user) return;

    const fetchSeedsAndHelpers = async () => {
      const flowerQuery = query(
        collection(db, 'flowers'),
        where('userId', '==', user.uid)
      );
      const flowerSnap = await getDocs(flowerQuery);
      const flowerList = flowerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSeeds(flowerList);

      const newHelpers = {};
      for (const seed of flowerList) {
        const waterQuery = query(
          collection(db, 'waterings'),
          where('seedId', '==', seed.id),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const waterSnap = await getDocs(waterQuery);
        newHelpers[seed.id] = waterSnap.docs.map(doc => doc.data());
      }
      setHelpers(newHelpers);
    };

    fetchSeedsAndHelpers();
  }, [user]);

  if (!user) {
    return <p className="text-center mt-10">Please sign in to view your garden.</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-100 dark:from-gray-900 dark:to-black p-6">
      <h1 className="text-3xl font-bold text-purple-700 dark:text-purple-300 text-center mb-6">🌸 My Garden</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {seeds.map(seed => (
          <Card key={seed.id} className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4">
            <CardContent>
              <h2 className="text-xl font-bold text-purple-700 mb-1">
                {seed.bloomed ? `${seed.bloomedFlower} ${seed.type}` : '🌱 Seedling'}
              </h2>
              <p className="text-sm italic text-gray-500 mb-1">
                — {seed.name || 'Anonymous'} | {seed.color}
              </p>
              {seed.note && <p className="text-sm text-gray-600 mb-2">“{seed.note}”</p>}
              <p className="text-sm text-gray-500 mb-2">Watered {seed.waterCount} / 7 times</p>

              {helpers[seed.id] && helpers[seed.id].length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1">Recently watered by:</p>
                  <div className="flex -space-x-2">
                    {helpers[seed.id].map((w, index) => (
                      <Avatar
                        key={index}
                        name={w.helperName || 'Unknown'}
                        photoURL={w.helperPhotoURL || ''}
                        size="sm"
                        tooltip={
                          w.timestamp?.toDate
                            ? `Watered on ${w.timestamp.toDate().toLocaleString()}`
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
              )}

              {seed.bloomed && <p className="text-green-600 font-medium mt-2">Bloomed! 🌟</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
