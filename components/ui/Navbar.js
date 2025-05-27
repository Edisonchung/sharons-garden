// components/ui/Navbar.js - Latest Version with Enhanced Admin Panel
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [hasUnwatered, setHasUnwatered] = useState(false);
  const [publicMenuSeen, setPublicMenuSeen] = useState(false);
  const [showCommunity, setShowCommunity] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  
  // Admin panel state
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [pendingUsernameRequests, setPendingUsernameRequests] = useState(0);
  const [reportedContent, setReportedContent] = useState(0);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // Get notification count
  const unreadNotifications = useNotificationCount();

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);

    if (currentUser) {
      // ... existing code for checking unwatered flowers ...

      // Get user data including username
      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile(data); // Store full user profile
        setPublicMenuSeen(data.publicMenuSeen || false);
        if (data.role === 'admin') {
          setIsAdmin(true);
          fetchAdminStats();
        }
      }
    } else {
      setUserProfile(null); // Clear profile when logged out
      setHasUnwatered(false);
      setIsAdmin(false);
    }
  });

  return () => unsubscribe();
}, []);

  // Fetch admin statistics
  const fetchAdminStats = async () => {
    if (!isAdmin) return;

    try {
      // Username requests
      const requestsQuery = query(
        collection(db, 'usernameRequests'),
        where('status', '==', 'pending')
      );
      const requestsSnap = await getDocs(requestsQuery);
      setPendingUsernameRequests(requestsSnap.size);

      // Reported content (when implemented)
      const reportsQuery = query(
        collection(db, 'reports'),
        where('status', '==', 'pending')
      );
      const reportsSnap = await getDocs(reportsQuery);
      setReportedContent(reportsSnap.size);

      // Check maintenance mode
      const configDoc = await getDoc(doc(db, 'config', 'system'));
      if (configDoc.exists()) {
        setMaintenanceMode(configDoc.data().maintenanceMode || false);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    }
  };

  // Refresh admin stats every 30 seconds
  useEffect(() => {
    if (isAdmin && user) {
      const interval = setInterval(fetchAdminStats, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      toast.error("Login failed. Please try again.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
    } catch (err) {
      console.error("Logout Error:", err.message);
      toast.error("Logout failed");
    }
  };

  const handleOpenCommunity = async () => {
    setShowCommunity(!showCommunity);
    if (user && !publicMenuSeen) {
      await setDoc(doc(db, 'users', user.uid), { publicMenuSeen: true }, { merge: true });
      setPublicMenuSeen(true);
    }
  };

  // Admin quick actions
  const handleToggleMaintenanceMode = async () => {
    try {
      await setDoc(doc(db, 'config', 'system'), {
        maintenanceMode: !maintenanceMode,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      }, { merge: true });
      
      setMaintenanceMode(!maintenanceMode);
      toast.success(`Maintenance mode ${!maintenanceMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      toast.error('Failed to toggle maintenance mode');
    }
  };

  const handleClearCache = () => {
    if (confirm('This will clear all cached data. Continue?')) {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear Firebase cache if using the optimized hooks
      if (window.clearFirebaseCache) {
        window.clearFirebaseCache();
      }
      
      toast.success('Cache cleared successfully');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  // Close admin menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showAdminMenu && !event.target.closest('.admin-menu-container')) {
        setShowAdminMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showAdminMenu]);

  return (
    <>
      {/* Menu Toggle Button */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-purple-500 text-white p-2 rounded-md shadow-md hover:bg-purple-600 transition"
        >
          ☰
        </button>
      </div>

      {/* Notification Bell - Fixed Position */}
      {user && (
        <div className="fixed top-4 right-4 z-50">
          <Link href="/notifications">
            <button className="bg-white text-purple-600 p-2 rounded-full shadow-lg hover:shadow-xl transition-all relative border border-purple-200">
              <span className="text-xl">🔔</span>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          </Link>
        </div>
      )}

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-pink-100 dark:bg-gray-900 shadow-xl p-6 z-40 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-purple-700 dark:text-white">🌸 Sharon's Garden</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-xl font-bold text-purple-700 dark:text-white"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-4 relative">
          <Link href="/" className="text-purple-700 dark:text-white hover:underline">
            🏠 Home
          </Link>

          <div className="relative">
            <Link href="/garden/my" className="text-purple-700 dark:text-white hover:underline">
              🌱 My Garden
            </Link>
            {hasUnwatered && (
              <span
                className="absolute -top-1 -right-3 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-ping"
                title="Some seeds need watering"
              >
                !
              </span>
            )}
          </div>

          {/* Notifications Link */}
          <div className="relative">
            <Link href="/notifications" className="text-purple-700 dark:text-white hover:underline">
              🔔 Notifications
            </Link>
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-3 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </div>

          <Link href="/garden/profile" className="text-purple-700 dark:text-white hover:underline">
            👤 Profile
          </Link>
          <Link href="/garden/badges" className="text-purple-700 dark:text-white hover:underline">
            🏅 Badges
          </Link>
          <Link href="/garden/settings" className="text-purple-700 dark:text-white hover:underline">
            ⚙️ Settings
          </Link>

          {/* Community Dropdown */}
          <div className="relative">
            <button
              onClick={handleOpenCommunity}
              className="text-purple-700 dark:text-white hover:underline flex items-center gap-1"
            >
              🌐 Community
              {!publicMenuSeen && (
                <span className="text-xs text-red-600 font-bold animate-bounce">🆕</span>
              )}
            </button>
            {showCommunity && (
              <div className="ml-4 mt-2 flex flex-col gap-2 text-sm text-purple-700 dark:text-white">
                <Link href="/explore" className="hover:underline">🌸 Explore Feed</Link>
                <Link href="/rankings" className="hover:underline">🏆 Leaderboard</Link>
                <Link href="/top-badges" className="hover:underline">🎖️ Top Badges</Link>
                <Link href={`/u/${user?.displayName || 'username'}/badges`} className="hover:underline">
                  📛 My Public Badge Page
                </Link>
              </div>
            )}
          </div>

          {/* Admin Panel Dropdown */}
          {isAdmin && (
            <div className="relative admin-menu-container">
              <button
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                className="text-purple-700 dark:text-white hover:underline flex items-center gap-1"
              >
                🛠 Admin Panel
                <span className="text-xs">▼</span>
              </button>
              
              {showAdminMenu && (
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-purple-200 dark:border-gray-700 z-50 max-h-[70vh] overflow-y-auto">
                  <div className="py-2">
                    {/* Admin Dashboard */}
                    <Link href="/admin">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>📊</span>
                          <div>
                            <div className="font-medium">Dashboard</div>
                            <div className="text-xs text-gray-500">Overview & stats</div>
                          </div>
                        </span>
                      </div>
                    </Link>

                    {/* Launch Monitoring */}
                    <Link href="/admin/launch-monitor">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>🚀</span>
                          <div>
                            <div className="font-medium">Launch Monitor</div>
                            <div className="text-xs text-gray-500">Real-time system metrics</div>
                          </div>
                        </span>
                      </div>
                    </Link>

                    {/* Username Requests */}
                    <Link href="/admin/username-requests">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>📝</span>
                          <div className="flex-1">
                            <div className="font-medium">Username Requests</div>
                            <div className="text-xs text-gray-500">Approve/reject changes</div>
                          </div>
                          {pendingUsernameRequests > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                              {pendingUsernameRequests}
                            </span>
                          )}
                        </span>
                      </div>
                    </Link>

                    {/* User Management */}
                    <Link href="/admin/users">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>👥</span>
                          <div>
                            <div className="font-medium">User Management</div>
                            <div className="text-xs text-gray-500">View & manage users</div>
                          </div>
                        </span>
                      </div>
                    </Link>

                    {/* Garden Statistics */}
                    <Link href="/admin/statistics">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>📊</span>
                          <div>
                            <div className="font-medium">Garden Statistics</div>
                            <div className="text-xs text-gray-500">Analytics & insights</div>
                          </div>
                        </span>
                      </div>
                    </Link>

                    {/* Content Moderation */}
                    <Link href="/admin/moderation">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>🔍</span>
                          <div className="flex-1">
                            <div className="font-medium">Content Moderation</div>
                            <div className="text-xs text-gray-500">Review reported content</div>
                          </div>
                          {reportedContent > 0 && (
                            <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">
                              {reportedContent}
                            </span>
                          )}
                        </span>
                      </div>
                    </Link>

                    {/* Sharon's Touch */}
                    <Link href="/admin/touch">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>💜</span>
                          <div>
                            <div className="font-medium">Sharon's Touch</div>
                            <div className="text-xs text-gray-500">Bless special flowers</div>
                          </div>
                        </span>
                      </div>
                    </Link>

                    {/* Song Launch Manager */}
                    <Link href="/admin/song-launch">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>🎵</span>
                          <div>
                            <div className="font-medium">Song Launch</div>
                            <div className="text-xs text-gray-500">Manage launch features</div>
                          </div>
                        </span>
                      </div>
                    </Link>

                    {/* Notifications Manager */}
                    <Link href="/admin/notifications">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>🔔</span>
                          <div>
                            <div className="font-medium">Send Notifications</div>
                            <div className="text-xs text-gray-500">Broadcast to all users</div>
                          </div>
                        </span>
                      </div>
                    </Link>

                    {/* Badge Management */}
                    <Link href="/admin/badges">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>🏅</span>
                          <div>
                            <div className="font-medium">Badge Management</div>
                            <div className="text-xs text-gray-500">Create & assign badges</div>
                          </div>
                        </span>
                      </div>
                    </Link>

                    {/* Database Tools */}
                    <Link href="/admin/database">
                      <div className="block px-4 py-2 text-sm hover:bg-purple-50 dark:hover:bg-gray-700 cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>🗄️</span>
                          <div>
                            <div className="font-medium">Database Tools</div>
                            <div className="text-xs text-gray-500">Backup & maintenance</div>
                          </div>
                        </span>
                      </div>
                    </Link>

                    <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                    {/* Quick Actions */}
                    <div className="px-4 py-2">
                      <p className="text-xs font-medium text-gray-500 mb-2">Quick Actions</p>
                      <div className="space-y-1">
                        <button
                          onClick={handleToggleMaintenanceMode}
                          className="w-full text-left text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded hover:bg-yellow-200 dark:hover:bg-yellow-800"
                        >
                          🚧 {maintenanceMode ? 'Disable' : 'Enable'} Maintenance Mode
                        </button>
                        <button
                          onClick={handleClearCache}
                          className="w-full text-left text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                        >
                          🧹 Clear System Cache
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button onClick={() => setDarkMode(!darkMode)} variant="outline" className="mt-2">
            {darkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
          </Button>

          {/* User Profile Section */}
          {user ? (
            <div className="mt-4">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full mb-2" />
              ) : (
                <div className="w-12 h-12 rounded-full mb-2 bg-gray-500 text-white flex items-center justify-center text-xl">
                  {user.displayName ? user.displayName.charAt(0) : 'U'}
                </div>
              )}
              <span className="text-sm text-gray-800 dark:text-gray-200 block mb-2">
                Hi, {user.displayName || user.email}
              </span>
              <Button onClick={handleLogout} variant="outline">Logout</Button>
            </div>
          ) : (
            <Button onClick={handleLogin} className="mt-4">Login with Google</Button>
          )}
        </nav>
      </div>
    </>
  );
}
