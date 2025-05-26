// pages/admin/index.js - Main Admin Dashboard
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { auth, db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSeeds: 0,
    totalBlooms: 0,
    activeToday: 0,
    pendingRequests: 0,
    reportedContent: 0,
    songLaunchDays: 0
  });
  
  // Charts data
  const [growthData, setGrowthData] = useState([]);
  const [seedTypeData, setSeedTypeData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Real-time updates
  const [liveMetrics, setLiveMetrics] = useState({
    onlineUsers: 0,
    queueLength: 0,
    errorRate: 0
  });

  // Check admin access
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/auth');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData?.role !== 'admin') {
          toast.error('Admin access required');
          router.push('/');
          return;
        }
        
        setIsAdmin(true);
        setLoading(false);
      } catch (err) {
        console.error('Error checking admin status:', err);
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch dashboard data
  useEffect(() => {
    if (!isAdmin) return;

    const fetchDashboardData = async () => {
      try {
        // Total users
        const usersSnap = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnap.size;

        // Total seeds and blooms
        const seedsSnap = await getDocs(collection(db, 'flowers'));
        const totalSeeds = seedsSnap.size;
        const totalBlooms = seedsSnap.docs.filter(doc => doc.data().bloomed).length;

        // Active users today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeQuery = query(
          collection(db, 'waterings'),
          where('timestamp', '>=', today)
        );
        const activeSnap = await getDocs(activeQuery);
        const uniqueUsers = new Set(activeSnap.docs.map(d => d.data().wateredByUserId));

        // Pending requests
        const requestsQuery = query(
          collection(db, 'usernameRequests'),
          where('status', '==', 'pending')
        );
        const requestsSnap = await getDocs(requestsQuery);

        // Song launch countdown
        const launchDate = new Date('2025-05-30');
        const daysUntil = Math.ceil((launchDate - new Date()) / (1000 * 60 * 60 * 24));

        setStats({
          totalUsers,
          totalSeeds,
          totalBlooms,
          activeToday: uniqueUsers.size,
          pendingRequests: requestsSnap.size,
          reportedContent: 0, // Implement when reports system is ready
          songLaunchDays: daysUntil
        });

        // Fetch growth data for last 7 days
        await fetchGrowthData();
        
        // Fetch seed type distribution
        await fetchSeedTypeData(seedsSnap);
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      }
    };

    fetchDashboardData();

    // Real-time activity feed
    const activityQuery = query(
      collection(db, 'waterings'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribeActivity = onSnapshot(activityQuery, (snapshot) => {
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().timestamp?.toDate?.() || new Date()
      }));
      setRecentActivity(activities);
    });

    // Refresh stats every 30 seconds
    const statsInterval = setInterval(fetchDashboardData, 30000);

    return () => {
      unsubscribeActivity();
      clearInterval(statsInterval);
    };
  }, [isAdmin]);

  const fetchGrowthData = async () => {
    const data = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      // Count new users
      const usersQuery = query(
        collection(db, 'users'),
        where('joinedAt', '>=', date),
        where('joinedAt', '<', nextDate)
      );
      const usersSnap = await getDocs(usersQuery);
      
      // Count new seeds
      const seedsQuery = query(
        collection(db, 'flowers'),
        where('createdAt', '>=', date.toISOString()),
        where('createdAt', '<', nextDate.toISOString())
      );
      const seedsSnap = await getDocs(seedsQuery);
      
      data.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        users: usersSnap.size,
        seeds: seedsSnap.size
      });
    }
    
    setGrowthData(data);
  };

  const fetchSeedTypeData = async (seedsSnapshot) => {
    const typeCount = {};
    
    seedsSnapshot.docs.forEach(doc => {
      const type = doc.data().type || 'Unknown';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    const data = Object.entries(typeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    
    setSeedTypeData(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl animate-spin mb-4">⚙️</div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🛠️ Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to Sharon's Garden Admin Panel</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon="👥"
            color="purple"
            link="/admin/users"
          />
          <StatCard
            title="Total Seeds"
            value={stats.totalSeeds}
            icon="🌱"
            color="green"
            link="/admin/statistics"
          />
          <StatCard
            title="Total Blooms"
            value={stats.totalBlooms}
            icon="🌸"
            color="pink"
            link="/admin/statistics"
          />
          <StatCard
            title="Active Today"
            value={stats.activeToday}
            icon="⚡"
            color="blue"
            link="/admin/users"
          />
          <StatCard
            title="Pending Requests"
            value={stats.pendingRequests}
            icon="📝"
            color="yellow"
            link="/admin/username-requests"
            alert={stats.pendingRequests > 0}
          />
          <StatCard
            title="Reports"
            value={stats.reportedContent}
            icon="🚨"
            color="red"
            link="/admin/moderation"
            alert={stats.reportedContent > 0}
          />
          <StatCard
            title="Launch In"
            value={`${stats.songLaunchDays}d`}
            icon="🎵"
            color="indigo"
            link="/admin/song-launch"
            alert={stats.songLaunchDays <= 7}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Growth Chart */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">📈 7-Day Growth</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="New Users"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="seeds" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="New Seeds"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Seed Types Distribution */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">🌼 Popular Seed Types</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={seedTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {seedTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">⚡ Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/admin/launch-monitor">
                  <Button className="w-full justify-start">
                    🚀 Launch Monitor
                  </Button>
                </Link>
                <Link href="/admin/notifications">
                  <Button className="w-full justify-start" variant="outline">
                    🔔 Send Notification
                  </Button>
                </Link>
                <Link href="/admin/touch">
                  <Button className="w-full justify-start" variant="outline">
                    💜 Sharon's Touch
                  </Button>
                </Link>
                <Link href="/admin/database">
                  <Button className="w-full justify-start" variant="outline">
                    🗄️ Database Tools
                  </Button>
                </Link>
                <Link href="/admin/command-center">
                <Button className="w-full justify-start" variant="outline">
                    🎮 Command Center
                  </Button>
                </Link>

                <Button 
                  onClick={() => router.push('/admin/settings')}
                  variant="outline"
                  className="w-full justify-start"
                >
                  ⚙️ System Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">🌊 Recent Activity</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                ) : (
                  recentActivity.map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="text-2xl">💧</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium text-purple-600">
                            {activity.wateredByUsername || 'Anonymous'}
                          </span>
                          {' watered '}
                          <span className="font-medium">
                            {activity.seedOwnerName || 'someone'}'s
                          </span>
                          {' '}
                          <span className="text-gray-600">
                            {activity.seedType || 'seed'}
                          </span>
                          {activity.resultedInBloom && (
                            <span className="text-green-600 font-medium"> and it bloomed! 🌸</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.time.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">🔧 System Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Database Status</p>
                <p className="text-2xl font-bold text-green-600">Healthy</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Queue Length</p>
                <p className="text-2xl font-bold text-blue-600">{liveMetrics.queueLength}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-purple-600">{liveMetrics.errorRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, color, link, alert = false }) {
  const router = useRouter();
  
  const colorClasses = {
    purple: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    green: 'bg-green-100 text-green-700 hover:bg-green-200',
    pink: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
    blue: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    yellow: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    red: 'bg-red-100 text-red-700 hover:bg-red-200',
    indigo: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
  };

  return (
    <Card 
      className={`${colorClasses[color]} cursor-pointer transition-all hover:shadow-lg relative ${
        alert ? 'ring-2 ring-offset-2 ring-' + color + '-500' : ''
      }`}
      onClick={() => router.push(link)}
    >
      <CardContent className="p-4 text-center">
        {alert && (
          <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
        )}
        <div className="text-3xl mb-2">{icon}</div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
