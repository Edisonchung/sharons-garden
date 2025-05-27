// components/PublicProfileLayout.js - Enhanced with Followers/Following
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

// Main Layout Wrapper
export function PublicProfileLayout({ 
  username, 
  userData, 
  currentPage, 
  children,
  loading = false,
  notFound = false,
  showStats = true 
}) {
  if (loading) {
    return <PublicProfileLoading username={username} />;
  }

  if (notFound) {
    return <PublicProfileNotFound username={username} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 dark:from-gray-900 dark:to-black">
      <PublicProfileHeader userData={userData} showStats={showStats} />
      <PublicProfileNavigation username={username} currentPage={currentPage} />
      <main className="max-w-6xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}

// Enhanced Header Component with Followers/Following
function PublicProfileHeader({ userData, showStats = true }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersData, setFollowersData] = useState([]);
  const [followingData, setFollowingData] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsOwnProfile(user?.uid === userData?.id);
      
      if (userData?.id) {
        await loadFollowData();
        
        if (user && user.uid !== userData.id) {
          await checkFollowStatus(user.uid);
        }
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.id]);

  const loadFollowData = async () => {
    if (!userData?.id) return;

    try {
      // Load followers
      const followersSnap = await getDocs(collection(db, 'users', userData.id, 'followers'));
      const followers = followersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFollowersData(followers);
      setFollowerCount(followers.length);

      // Load following
      const followingSnap = await getDocs(collection(db, 'users', userData.id, 'following'));
      const following = followingSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFollowingData(following);
      setFollowingCount(following.length);

    } catch (error) {
      console.warn('Could not load follow data (profile may be private):', error);
      setFollowerCount(0);
      setFollowingCount(0);
    }
  };

  const checkFollowStatus = async (currentUserId) => {
    try {
      const followDoc = await getDoc(
        doc(db, 'users', currentUserId, 'following', userData.id)
      );
      setIsFollowing(followDoc.exists());
    } catch (error) {
      console.warn('Could not check follow status:', error);
      setIsFollowing(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || isOwnProfile) return;

    try {
      const currentUserId = currentUser.uid;
      const targetUserId = userData.id;

      if (isFollowing) {
        // Unfollow
        await Promise.all([
          deleteDoc(doc(db, 'users', currentUserId, 'following', targetUserId)),
          deleteDoc(doc(db, 'users', targetUserId, 'followers', currentUserId))
        ]);
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        
        // Remove from local followers data
        setFollowersData(prev => prev.filter(f => f.id !== currentUserId));
        
        toast.success('Unfollowed successfully');
      } else {
        // Follow
        const followData = {
          username: currentUser.displayName || currentUser.email,
          displayName: currentUser.displayName || currentUser.email,
          photoURL: currentUser.photoURL || '',
          followedAt: new Date()
        };

        const followerData = {
          username: userData.username,
          displayName: userData.displayName,
          photoURL: userData.photoURL || '',
          followedAt: new Date()
        };

        await Promise.all([
          setDoc(doc(db, 'users', currentUserId, 'following', targetUserId), followerData),
          setDoc(doc(db, 'users', targetUserId, 'followers', currentUserId), followData)
        ]);
        
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        
        // Add to local followers data
        setFollowersData(prev => [...prev, { id: currentUserId, ...followData }]);
        
        toast.success('Following!');
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      toast.error('Failed to update follow status');
    }
  };

  const getSafeImageUrl = (photoURL, displayName, username) => {
    if (photoURL && photoURL !== '' && !photoURL.includes('photo.jpg') && photoURL !== 'undefined') {
      return photoURL;
    }
    const name = encodeURIComponent(displayName || username || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=a855f7&color=fff&size=80`;
  };

  if (!userData) return null;

  return (
    <>
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b border-purple-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto p-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <Link href="/" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
              🏠 Home
            </Link>
            <span>›</span>
            <Link href="/explore" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
              👥 Explore
            </Link>
            <span>›</span>
            <span className="text-purple-700 dark:text-purple-300 font-medium">
              @{userData?.username}
            </span>
          </div>

          {/* Enhanced User Info with Follow System */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            
            {/* Profile Image */}
            <img
              src={getSafeImageUrl(userData.photoURL, userData.displayName, userData.username)}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-purple-200 dark:border-purple-600 shadow-lg bg-white"
              onError={(e) => {
                e.target.src = getSafeImageUrl('', userData.displayName, userData.username);
              }}
            />
            
            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {userData.displayName || 'Anonymous Gardener'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">@{userData.username}</p>
              
              {userData.bio && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 max-w-md">
                  {userData.bio}
                </p>
              )}
              
              {/* Enhanced Info Row with Follow Counts */}
              <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                <span>🌱 Joined {userData.joinedDate || 'Recently'}</span>
                
                {userData.isVerified && (
                  <span className="text-blue-600 dark:text-blue-400">✓ Verified</span>
                )}
                
                {userData.location && (
                  <span>📍 {userData.location}</span>
                )}
              </div>

              {/* Followers/Following Counts - Interactive */}
              <div className="flex items-center justify-center md:justify-start gap-6 mt-3">
                <button
                  onClick={() => setShowFollowersModal(true)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1 rounded-lg transition-colors"
                  disabled={loading}
                >
                  <span className="font-bold text-purple-700 dark:text-purple-300">{followerCount}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">
                    {followerCount === 1 ? 'Follower' : 'Followers'}
                  </span>
                </button>
                
                <button
                  onClick={() => setShowFollowingModal(true)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1 rounded-lg transition-colors"
                  disabled={loading}
                >
                  <span className="font-bold text-purple-700 dark:text-purple-300">{followingCount}</span>
                  <span className="text-gray-600 dark:text-gray-400 ml-1">Following</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              {/* Follow/Unfollow Button */}
              {!isOwnProfile && currentUser && (
                <Button
                  onClick={handleFollow}
                  disabled={loading}
                  variant={isFollowing ? 'outline' : 'default'}
                  className="min-w-[120px]"
                >
                  {loading ? '...' : isFollowing ? '✓ Following' : '+ Follow'}
                </Button>
              )}
              
              {/* Share Profile Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `${window.location.origin}/u/${userData.username}`;
                  if (navigator.share) {
                    navigator.share({
                      title: `${userData.displayName}'s Garden Profile`,
                      text: `Check out ${userData.displayName}'s garden in Sharon's Garden!`,
                      url: url
                    }).catch(console.error);
                  } else {
                    navigator.clipboard.writeText(url);
                    toast.success('Profile link copied!');
                  }
                }}
              >
                📱 Share
              </Button>

              {/* Edit Profile Button (for own profile) */}
              {isOwnProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = '/garden/profile'}
                >
                  ✏️ Edit Profile
                </Button>
              )}
            </div>

            {/* Quick Stats (if enabled) */}
            {showStats && userData?.stats && (
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{userData.stats.blooms || 0}</div>
                  <div className="text-gray-600 dark:text-gray-400">Blooms</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">{userData.stats.helped || 0}</div>
                  <div className="text-gray-600 dark:text-gray-400">Helped</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">{userData.stats.badges || 0}</div>
                  <div className="text-gray-600 dark:text-gray-400">Badges</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Followers Modal */}
      {showFollowersModal && (
        <FollowListModal
          title="Followers"
          users={followersData}
          onClose={() => setShowFollowersModal(false)}
        />
      )}

      {/* Following Modal */}
      {showFollowingModal && (
        <FollowListModal
          title="Following"
          users={followingData}
          onClose={() => setShowFollowingModal(false)}
        />
      )}
    </>
  );
}

