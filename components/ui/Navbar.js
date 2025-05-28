// components/ui/Navbar.js - Fixed Search Modal Z-Index Issue
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Button } from './button';
import { auth, googleProvider, db } from '../../lib/firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useNotificationCount } from '../../hooks/useOptimizedFirebase';
import toast from 'react-hot-toast';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [hasUnwatered, setHasUnwatered] = useState(false);
  const [publicMenuSeen, setPublicMenuSeen] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Admin panel state
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [adminStats, setAdminStats] = useState({
    pendingUsernameRequests: 0,
    reportedContent: 0,
    systemAlerts: 0,
    maintenanceMode: false
  });
  
  // Search functionality
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  
  // Get notification count
  const unreadNotifications = useNotificationCount();

  // Initialize dark mode from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedDarkMode = localStorage.getItem('darkMode');
      if (savedDarkMode) {
        setDarkMode(JSON.parse(savedDarkMode));
      } else {
        // Auto-detect system preference
        const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(systemDarkMode);
      }
    }
  }, []);

  // Auth state management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);

      if (currentUser) {
        await loadUserData(currentUser);
        await checkUnwateredSeeds(currentUser.uid);
      } else {
        resetUserState();
      }
    });

    return () => unsubscribe();
  }, []);

  // Load user data and profile
  const loadUserData = async (currentUser) => {
    try {
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile(data);
        setPublicMenuSeen(data.publicMenuSeen || false);
        
        // Check admin status
        if (data.role === 'admin' || data.role === 'moderator') {
          setIsAdmin(true);
          await fetchAdminStats();
        }
      } else {
        // Create user document if it doesn't exist
        await createUserDocument(currentUser);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Create user document for new users
  const createUserDocument = async (user) => {
    try {
      const baseUsername = (user.displayName || user.email || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      
      const uniqueUsername = baseUsername + Math.floor(Math.random() * 10000);

      const userData = {
        username: uniqueUsername,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
        public: true,
        joinedAt: serverTimestamp(),
        badges: [],
        publicMenuSeen: false
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      setUserProfile(userData);
      toast.success(`Welcome to Sharon's Garden! Your username is @${uniqueUsername}`);
    } catch (error) {
      console.error('Error creating user document:', error);
    }
  };

  // Check for unwatered seeds
  const checkUnwateredSeeds = async (userId) => {
    try {
      const flowersQuery = query(
        collection(db, 'flowers'),
        where('userId', '==', userId),
        where('bloomed', '==', false)
      );
      const snapshot = await getDocs(flowersQuery);
      
      const today = new Date().toDateString();
      let hasUnwatered = false;

      snapshot.docs.forEach(doc => {
        const lastWaterKey = `lastWatered_${doc.id}`;
        const lastWater = localStorage.getItem(lastWaterKey);
        if (!lastWater || new Date(lastWater).toDateString() !== today) {
          hasUnwatered = true;
        }
      });

      setHasUnwatered(hasUnwatered);
    } catch (error) {
      console.warn('Could not check unwatered seeds:', error);
    }
  };

  // Reset user state on logout
  const resetUserState = () => {
    setUserProfile(null);
    setHasUnwatered(false);
    setIsAdmin(false);
    setPublicMenuSeen(false);
    setShowCommunity(false);
    setShowAdminMenu(false);
  };

  // Fetch admin statistics
  const fetchAdminStats = async () => {
    if (!isAdmin) return;

    try {
      const [requestsSnap, reportsSnap, configSnap] = await Promise.all([
        getDocs(query(collection(db, 'usernameRequests'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'reports'), where('status', '==', 'pending'))),
        getDoc(doc(db, 'config', 'system'))
      ]);

      setAdminStats({
        pendingUsernameRequests: requestsSnap.size,
        reportedContent: reportsSnap.size,
        systemAlerts: 0, // Can be calculated based on system health
        maintenanceMode: configSnap.exists() ? (configSnap.data().maintenanceMode || false) : false
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  // Refresh admin stats periodically
  useEffect(() => {
    if (isAdmin && user) {
      const interval = setInterval(fetchAdminStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, user]);

  // Dark mode toggle with persistence
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', JSON.stringify(darkMode));
    }
  }, [darkMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Cmd/Ctrl + K for search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setShowSearch(true);
      }
      
      // Escape to close modals
      if (event.key === 'Escape') {
        setShowSearch(false);
        setShowAdminMenu(false);
        setShowCommunity(false);
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAdminMenu && !event.target.closest('.admin-menu-container')) {
        setShowAdminMenu(false);
      }
      if (showCommunity && !event.target.closest('.community-menu-container')) {
        setShowCommunity(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAdminMenu, showCommunity]);

  // Authentication handlers
  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithPopup(auth, googleProvider);
      toast.success('Welcome to Sharon\'s Garden! 🌸');
    } catch (err) {
      console.error('Login error:', err);
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("See you in the garden soon! 🌱");
      router.push('/');
    } catch (err) {
      console.error("Logout Error:", err);
      toast.error("Logout failed");
    }
  };

  // Community menu handler
  const handleOpenCommunity = async () => {
    setShowCommunity(!showCommunity);
    if (user && !publicMenuSeen) {
      await setDoc(doc(db, 'users', user.uid), { publicMenuSeen: true }, { merge: true });
      setPublicMenuSeen(true);
    }
  };

  // Search handler
  const handleSearch = (event) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  // Admin quick actions
  const handleToggleMaintenanceMode = async () => {
    try {
      const newMode = !adminStats.maintenanceMode;
      await setDoc(doc(db, 'config', 'system'), {
        maintenanceMode: newMode,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      }, { merge: true });
      
      setAdminStats(prev => ({ ...prev, maintenanceMode: newMode }));
      toast.success(`Maintenance mode ${newMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      toast.error('Failed to toggle maintenance mode');
    }
  };

  const handleClearCache = () => {
    if (confirm('This will clear all cached data and refresh the page. Continue?')) {
      localStorage.clear();
      sessionStorage.clear();
      toast.success('Cache cleared');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  // Navigation items with enhanced organization
  const navigationItems = [
    {
      href: "/",
      label: "🏠 Home",
      isActive: router.pathname === "/"
    },
    {
      href: "/garden/my",
      label: "🌱 My Garden",
      hasNotification: hasUnwatered,
      notificationText: "Seeds need watering!"
    },
    {
      href: "/notifications",
      label: "🔔 Notifications",
      hasNotification: unreadNotifications > 0,
      notificationCount: unreadNotifications
    },
    {
      href: "/garden/profile",
      label: "👤 Profile"
    },
    {
      href: "/garden/badges",
      label: "🏅 Badges"
    },
    {
      href: "/garden/settings",
      label: "⚙️ Settings"
    }
  ];

  const communityItems = [
    { href: "/explore", label: "🌸 Explore Feed", description: "See community activity" },
    { href: "/search", label: "🔍 Search", description: "Find users and content" },
    { href: "/rankings", label: "🏆 Leaderboard", description: "Top gardeners" },
    { href: "/top-badges", label: "🎖️ Top Badges", description: "Rare achievements" },
    { href: "/directory", label: "📖 Directory", description: "Browse all users" },
    ...(userProfile?.username ? [{
      href: `/u/${userProfile.username}/badges`,
      label: "📛 My Public Badges",
      description: "Your public badge page"
    }] : [])
  ];

  // Get safe avatar URL
  const getSafeAvatarUrl = (photoURL, displayName, size = 48) => {
    if (photoURL && photoURL !== '' && !photoURL.includes('photo.jpg')) {
      return photoURL;
    }
    const name = encodeURIComponent(displayName || 'User');
    return `https://ui-avatars.com/api/?name=${name}&background=a855f7&color=fff&size=${size}`;
  };

  return (
    <>
      {/* Menu Toggle Button - Enhanced */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`bg-purple-500 hover:bg-purple-600 text-white p-3 rounded-xl shadow-lg transition-all duration-200 ${
            sidebarOpen ? 'rotate-90' : ''
          }`}
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Enhanced Notification Bell */}
      {user && (
        <div className="fixed top-4 right-16 z-50">
          <Link href="/notifications">
            <button className="bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 p-3 rounded-xl shadow-lg hover:shadow-xl transition-all border border-purple-200 dark:border-purple-600 relative group">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-3.5-3.5a1.5 1.5 0 010-2.12l.5-.5a1.5 1.5 0 012.12 0L21 13.5V8a3 3 0 00-3-3H6a3 3 0 00-3 3v5.5l1.88-1.88a1.5 1.5 0 012.12 0l.5.5a1.5 1.5 0 010 2.12L4 17h5" />
              </svg>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center animate-pulse font-medium">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
              
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {unreadNotifications > 0 ? `${unreadNotifications} new notifications` : 'Notifications'}
                </div>
              </div>
            </button>
          </Link>
        </div>
      )}

      {/* Search Button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setShowSearch(true)}
          className="bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 p-3 rounded-xl shadow-lg hover:shadow-xl transition-all border border-purple-200 dark:border-purple-600 group"
          aria-label="Search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          {/* Keyboard shortcut hint */}
          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
              Search • ⌘K
            </div>
          </div>
        </button>
      </div>

      {/* FIXED: Search Modal with Much Higher Z-Index */}
      {showSearch && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20"
          style={{ zIndex: 9999 }}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4"
            style={{ zIndex: 10000 }}
          >
            <form onSubmit={handleSearch} className="p-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users, gardens, or flowers..."
                  className="flex-1 bg-transparent border-none outline-none text-lg placeholder-gray-400 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowSearch(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </form>
            
            {/* Quick search suggestions */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quick searches:</p>
              <div className="flex gap-2 flex-wrap">
                {['active gardeners', 'rare flowers', 'new users', 'special seeds'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setSearchQuery(suggestion);
                      handleSearch({ preventDefault: () => {} });
                    }}
                    className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Enhanced Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl p-6 z-40 transform transition-transform duration-300 overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🌸</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-purple-700 dark:text-white">Sharon's Garden</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Emotional Gardening</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2 mb-6">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center justify-between p-3 rounded-xl transition-all group ${
                item.isActive 
                  ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}>
                <span className="flex items-center gap-3">
                  {item.label}
                </span>
                {item.hasNotification && (
                  <div className="relative">
                    {item.notificationCount ? (
                      <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {item.notificationCount > 9 ? '9+' : item.notificationCount}
                      </span>
                    ) : (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" title={item.notificationText} />
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </nav>

        {/* Community Section */}
        <div className="mb-6 community-menu-container">
          <button
            onClick={handleOpenCommunity}
            className="flex items-center justify-between w-full p-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <span className="flex items-center gap-3">
              🌐 Community
              {!publicMenuSeen && (
                <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full animate-bounce">NEW</span>
              )}
            </span>
            <svg className={`w-4 h-4 transition-transform ${showCommunity ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showCommunity && (
            <div className="mt-2 ml-6 space-y-1">
              {communityItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="p-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                    <div className="font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">{item.description}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Admin Panel */}
        {isAdmin && (
          <div className="mb-6 admin-menu-container">
            <button
              onClick={() => setShowAdminMenu(!showAdminMenu)}
              className="flex items-center justify-between w-full p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
            >
              <span className="flex items-center gap-3">
                🛠 Admin Panel
                {(adminStats.pendingUsernameRequests + adminStats.reportedContent) > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {adminStats.pendingUsernameRequests + adminStats.reportedContent}
                  </span>
                )}
              </span>
              <svg className={`w-4 h-4 transition-transform ${showAdminMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showAdminMenu && (
              <div className="mt-2 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 shadow-lg max-h-64 overflow-y-auto">
                {/* Admin menu items with enhanced styling */}
                <div className="p-2 space-y-1">
                  <Link href="/admin">
                    <div className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                      <span>📊</span>
                      <div>
                        <div className="text-sm font-medium">Dashboard</div>
                        <div className="text-xs text-gray-500">System overview</div>
                      </div>
                    </div>
                  </Link>
                  
                  <Link href="/admin/username-requests">
                    <div className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                      <div className="flex items-center gap-3">
                        <span>📝</span>
                        <div>
                          <div className="text-sm font-medium">Username Requests</div>
                          <div className="text-xs text-gray-500">Pending approvals</div>
                        </div>
                      </div>
                      {adminStats.pendingUsernameRequests > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                          {adminStats.pendingUsernameRequests}
                        </span>
                      )}
                    </div>
                  </Link>
                  
                  {/* Quick Actions */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-2 px-2">Quick Actions</p>
                    <button
                      onClick={handleToggleMaintenanceMode}
                      className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-xs"
                    >
                      🚧 {adminStats.maintenanceMode ? 'Disable' : 'Enable'} Maintenance
                    </button>
                    <button
                      onClick={handleClearCache}
                      className="w-full text-left p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-xs"
                    >
                      🧹 Clear System Cache
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="mb-6">
          <Button 
            onClick={() => setDarkMode(!darkMode)} 
            variant="outline" 
            className="w-full justify-start"
          >
            {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
          </Button>
        </div>

        {/* User Profile Section */}
        {isLoading ? (
          <div className="animate-pulse">
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full mb-3"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
          </div>
        ) : user ? (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={getSafeAvatarUrl(user.photoURL, user.displayName)} 
                alt="Profile" 
                className="w-12 h-12 rounded-full border-2 border-purple-200 dark:border-purple-600"
                onError={(e) => {
                  e.target.src = getSafeAvatarUrl('', user.displayName);
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.displayName || 'Anonymous'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {userProfile?.username ? `@${userProfile.username}` : user.email}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {userProfile?.username && (
                <Link href={`/u/${userProfile.username}`}>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    👤 My Public Profile
                  </Button>
                </Link>
              )}
              
              <Button 
                onClick={handleLogout} 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
              >
                🚪 Sign Out
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <Button 
              onClick={handleLogin} 
              disabled={isLoading}
              className="w-full justify-center"
            >
              {isLoading ? '🌱 Connecting...' : '🌸 Sign In with Google'}
            </Button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
              Join thousands of gardeners growing their emotions into beautiful flowers
            </p>
          </div>
        )}
      </div>
    </>
  );
}