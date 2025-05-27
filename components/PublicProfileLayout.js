// components/PublicProfileLayout.js
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

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

// Unified Header Component
function PublicProfileHeader({ userData, showStats = true }) {
  return (
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

        {/* User Info */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
          <img
            src={userData?.photoURL || '/api/placeholder/80/80'}
            alt="Profile"
            className="w-20 h-20 rounded-full border-4 border-purple-200 dark:border-purple-600 shadow-lg bg-white"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName || userData?.username || 'User')}&background=a855f7&color=fff&size=80`;
            }}
          />
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {userData?.displayName || 'Anonymous Gardener'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">@{userData?.username}</p>
            
            {userData?.bio && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 max-w-md">
                {userData.bio}
              </p>
            )}
            
            <div className="flex items-center justify-center md:justify-start gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
              <span>🌱 Joined {userData?.joinedDate || 'Recently'}</span>
              {userData?.isVerified && (
                <span className="text-blue-600 dark:text-blue-400">✓ Verified</span>
              )}
              {userData?.location && (
                <span>📍 {userData.location}</span>
              )}
            </div>
          </div>

          {/* Quick Stats */}
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
  );
}

// Navigation Tabs Component
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
      // You'd want to show a toast here
      console.log('Profile link copied to clipboard!');
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
              variant="outline" 
              size="sm" 
              onClick={handleShare}
              className="hidden sm:inline-flex"
            >
              📱 Share
            </Button>
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

// Loading Component
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

// Not Found Component
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

// Hook for managing public profile data
export function usePublicProfile(username) {
  const [userData, setUserData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    if (!username) return;

    // This would typically fetch from your database
    // For now, returning mock data structure
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        
        // Your actual fetch logic would go here
        // const userData = await fetchPublicUserData(username);
        
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
