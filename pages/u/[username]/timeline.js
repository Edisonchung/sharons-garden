// pages/u/[username]/timeline.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Card, CardContent } from '../../../components/ui/card';

export default function PublicTimelinePage() {
  const router = useRouter();
  const { username } = router.query;

  const [timeline, setTimeline] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;

    const fetchPublicTimeline = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setNotFound(true);
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        if (!userData.timelinePublic) {
          setNotFound(true);
          return;
        }

        setProfile({
          name: userData.displayName || username,
          avatar: userData.photoURL || '',
          joined: userData.joinedAt?.toDate?.().toLocaleDateString() || 'N/A',
        });

        const flowerRef = collection(db, 'flowers');
        const timelineQuery = query(flowerRef, where('userId', '==', userDoc.id), where('bloomed', '==', true));
        const flowers = await getDocs(timelineQuery);

        const sorted = flowers.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => new Date(b.bloomTime) - new Date(a.bloomTime));

        setTimeline(sorted);
      } catch (err) {
        console.error('Failed to load timeline:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicTimeline();
  }, [username]);

  if (loading) return <p className="text-center mt-10">Loading timeline…</p>;
  if (notFound) return <p className="text-center mt-10 text-red-500">User not found or timeline is private.</p>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-black p-6">
      <div className="text-center mb-6">
        {profile.avatar && <img src={profile.avatar} alt={profile.name} className="mx-auto w-20 h-20 rounded-full border-4 border-white shadow" />}
        <h1 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">📖 {profile.name}'s Bloom Timeline</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Joined: {profile.joined}</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {timeline.map((item) => (
          <Card key={item.id} className="border-l-4 border-purple-300">
            <CardContent className="p-4">
              <h2 className="font-semibold text-purple-700">{item.bloomedFlower} {item.type}</h2>
              {item.note && <p className="text-sm mt-1 text-gray-700 italic">“{item.note}”</p>}
              {item.reflection && <p className="text-sm mt-2 text-gray-600">📝 {item.reflection}</p>}
              {item.photo && <img src={item.photo} className="mt-3 rounded shadow-md max-h-48 object-contain" alt="Reflection Upload" />}
              <p className="text-xs text-gray-500 mt-2">🌸 Bloomed on {new Date(item.bloomTime).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        ))}

        {timeline.length === 0 && (
          <p className="text-center text-gray-500 italic">No blooms to show yet 🌱</p>
        )}
      </div>
    </div>
  );
}
