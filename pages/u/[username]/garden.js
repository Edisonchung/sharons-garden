import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { db } from '../../../lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import toast from 'react-hot-toast';

export default function FriendGardenPage() {
  const router = useRouter();
  const { username } = router.query;
  const [profile, setProfile] = useState(null);
  const [seeds, setSeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;

    const fetchGarden = async () => {
      try {
        const userQuery = query(
          collection(db, 'users'),
          where('username', '==', username)
        );
        const userSnap = await getDocs(userQuery);

        if (userSnap.empty) {
          setNotFound(true);
          return;
        }

        const userDoc = userSnap.docs[0];
        const userId = userDoc.id;
        const userData = userDoc.data();

        if (userData.public === false) {
          setNotFound(true);
          return;
        }

        setProfile({
          name: userData.displayName || username,
          avatar: userData.photoURL || '',
          joined: userData.joinedAt?.toDate?.().toLocaleDateString() || 'N/A'
        });

        const flowerQuery = query(
          collection(db, 'flowers'),
          where('userId', '==', userId)
        );
        const flowerSnap = await getDocs(flowerQuery);
        const flowerData = flowerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSeeds(flowerData);
      } catch (err) {
        console.error('Failed to fetch friend garden:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGarden();
  }, [username]);

  if (loading) {
    return <p className="text-center mt-10">Loading garden...</p>;
  }

  if (notFound) {
    return <p className="text-center mt-10 text-red-500">User not found or profile is private.</p>;
  }

  const totalSeeds = seeds.length;
  const bloomed = seeds.filter(s => s.bloomed).length;
  const growing = totalSeeds - bloomed;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-teal-100 dark:from-gray-900 dark:to-black p-6">
      <div className="mb-6 text-center">
        {profile.avatar && (
          <img
            src={profile.avatar}
            alt={profile.name}
            className="mx-auto rounded-full w-24 h-24 mb-2 border-4 border-white shadow"
          />
        )}
        <h1 className="text-3xl font-bold text-green-700 dark:text-green-300">
          🌼 {profile.name}’s Garden
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Joined: {profile.joined}</p>
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <span className="text-green-700 dark:text-green-300">🌱 Planted: {totalSeeds}</span>
          <span className="text-yellow-600 dark:text-yellow-400">🌻 Bloomed: {bloomed}</span>
          <span className="text-blue-600 dark:text-blue-400">💧 Growing: {growing}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {seeds.map((seed) => (
          <Card key={seed.id} className="bg-white dark:bg-gray-800 shadow rounded-xl p-4">
            <CardContent>
              <h3 className="text-xl font-semibold text-purple-700">
                {seed.bloomed ? `${seed.bloomedFlower} ${seed.type}` : '🌱 Seedling'}
              </h3>
              <p className="text-sm italic text-gray-500 mb-1">— {seed.name || 'Anonymous'} | {seed.color}</p>
              {seed.note && <p className="text-sm text-gray-600 mb-2">“{seed.note}”</p>}
              <p className="text-sm text-gray-500">Watered {seed.waterCount} / 7 times</p>
              {seed.bloomed ? (
                <p className="text-green-600 font-medium mt-2">Bloomed! 🌟</p>
              ) : (
                <p className="text-gray-400 mt-2 italic">Still growing...</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
