// pages/u/[username]/index.js - Updated with Unified Navigation
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import { PublicProfileLayout, getCurrentPageFromPath } from '../../../components/PublicProfileLayout';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function EnhancedPublicUserPage() {
  const router = useRouter();
  const { username } = router.query;
  
  const [userData, setUserData] = useState(null);
  const [userStats, setUserStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  // Helper function to generate safe avatar URLs
  const getSafeAvatarUrl = (photoURL, displayName, username, size = 80) => {
    if (photoURL && 
        photoURL !== '' && 
        !photoURL.includes('default-avatar.png') &&
        !photoURL.includes('undefined') &&
        photoURL.startsWith('http')) {
      return photoURL;
    }
    
    const name = encodeURIComponent(displayName || username || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=a855f7&color=fff&size=${size}`;
  };

  useEffect(() => {
    if (!username) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        setNotFound(false);

        const q = query(collection(db, 'users'), where('username', '==', username));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setNotFound(true);
          return;
        }

        const userDoc = snapshot.docs[0];
        const data = userDoc.data();
        
        // Check privacy settings
        if (data.profilePrivacy === 'private' && auth.currentUser?.uid !== userDoc.id) {
          setNotFound(true);
          return;
        }

        // Enhanced profile data for the layout
        const profileData = {
          id: userDoc.id,
          username: data.username,
          displayName: data.displayName || username,
          photoURL: getSafeAvatarUrl(data.photoURL, data.displayName, data.username),
          bio: data.bio || '',
          joinedDate: data.joinedAt?.toDate?.().toLocaleDateString() || 'N/A',
          isVerified: data.verified || false,
          location: data.location,
          stats: {
            badges: (data.badges || []).length,
            blooms: 0, // Will be calculated below
            helped: 0  // Will be calculated below
          }
        };

        setUserData(profileData);
        setIsOwnProfile(auth.currentUser?.uid === userDoc.id);
        
        // Load comprehensive stats and update profile
        await loadUserStats(userDoc.id, profileData);
        await loadRecentActivity(userDoc.id);
        
        // Only load follow status if user is signed in and it's not their own profile
        if (auth.currentUser && auth.currentUser.uid !== userDoc.id) {
          await loadFollowStatus(userDoc.id);
        }
        
      } catch (err) {
        console.error('Failed to fetch public profile:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [username]);

  const loadUserStats = async (userId, profileData) => {
    try {
      const [flowersSnap, wateringsSnap, friendWateringsSnap] = await Promise.all([
        getDocs(query(collection(db, 'flowers'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'waterings'), where('wateredByUserId', '==', userId))),
        getDocs(query(collection(db, 'waterings'), where('seedOwnerId', '==', userId)))
      ]);

      const flowers = flowersSnap.docs.map(doc => doc.data());
      const blooms = flowers.filter(f => f.bloomed);
      const uniqueFriendsHelped = new Set(wateringsSnap.docs.map(doc => doc.data().seedOwnerId));
      const uniqueHelpersReceived = new Set(friendWateringsSnap.docs.map(doc => doc.data().wateredByUserId));
      
      // Calculate garden score
      const gardenScore = calculateGardenScore(flowers, wateringsSnap.size, uniqueFriendsHelped.size);
      
      const stats = {
        totalSeeds: flowers.length,
        totalBlooms: blooms.length,
        conversionRate: flowers.length > 0 ? ((blooms.length / flowers.length) * 100).toFixed(1) : 0,
        friendsHelped: uniqueFriendsHelped.size,
        helpersReceived: uniqueHelpersReceived.size,
        gardenScore,
        averageBloomTime: calculateAverageBloomTime(blooms),
        rareFlowers: blooms.filter(f => f.rarity === 'rare').length,
        specialSeeds: flowers.filter(f => f.specialSeed || f.songSeed).length,
        currentStreak: userData?.wateringStreak || 0,
        longestStreak: userData?.longestWateringStreak || 0
      };

      setUserStats(stats);

      // Update the profile data for the layout
      setUserData(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          blooms: stats.totalBlooms,
          helped: stats.friendsHelped
        }
      }));

    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadRecentActivity = async (userId) => {
    try {
      // Get recent blooms and activities
      const [bloomsSnap, wateringsSnap] = await Promise.all([
        getDocs(query(
          collection(db, 'flowers'),
          where('userId', '==', userId),
          where('bloomed', '==', true)
        )),
        getDocs(query(
          collection(db, 'waterings'),
          where('wateredByUserId', '==', userId)
        ))
      ]);

      const activities = [];

      // Add bloom activities
      bloomsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.bloomTime) {
          activities.push({
            type: 'bloom',
            timestamp: data.bloomTime.toDate(),
            description: `Bloomed a ${data.type} flower`,
            emoji: data.bloomedFlower || '🌸',
            flowerType: data.type
          });
        }
      });

      // Add helping activities (recent 10)
      wateringsSnap.docs.slice(-10).forEach(doc => {
        const data = doc.data();
        activities.push({
          type: 'helped',
          timestamp: data.timestamp?.toDate() || new Date(),
          description: `Helped water ${data.seedOwnerName || 'someone'}'s garden`,
          emoji: '💧',
          targetUser: data.seedOwnerName
        });
      });

      // Sort by timestamp and take recent 15
      activities.sort((a, b) => b.timestamp - a.timestamp);
      setRecentActivity(activities.slice(0, 15));

    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const loadFollowStatus = async (userId) => {
    if (!auth.currentUser || auth.currentUser.uid === userId) return;

    try {
      // Try to check if current user follows this user
      try {
        const followDoc = await getDoc(
          doc(db, 'users', auth.currentUser.uid, 'following', userId)
        );
        setIsFollowing(followDoc.exists());
      } catch (followError) {
        console.warn('Could not check following status - user may not have permission:', followError);
        setIsFollowing(false);
      }

      // Try to get follower count
      try {
        const followersSnap = await getDocs(
          collection(db, 'users', userId, 'followers')
        );
        setFollowerCount(followersSnap.size);
      } catch (followerError) {
        console.warn('Could not get follower count - profile may be private:', followerError);
        setFollowerCount(0);
      }

    } catch (error) {
      console.warn('Error loading follow status (this is normal for private profiles):', error);
    }
  };

  const handleFollow = async () => {
    if (!auth.currentUser || isOwnProfile) return;

    try {
      const userId = userData.id;
      const currentUserId = auth.currentUser.uid;

      if (isFollowing) {
        // Unfollow
        try {
          await Promise.all([
            deleteDoc(doc(db, 'users', currentUserId, 'following', userId)),
            deleteDoc(doc(db, 'users', userId, 'followers', currentUserId))
          ]);
          setIsFollowing(false);
          setFollowerCount(prev => Math.max(0, prev - 1));
          toast.success('Unfollowed successfully');
        } catch (unfollowError) {
          console.error('Error unfollowing:', unfollowError);
          toast.error('Failed to unfollow - you may not have permission');
        }
      } else {
        // Follow
        try {
          await Promise.all([
            setDoc(doc(db, 'users', currentUserId, 'following', userId), {
              username: userData.username,
              displayName: userData.displayName,
              photoURL: userData.photoURL,
              followedAt: new Date()
            }),
            setDoc(doc(db, 'users', userId, 'followers', currentUserId), {
              username: auth.currentUser.displayName,
              displayName: auth.currentUser.displayName,
              photoURL: auth.currentUser.photoURL,
              followedAt: new Date()
            })
          ]);
          setIsFollowing(true);
          setFollowerCount(prev => prev + 1);
          toast.success('Following!');
        } catch (followError) {
          console.error('Error following:', followError);
          toast.error('Failed to follow - profile may be private');
        }
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast.error('Failed to update follow status');
    }
  };

  const generateQRCode = () => {
    const profileUrl = `${window.location.origin}/u/${username}`;
    setShowQRCode(true);
  };

  const calculateGardenScore = (flowers, waterings, friendsHelped) => {
    const bloomPoints = flowers.filter(f => f.bloomed).length * 10;
    const helpPoints = waterings * 2;
    const friendPoints = friendsHelped * 5;
    const rarePoints = flowers.filter(f => f.rarity === 'rare').length * 20;
    return bloomPoints + helpPoints + friendPoints + rarePoints;
  };

  const calculateAverageBloomTime = (blooms) => {
    if (blooms.length === 0) return 0;
    
    const validBlooms = blooms.filter(b => b.createdAt && b.bloomTime);
    if (validBlooms.length === 0) return 0;
    
    const totalDays = validBlooms.reduce((sum, bloom) => {
      const created = new Date(bloom.createdAt);
      const bloomed = bloom.bloomTime.toDate();
      const days = Math.floor((bloomed - created) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    
    return Math.round(totalDays / validBlooms.length);
  };

  const currentPage = getCurrentPageFromPath(router.pathname);

  return (
    <PublicProfileLayout 
      username={username} 
      userData={userData} 
      currentPage={currentPage}
      loading={loading}
      notFound={notFound}
    >
      {/* Page Content */}
      <div className="space-y-6">
        
        {/* Enhanced Profile Header Content */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-16"></div>
          <CardContent className="relative pt-0 pb-6">
            
            {/* Profile Actions */}
            <div className="flex justify-end gap-2 mt-4">
              {!isOwnProfile && auth.currentUser && (
                <Button
                  onClick={handleFollow}
                  variant={isFollowing ? 'outline' : 'default'}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </Button>
              )}
              
              <Button onClick={generateQRCode} variant="outline">
                📱 Share
              </Button>
              
              {isOwnProfile && (
                <Button onClick={() => router.push('/garden/profile')} variant="outline">
                  ✏️ Edit Profile
                </Button>
              )}
            </div>

            {/* Follower info */}
            {followerCount > 0 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-600">👥 {followerCount} followers</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{userStats.totalBlooms || 0}</div>
              <p className="text-sm text-gray-600">Flowers Bloomed</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{userStats.friendsHelped || 0}</div>
              <p className="text-sm text-gray-600">Friends Helped</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{userStats.conversionRate || 0}%</div>
              <p className="text-sm text-gray-600">Success Rate</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{userStats.currentStreak || 0}</div>
              <p className="text-sm text-gray-600">Day Streak</p>
            </CardContent>
          </Card>
        </div>

        {/* Garden Score */}
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-purple-700 mb-2">🏆 Garden Score</h3>
            <div className="text-4xl font-bold text-purple-600 mb-2">{userStats.gardenScore || 0}</div>
            <p className="text-sm text-gray-600">
              Based on blooms, helping others, and rare collections
            </p>
          </CardContent>
        </Card>

        {/* Advanced Stats */}
        {(userStats.rareFlowers > 0 || userStats.specialSeeds > 0 || userStats.averageBloomTime > 0) && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-purple-700 mb-4">🏆 Garden Achievements</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {userStats.rareFlowers > 0 && (
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <div className="text-xl font-bold text-yellow-600">💎 {userStats.rareFlowers}</div>
                    <p className="text-sm text-yellow-700">Rare Flowers</p>
                  </div>
                )}
                
                {userStats.specialSeeds > 0 && (
                  <div className="text-center p-3 bg-indigo-50 rounded-lg">
                    <div className="text-xl font-bold text-indigo-600">✨ {userStats.specialSeeds}</div>
                    <p className="text-sm text-indigo-700">Special Seeds</p>
                  </div>
                )}
                
                {userStats.averageBloomTime > 0 && (
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xl font-bold text-green-600">📅 {userStats.averageBloomTime}</div>
                    <p className="text-sm text-green-700">Avg. Bloom Days</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Feed */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-purple-700 mb-4">📈 Recent Activity</h3>
            
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                    <span className="text-2xl">{activity.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    {activity.type === 'bloom' && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        {activity.flowerType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Modal */}
        {showQRCode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
              <h3 className="text-lg font-semibold mb-4">Share Profile</h3>
              <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <p className="text-gray-500">QR Code</p>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Scan to visit {userData?.displayName}'s garden
              </p>
              <Button onClick={() => setShowQRCode(false)}>Close</Button>
            </div>
          </div>
        )}
      </div>
    </PublicProfileLayout>
  );
}
