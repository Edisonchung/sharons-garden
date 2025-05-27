// pages/u/[username]/index.js - Updated to work with Unified Header (followers/following removed)
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
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

  const generateQRCode = () => {
    const profileUrl = `${window.location.origin}/u/${username}`;
    
    // Create a simple QR code placeholder or use a library
    const qrText = `Visit ${userData?.displayName || username}'s garden at:\n${profileUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${userData?.displayName || username}'s Garden Profile`,
        text: `Check out ${userData?.displayName || username}'s garden in Sharon's Garden!`,
        url: profileUrl
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(profileUrl);
        toast.success('Profile link copied!');
      });
    } else {
      navigator.clipboard.writeText(profileUrl);
      toast.success('Profile link copied!');
    }
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
        
        {/* Garden Overview */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4">
              🌱 Garden Overview
            </h3>
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{userStats.totalBlooms || 0}</div>
                <p className="text-sm text-green-700 dark:text-green-400">Flowers Bloomed</p>
              </div>
              
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{userStats.friendsHelped || 0}</div>
                <p className="text-sm text-blue-700 dark:text-blue-400">Friends Helped</p>
              </div>
              
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{userStats.conversionRate || 0}%</div>
                <p className="text-sm text-purple-700 dark:text-purple-400">Success Rate</p>
              </div>
              
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{userStats.currentStreak || 0}</div>
                <p className="text-sm text-orange-700 dark:text-orange-400">Day Streak</p>
              </div>
            </div>

            {/* Garden Score Section */}
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <h4 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">
                🏆 Garden Score
              </h4>
              <div className="text-3xl font-bold text-purple-600 mb-2">{userStats.gardenScore || 0}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Based on blooms, helping others, and rare collections
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Garden Statistics */}
        {(userStats.rareFlowers > 0 || userStats.specialSeeds > 0 || userStats.averageBloomTime > 0) && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4">
                ✨ Special Achievements
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {userStats.rareFlowers > 0 && (
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">💎 {userStats.rareFlowers}</div>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">Rare Flowers</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">Collector's Pride</p>
                  </div>
                )}
                
                {userStats.specialSeeds > 0 && (
                  <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                    <div className="text-2xl font-bold text-indigo-600 mb-1">✨ {userStats.specialSeeds}</div>
                    <p className="text-sm text-indigo-700 dark:text-indigo-400">Special Seeds</p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-500 mt-1">Exclusive Collection</p>
                  </div>
                )}
                
                {userStats.averageBloomTime > 0 && (
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="text-2xl font-bold text-green-600 mb-1">📅 {userStats.averageBloomTime}</div>
                    <p className="text-sm text-green-700 dark:text-green-400">Avg. Bloom Days</p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-1">Gardening Efficiency</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Community Impact */}
        {(userStats.friendsHelped > 0 || userStats.helpersReceived > 0) && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4">
                🤝 Community Impact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{userStats.friendsHelped || 0}</div>
                  <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Gardeners Helped</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    Spreading kindness across the community
                  </p>
                </div>
                
                <div className="text-center p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                  <div className="text-3xl font-bold text-pink-600 mb-2">{userStats.helpersReceived || 0}</div>
                  <p className="text-sm text-pink-700 dark:text-pink-400 font-medium">Community Helpers</p>
                  <p className="text-xs text-pink-600 dark:text-pink-500 mt-1">
                    Friends who've helped this garden grow
                  </p>
                </div>
              </div>
              
              {/* Encouragement message for interaction */}
              <div className="mt-4 p-3 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-lg text-center">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  💧 Visit their garden to help water their seeds and grow the community!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Feed */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                📈 Recent Activity
              </h3>
              {recentActivity.length > 10 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/u/${username}/timeline`)}
                >
                  📖 View Full Timeline
                </Button>
              )}
            </div>
            
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🌱</div>
                <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Activity will appear here as they garden
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <span className="text-2xl flex-shrink-0">{activity.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300">{activity.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                    {activity.type === 'bloom' && (
                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full flex-shrink-0">
                        {activity.flowerType}
                      </span>
                    )}
                  </div>
                ))}
                
                {recentActivity.length > 10 && (
                  <div className="text-center pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push(`/u/${username}/timeline`)}
                    >
                      View {recentActivity.length - 10} more activities →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Garden Actions */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-4">
              🌿 Garden Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <Button 
                onClick={() => router.push(`/u/${username}/garden`)}
                className="w-full"
              >
                💧 Water Their Garden
              </Button>
              
              <Button 
                onClick={() => router.push(`/u/${username}/badges`)}
                variant="outline"
                className="w-full"
              >
                🏅 View Badges
              </Button>
              
              <Button 
                onClick={generateQRCode}
                variant="outline"
                className="w-full"
              >
                📱 Share Profile
              </Button>
            </div>
            
            {/* Profile Actions for Own Profile */}
            {isOwnProfile && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-center">
                  This is your profile - manage your garden settings
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button 
                    onClick={() => router.push('/garden/profile')}
                    variant="outline"
                    className="w-full"
                  >
                    ✏️ Edit Profile
                  </Button>
                  <Button 
                    onClick={() => router.push('/garden/settings')}
                    variant="outline"
                    className="w-full"
                  >
                    ⚙️ Privacy Settings
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call to Action for Non-Members */}
        {!auth.currentUser && (
          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">
                🌱 Join the Community
              </h3>
              <p className="text-purple-600 dark:text-purple-400 mb-4">
                Start your own emotional garden and connect with {userData?.displayName} and other gardeners!
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button onClick={() => router.push('/auth')}>
                  🌸 Start Your Garden
                </Button>
                <Button variant="outline" onClick={() => router.push('/explore')}>
                  👥 Explore Community
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PublicProfileLayout>
  );
}
