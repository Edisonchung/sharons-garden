import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import Link from 'next/link';

export default function PublicUserPage() {
  const router = useRouter();
  const { username } = router.query;
  const [userData, setUserData] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;

    const fetchUser = async () => {
      try {
        const q = query(collection(db, 'users'), where('username', '==', username));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setUserData(snapshot.docs[0].data());
        } else {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch public profile:', err);
        setNotFound(true);
      }
    };

    fetchUser();
  }, [username]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center bg-gradient-to-b from-pink-100 to-purple-200">
        <div>
          <h1 className="text-2xl font-bold text-purple-700">User Not Found</h1>
          <p className="text-gray-500 mt-2">We couldn’t find a user with the username: <strong>{username}</strong></p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200">
        <p className="text-purple-600 text-lg">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6 flex flex-col items-center text-center">
      <img
        src={userData.photoURL || '/default-avatar.png'}
        alt="User avatar"
        className="w-24 h-24 rounded-full border-4 border-white shadow-lg mb-4"
      />
      <h1 className="text-2xl font-bold text-purple-700 mb-1">{userData.displayName || 'Anonymous'}</h1>
      <p className="text-gray-500 text-sm mb-4">@{username}</p>

      <p className="text-gray-600 mb-6">
        🌱 Blooming since {userData.joinedAt?.toDate?.().toLocaleDateString() || 'an unknown day'}
      </p>

      <div className="flex gap-4">
        <Link href={`/u/${username}/badges`} className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700">
          🎖 View Badges
        </Link>
        <Link href={`/u/${username}/timeline`} className="bg-white border border-purple-600 text-purple-600 px-4 py-2 rounded shadow hover:bg-purple-50">
          📅 Garden Timeline
        </Link>
      </div>
    </div>
  );
}
