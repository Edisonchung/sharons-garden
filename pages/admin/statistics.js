// pages/admin/statistics.js - Comprehensive Garden Analytics
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  limit
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function GardenStatisticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dateRange, setDateRange] = useState('7days');
  
  // Overview Stats
  const [overview, setOverview] = useState({
    totalUsers: 0,
    totalSeeds: 0,
    totalBlooms: 0,
    totalWaterings: 0,
    averageBloomTime: 0,
    conversionRate: 0,
    dailyActiveUsers: 0,
    weeklyActiveUsers: 0
  });
  
  // Growth Metrics
  const [growthData, setGrowthData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  
  // Seed Analytics
  const [seedTypeDistribution, setSeedTypeDistribution] = useState([]);
  const [seedTypePerformance, setSeedTypePerformance] = useState([]);
  const [bloomTimeDistribution, setBloomTimeDistribution] = useState([]);
  
  // User Behavior
  const [userEngagement, setUserEngagement] = useState({
    averageSeedsPerUser: 0,
    averageBloomsPerUser: 0,
    topGardeners: [],
    inactiveUsers: 0,
    churnRate: 0
  });
  
  // Social Analytics
  const [socialMetrics, setSocialMetrics] = useState({
    totalShares: 0,
    totalFriendWaterings: 0,
    viralCoefficient: 0,
    mostSharedFlowers: []
  });
  
  // Song Launch Specific
  const [songLaunchMetrics, setSongLaunchMetrics] = useState({
    melodySeedsClaimed: 0,
    melodySeedsBloomed: 0,
    melodySeedConversion: 0,
    dailyMelodyClaims: []
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
        loadAllStatistics();
      } catch (err) {
        console.error('Error checking admin status:', err);
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Load all statistics
  const loadAllStatistics = async () => {
    try {
      await Promise.all([
        loadOverviewStats(),
        loadGrowthMetrics(),
        loadSeedAnalytics(),
        loadUserBehavior(),
        loadSocialMetrics(),
        loadSongLaunchMetrics()
      ]);
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Failed to load some statistics');
    }
  };

  // Load overview statistics
  const loadOverviewStats = async () => {
    try {
      // Total users
      const usersSnap = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnap.size;
      
      // Total seeds and blooms
      const seedsSnap = await getDocs(collection(db, 'flowers'));
      const totalSeeds = seedsSnap.size;
      const blooms = seedsSnap.docs.filter(doc => doc.data().bloomed);
      const totalBlooms = blooms.length;
      
      // Conversion rate
      const conversionRate = totalSeeds > 0 ? (totalBlooms / totalSeeds * 100).toFixed(1) : 0;
      
      // Total waterings
      const wateringsSnap = await getDocs(collection(db, 'waterings'));
      const totalWaterings = wateringsSnap.size;
      
      // Average bloom time
      let totalBloomTime = 0;
      let bloomCount = 0;
      blooms.forEach(doc => {
        const data = doc.data();
        if (data.createdAt && data.bloomTime) {
          const created = new Date(data.createdAt);
          const bloomed = data.bloomTime.toDate ? data.bloomTime.toDate() : new Date(data.bloomTime);
          const days = Math.floor((bloomed - created) / (1000 * 60 * 60 * 24));
          if (days > 0 && days < 30) { // Reasonable range
            totalBloomTime += days;
            bloomCount++;
          }
        }
      });
      const averageBloomTime = bloomCount > 0 ? (totalBloomTime / bloomCount).toFixed(1) : 0;
      
      // Active users
      const now = new Date();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      
      let dailyActiveUsers = 0;
      let weeklyActiveUsers = 0;
      
      const recentWaterings = await getDocs(
        query(collection(db, 'waterings'), where('timestamp', '>=', oneWeekAgo))
      );
      
      const dailyUsers = new Set();
      const weeklyUsers = new Set();
      
      recentWaterings.docs.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.() || new Date(data.timestamp);
        weeklyUsers.add(data.wateredByUserId);
        if (timestamp >= oneDayAgo) {
          dailyUsers.add(data.wateredByUserId);
        }
      });
      
      dailyActiveUsers = dailyUsers.size;
      weeklyActiveUsers = weeklyUsers.size;
      
      setOverview({
        totalUsers,
        totalSeeds,
        totalBlooms,
        totalWaterings,
        averageBloomTime,
        conversionRate,
        dailyActiveUsers,
        weeklyActiveUsers
      });
    } catch (error) {
      console.error('Error loading overview stats:', error);
    }
  };

  // Load growth metrics
  const loadGrowthMetrics = async () => {
    try {
      const days = dateRange === '7days' ? 7 : dateRange === '30days' ? 30 : 90;
      const data = [];
      const userData = [];
      const today = new Date();
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        // Count new seeds
        const seedsQuery = query(
          collection(db, 'flowers'),
          where('createdAt', '>=', date.toISOString()),
          where('createdAt', '<', nextDate.toISOString())
        );
        const seedsSnap = await getDocs(seedsQuery);
        
        // Count waterings
        const wateringsQuery = query(
          collection(db, 'waterings'),
          where('timestamp', '>=', date),
          where('timestamp', '<', nextDate)
        );
        const wateringsSnap = await getDocs(wateringsQuery);
        
        // Count new users
        const usersQuery = query(
          collection(db, 'users'),
          where('joinedAt', '>=', date),
          where('joinedAt', '<', nextDate)
        );
        const usersSnap = await getDocs(usersQuery);
        
        data.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          seeds: seedsSnap.size,
          waterings: wateringsSnap.size,
          users: usersSnap.size
        });
        
        // Cumulative user growth
        const totalUsersQuery = query(
          collection(db, 'users'),
          where('joinedAt', '<=', nextDate)
        );
        const totalUsersSnap = await getDocs(totalUsersQuery);
        
        userData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          total: totalUsersSnap.size
        });
      }
      
      setGrowthData(data);
      setUserGrowthData(userData);
    } catch (error) {
      console.error('Error loading growth metrics:', error);
    }
  };

  // Load seed analytics
  const loadSeedAnalytics = async () => {
    try {
      const seedsSnap = await getDocs(collection(db, 'flowers'));
      
      // Seed type distribution
      const typeCount = {};
      const typePerformance = {};
      const bloomTimes = [];
      
      seedsSnap.docs.forEach(doc => {
        const data = doc.data();
        const type = data.seedType || data.type || 'Unknown';
        
        // Count by type
        typeCount[type] = (typeCount[type] || 0) + 1;
        
        // Track performance by type
        if (!typePerformance[type]) {
          typePerformance[type] = { total: 0, bloomed: 0, totalDays: 0, count: 0 };
        }
        typePerformance[type].total++;
        
        if (data.bloomed) {
          typePerformance[type].bloomed++;
          
          // Calculate bloom time
          if (data.createdAt && data.bloomTime) {
            const created = new Date(data.createdAt);
            const bloomed = data.bloomTime.toDate ? data.bloomTime.toDate() : new Date(data.bloomTime);
            const days = Math.floor((bloomed - created) / (1000 * 60 * 60 * 24));
            
            if (days >= 0 && days <= 30) {
              typePerformance[type].totalDays += days;
              typePerformance[type].count++;
              bloomTimes.push(days);
            }
          }
        }
      });
      
      // Format seed type distribution
      const distribution = Object.entries(typeCount).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      })).sort((a, b) => b.value - a.value);
      
      setSeedTypeDistribution(distribution);
      
      // Format seed type performance
      const performance = Object.entries(typePerformance).map(([type, stats]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        conversionRate: stats.total > 0 ? (stats.bloomed / stats.total * 100).toFixed(1) : 0,
        avgBloomTime: stats.count > 0 ? (stats.totalDays / stats.count).toFixed(1) : 0,
        total: stats.total,
        bloomed: stats.bloomed
      }));
      
      setSeedTypePerformance(performance);
      
      // Bloom time distribution
      const timeRanges = {
        '< 7 days': 0,
        '7 days': 0,
        '8-10 days': 0,
        '11-14 days': 0,
        '> 14 days': 0
      };
      
      bloomTimes.forEach(days => {
        if (days < 7) timeRanges['< 7 days']++;
        else if (days === 7) timeRanges['7 days']++;
        else if (days <= 10) timeRanges['8-10 days']++;
        else if (days <= 14) timeRanges['11-14 days']++;
        else timeRanges['> 14 days']++;
      });
      
      const bloomDistribution = Object.entries(timeRanges).map(([range, count]) => ({
        range,
        count
      }));
      
      setBloomTimeDistribution(bloomDistribution);
    } catch (error) {
      console.error('Error loading seed analytics:', error);
    }
  };

  // Load user behavior
  const loadUserBehavior = async () => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const seedsSnap = await getDocs(collection(db, 'flowers'));
      
      // Calculate averages
      const userSeeds = {};
      const userBlooms = {};
      
      seedsSnap.docs.forEach(doc => {
        const data = doc.data();
        const userId = data.userId;
        
        userSeeds[userId] = (userSeeds[userId] || 0) + 1;
        if (data.bloomed) {
          userBlooms[userId] = (userBlooms[userId] || 0) + 1;
        }
      });
      
      const seedCounts = Object.values(userSeeds);
      const bloomCounts = Object.values(userBlooms);
      
      const averageSeedsPerUser = seedCounts.length > 0 
        ? (seedCounts.reduce((a, b) => a + b, 0) / seedCounts.length).toFixed(1)
        : 0;
      
      const averageBloomsPerUser = bloomCounts.length > 0
        ? (bloomCounts.reduce((a, b) => a + b, 0) / usersSnap.size).toFixed(1)
        : 0;
      
      // Top gardeners
      const gardenerStats = [];
      usersSnap.docs.forEach(doc => {
        const userId = doc.id;
        const userData = doc.data();
        
        gardenerStats.push({
          id: userId,
          name: userData.displayName || userData.username || 'Anonymous',
          seeds: userSeeds[userId] || 0,
          blooms: userBlooms[userId] || 0
        });
      });
      
      const topGardeners = gardenerStats
        .sort((a, b) => b.blooms - a.blooms)
        .slice(0, 10);
      
      // Inactive users (no activity in 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let inactiveCount = 0;
      for (const userDoc of usersSnap.docs) {
        const lastActive = userDoc.data().lastLoginAt?.toDate?.() || new Date(0);
        if (lastActive < thirtyDaysAgo) {
          inactiveCount++;
        }
      }
      
      const churnRate = usersSnap.size > 0 
        ? (inactiveCount / usersSnap.size * 100).toFixed(1)
        : 0;
      
      setUserEngagement({
        averageSeedsPerUser,
        averageBloomsPerUser,
        topGardeners,
        inactiveUsers: inactiveCount,
        churnRate
      });
    } catch (error) {
      console.error('Error loading user behavior:', error);
    }
  };

  // Load social metrics
  const loadSocialMetrics = async () => {
    try {
      // Count friend waterings
      const wateringsSnap = await getDocs(collection(db, 'waterings'));
      let friendWaterings = 0;
      
      wateringsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.wateredByUserId !== data.seedOwnerId && !data.isOwnerWatering) {
          friendWaterings++;
        }
      });
      
      // Count shares (from bloom shares collection if exists)
      // For now, estimate based on friend waterings
      const estimatedShares = Math.floor(friendWaterings / 3); // Assume 1 share leads to 3 waterings
      
      // Viral coefficient (simplified)
      const usersSnap = await getDocs(collection(db, 'users'));
      const viralCoefficient = usersSnap.size > 0 
        ? (estimatedShares / usersSnap.size).toFixed(2)
        : 0;
      
      setSocialMetrics({
        totalShares: estimatedShares,
        totalFriendWaterings: friendWaterings,
        viralCoefficient,
        mostSharedFlowers: [] // Would need share tracking
      });
    } catch (error) {
      console.error('Error loading social metrics:', error);
    }
  };

  // Load song launch metrics
  const loadSongLaunchMetrics = async () => {
    try {
      const melodySeedsQuery = query(
        collection(db, 'flowers'),
        where('songSeed', '==', true)
      );
      const melodySeedsSnap = await getDocs(melodySeedsQuery);
      
      const melodySeedsClaimed = melodySeedsSnap.size;
      const melodySeedsBloomed = melodySeedsSnap.docs.filter(doc => doc.data().bloomed).length;
      const melodySeedConversion = melodySeedsClaimed > 0
        ? (melodySeedsBloomed / melodySeedsClaimed * 100).toFixed(1)
        : 0;
      
      // Daily claims for last 7 days
      const dailyClaims = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dailyQuery = query(
          collection(db, 'flowers'),
          where('songSeed', '==', true),
          where('createdAt', '>=', date.toISOString()),
          where('createdAt', '<', nextDate.toISOString())
        );
        const dailySnap = await getDocs(dailyQuery);
        
        dailyClaims.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          claims: dailySnap.size
        });
      }
      
      setSongLaunchMetrics({
        melodySeedsClaimed,
        melodySeedsBloomed,
        melodySeedConversion,
        dailyMelodyClaims: dailyClaims
      });
    } catch (error) {
      console.error('Error loading song launch metrics:', error);
    }
  };

  // Export data
  const exportData = (dataType) => {
    let csvContent = '';
    let filename = '';
    
    switch (dataType) {
      case 'overview':
        csvContent = 'Metric,Value\n';
        Object.entries(overview).forEach(([key, value]) => {
          csvContent += `${key},${value}\n`;
        });
        filename = 'garden_overview.csv';
        break;
        
      case 'growth':
        csvContent = 'Date,Seeds,Waterings,Users\n';
        growthData.forEach(row => {
          csvContent += `${row.date},${row.seeds},${row.waterings},${row.users}\n`;
        });
        filename = 'garden_growth.csv';
        break;
        
      case 'seedTypes':
        csvContent = 'Type,Total,Bloomed,Conversion Rate,Avg Bloom Time\n';
        seedTypePerformance.forEach(row => {
          csvContent += `${row.type},${row.total},${row.bloomed},${row.conversionRate}%,${row.avgBloomTime} days\n`;
        });
        filename = 'seed_performance.csv';
        break;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading garden statistics...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📊 Garden Statistics</h1>
            <p className="text-gray-600">Comprehensive analytics and insights</p>
          </div>
          
          {/* Date Range Selector */}
          <div className="flex gap-2">
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                loadAllStatistics();
              }}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <Button onClick={() => loadAllStatistics()} variant="outline">
              🔄 Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-purple-600">{overview.totalUsers}</p>
              <p className="text-xs text-gray-500 mt-1">
                DAU: {overview.dailyActiveUsers} | WAU: {overview.weeklyActiveUsers}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Total Seeds</p>
              <p className="text-3xl font-bold text-green-600">{overview.totalSeeds}</p>
              <p className="text-xs text-gray-500 mt-1">
                {overview.totalBlooms} bloomed ({overview.conversionRate}%)
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Total Waterings</p>
              <p className="text-3xl font-bold text-blue-600">{overview.totalWaterings}</p>
              <p className="text-xs text-gray-500 mt-1">
                Avg bloom: {overview.averageBloomTime} days
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardContent className="p-4 text-center">
              <p className="text-sm">Melody Seeds</p>
              <p className="text-3xl font-bold">{songLaunchMetrics.melodySeedsClaimed}</p>
              <p className="text-xs mt-1">
                {songLaunchMetrics.melodySeedsBloomed} bloomed ({songLaunchMetrics.melodySeedConversion}%)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Growth Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Activity Trends */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">📈 Activity Trends</h3>
                <Button onClick={() => exportData('growth')} size="sm" variant="outline">
                  Export
                </Button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="seeds" stroke="#10b981" name="Seeds" strokeWidth={2} />
                  <Line type="monotone" dataKey="waterings" stroke="#3b82f6" name="Waterings" strokeWidth={2} />
                  <Line type="monotone" dataKey="users" stroke="#8b5cf6" name="New Users" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Growth */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">👥 Cumulative User Growth</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Seed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Seed Type Distribution */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">🌱 Seed Type Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={seedTypeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {seedTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bloom Time Distribution */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">⏱️ Bloom Time Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bloomTimeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Melody Seed Daily Claims */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">🎵 Melody Seed Claims</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={songLaunchMetrics.dailyMelodyClaims}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="claims" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Performance Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Seed Type Performance */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">🌸 Seed Type Performance</h3>
                <Button onClick={() => exportData('seedTypes')} size="sm" variant="outline">
                  Export
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-2 text-sm font-medium">Type</th>
                      <th className="pb-2 text-sm font-medium">Total</th>
                      <th className="pb-2 text-sm font-medium">Bloomed</th>
                      <th className="pb-2 text-sm font-medium">Rate</th>
                      <th className="pb-2 text-sm font-medium">Avg Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seedTypePerformance.map((type, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 text-sm">{type.type}</td>
                        <td className="py-2 text-sm">{type.total}</td>
                        <td className="py-2 text-sm">{type.bloomed}</td>
                        <td className="py-2 text-sm font-medium text-green-600">{type.conversionRate}%</td>
                        <td className="py-2 text-sm">{type.avgBloomTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Gardeners */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">🏆 Top Gardeners</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="pb-2 text-sm font-medium">Rank</th>
                      <th className="pb-2 text-sm font-medium">Name</th>
                      <th className="pb-2 text-sm font-medium">Seeds</th>
                      <th className="pb-2 text-sm font-medium">Blooms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userEngagement.topGardeners.map((user, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 text-sm">#{idx + 1}</td>
                        <td className="py-2 text-sm font-medium">{user.name}</td>
                        <td className="py-2 text-sm">{user.seeds}</td>
                        <td className="py-2 text-sm font-bold text-green-600">{user.blooms}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics Summary */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">📋 Key Metrics Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Avg Seeds/User</p>
                <p className="text-2xl font-bold">{userEngagement.averageSeedsPerUser}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Blooms/User</p>
                <p className="text-2xl font-bold">{userEngagement.averageBloomsPerUser}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Friend Waterings</p>
                <p className="text-2xl font-bold">{socialMetrics.totalFriendWaterings}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Churn Rate</p>
                <p className="text-2xl font-bold text-red-600">{userEngagement.churnRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