// Follow List Modal Component
function FollowListModal({ title, users, onClose }) {
  const router = useRouter();

  const getSafeImageUrl = (photoURL, displayName, username) => {
    if (photoURL && photoURL !== '' && !photoURL.includes('photo.jpg')) {
      return photoURL;
    }
    const name = encodeURIComponent(displayName || username || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=a855f7&color=fff&size=40`;
  };

  const handleUserClick = (username) => {
    onClose();
    router.push(`/u/${username}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">
            {title} ({users.length})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl"
          >
            ✕
          </button>
        </div>

        {/* User List */}
        <div className="overflow-y-auto max-h-96">
          {users.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-gray-500 dark:text-gray-400">
                No {title.toLowerCase()} yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleUserClick(user.username)}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={getSafeImageUrl(user.photoURL, user.displayName, user.username)}
                      alt="Profile"
                      className="w-10 h-10 rounded-full border border-purple-200"
                      onError={(e) => {
                        e.target.src = getSafeImageUrl('', user.displayName, user.username);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        @{user.username}
                      </p>
                    </div>
                    <div className="text-sm text-gray-400">
                      →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Navigation Tabs Component (unchanged)
function PublicProfileNavigation({ username, currentPage }) {
  const router = useRouter();
  
  const navItems = [
    { key: 'profile', label: 'Profile', icon: '👤', path: `/u/${username}` },
    { key: 'garden', label: 'Garden', icon: '🌱', path: `/u/${username}/garden` },
    { key: 'badges', label: 'Badges', icon: '🏅', path: `/u/${username}/badges` },
    { key: 'timeline', label: 'Timeline', icon: '📖', path: `/u/${username}/timeline` }
  ];

  const handleNavigation = (path) => {
    router.push(path);
  };

  const handleShare = () => {
    const url = `${window.location.origin}/u/${username}`;
    if (navigator.share) {
      navigator.share({
        title: `${username}'s Garden Profile`,
        text: `Check out ${username}'s garden in Sharon's Garden!`,
        url: url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Profile link copied!');
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* Main Navigation */}
          <div className="flex overflow-x-auto scrollbar-hide">
            {navItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavigation(item.path)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  currentPage === item.key
                    ? 'border-purple-500 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-purple-700 dark:hover:text-purple-300 hover:border-purple-300'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 ml-4">
            <Button 
              size="sm"
              onClick={() => handleNavigation(`/u/${username}/garden`)}
              className="hidden sm:inline-flex"
            >
              💧 Water Garden
            </Button>
            
            {/* Mobile menu button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShare}
              className="sm:hidden"
            >
              📱
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

// Loading Component (unchanged)
function PublicProfileLoading({ username }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 dark:from-gray-900 dark:to-black flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="w-20 h-20 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6 mx-auto"></div>
            </div>
          </div>
          <p className="text-purple-700 dark:text-purple-300 mt-6">
            Loading @{username}'s profile...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Not Found Component (unchanged)
function PublicProfileNotFound({ username }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-100 to-purple-200 dark:from-gray-900 dark:to-black flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">
            Profile Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {username ? (
              <>User @{username} not found or their profile is private.</>
            ) : (
              <>This profile doesn't exist or is private.</>
            )}
          </p>
          
          <div className="space-y-3">
            <Button 
              className="w-full"
              onClick={() => router.push('/')}
            >
              🏠 Go to Main Garden
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/explore')}
            >
              👥 Explore Other Profiles
            </Button>
          </div>
          
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            <p>Looking for someone else?</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-1"
              onClick={() => router.push('/search')}
            >
              🔍 Search Users
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Utility function to extract page type from pathname
export function getCurrentPageFromPath(pathname) {
  if (pathname.includes('/badges')) return 'badges';
  if (pathname.includes('/garden')) return 'garden';
  if (pathname.includes('/timeline')) return 'timeline';
  return 'profile';
}

// Hook for managing public profile data (unchanged)
export function usePublicProfile(username) {
  const [userData, setUserData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    if (!username) return;

    const fetchUserData = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        
        // Your actual fetch logic would go here
        
        // Mock implementation - replace with actual API call
        setTimeout(() => {
          setUserData({
            username,
            displayName: 'Demo User',
            photoURL: null,
            bio: 'Growing emotions into beautiful flowers 🌸',
            joinedDate: 'March 2024',
            isVerified: false,
            stats: {
              blooms: 12,
              helped: 24,
              badges: 8
            }
          });
          setLoading(false);
        }, 1000);
        
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        setNotFound(true);
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username]);

  return { userData, loading, notFound };
}
