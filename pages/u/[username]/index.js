// pages/u/[username]/index.js - Fixed Public Profile Page
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';

export default function PublicProfilePage() {
  const router = useRouter();
  const { username } = router.query;
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [userStats, setUserStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!username) return;

    const fetchUserProfile = async () => {
      try {
        // Find user by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setNotFound(true);
          return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Check if profile is public
        if (userData.public === false && currentUser?.uid !== userDoc.id) {
          setNotFound(true);
          return;
        }

        setProfileUser({
          id: userDoc.id,
          ...userData
        });

        // Load user statistics
        await loadUserStats(userDoc.id);

      } catch (err) {
        console.error('Failed to load profile:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, currentUser]);

  const loadUserStats = async (userId) => {
    try {
      // Get user's flowers
      const flowersQuery = query(
        collection(db, 'flowers'),
        where('userId', '==', userId)
      );
      const flowersSnap = await getDocs(flowersQuery);
      const flowers = flowersSnap.docs.map(doc => doc.data());

      // Get user's watering activity
      const wateringsQuery = query(
        collection(db, 'waterings'),
        where('wateredByUserId', '==', userId)
      );
      const wateringsSnap = await getDocs(wateringsQuery);

      // Calculate stats
      const totalSeeds = flowers.length;
      const bloomedFlowers = flowers.filter(f => f.bloomed).length;
      const specialSeeds = flowers.filter(f => f.specialSeed || f.songSeed).length;
      const friendsHelped = new Set(
        wateringsSnap.docs.map(doc => doc.data().seedOwnerId).filter(id => id !== userId)
      ).size;

      setUserStats({
        totalSeeds,
        bloomedFlowers,
        specialSeeds,
        friendsHelped,
        successRate: totalSeeds > 0 ? Math.round((bloomedFlowers / totalSeeds) * 100) : 0
      });

    } catch (error) {
      console.error('Error loading user stats:', error);
      setUserStats({
        totalSeeds: 0,
        bloomedFlowers: 0,
        specialSeeds: 0,
        friendsHelped: 0,
        successRate: 0
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">👤</div>
          <p className="text-purple-700">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-xl p-8 shadow-lg max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-purple-700 mb-2">Profile Not Found</h1>
          <p className="text-gray-600 mb-4">
            This profile might be private or the username doesn't exist.
          </p>
          <Link href="/">
            <Button>🏠 Go to Main Garden</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.uid === profileUser?.id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Profile Header */}
        <Card className="mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-20"></div>
          <CardContent className="relative pt-0 pb-6">
            
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-10">
              {/* Profile Picture */}
              <div className="relative">
                {profileUser.photoURL ? (
                  <img
                    src={profileUser.photoURL}
                    alt="Profile"
                    className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-white"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-bold text-purple-700 mb-1">
                  {profileUser.displayName || 'Anonymous Gardener'}
                </h1>
                <p className="text-gray-600 mb-2">@{username}</p>
                
                <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-600">
                  <span>🌱 Joined {profileUser.joinedAt?.toDate?.()?.toLocaleDateString() || 'Recently'}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                {isOwnProfile && (
                  <Link href="/garden/profile">
                    <Button variant="outline">✏️ Edit Profile</Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.bloomedFlowers}</div>
              <p className="text-sm text-gray-600">Flowers Bloomed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{userStats.totalSeeds}</div>
              <p className="text-sm text-gray-600">Seeds Planted</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{userStats.successRate}%</div>
              <p className="text-sm text-gray-600">Success Rate</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{userStats.friendsHelped}</div>
              <p className="text-sm text-gray-600">Friends Helped</p>
            </CardContent>
          </Card>
        </div>

        {/* Special Achievements */}
        {userStats.specialSeeds > 0 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-purple-700 mb-4">✨ Special Achievements</h3>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <div className="text-3xl font-bold text-indigo-600">{userStats.specialSeeds}</div>
                <p className="text-sm text-indigo-700">Special Seeds Collected</p>
                <p className="text-xs text-gray-600 mt-1">Including melody seeds and rare varieties</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href={`/u/${username}/badges`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🏅</div>
                <h3 className="font-semibold text-purple-700">Achievements</h3>
                <p className="text-sm text-gray-600 mt-1">View earned badges</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href={`/u/${username}/timeline`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">📖</div>
                <h3 className="font-semibold text-purple-700">Garden Timeline</h3>
                <p className="text-sm text-gray-600 mt-1">Bloom history</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href={`/u/${username}/garden`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🌱</div>
                <h3 className="font-semibold text-purple-700">Visit Garden</h3>
                <p className="text-sm text-gray-600 mt-1">Help water seeds</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
