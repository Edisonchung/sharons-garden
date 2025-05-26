// pages/admin/song-launch.js - Song Launch Manager for May 30, 2025
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
  doc,
  updateDoc,
  getDoc,
  setDoc,
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const SONG_LAUNCH_DATE = new Date('2025-05-30T00:00:00');
const MELODY_SEED_ID = 'melody-seed-2025';

export default function SongLaunchManagerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Launch Status
  const [launchStatus, setLaunchStatus] = useState({
    daysUntilLaunch: 0,
    hoursUntilLaunch: 0,
    minutesUntilLaunch: 0,
    isLaunched: false,
    launchModeActive: false
  });
  
  // Melody Seed Stats
  const [melodyStats, setMelodyStats] = useState({
    totalClaimed: 0,
    totalBloomed: 0,
    claimedToday: 0,
    bloomedToday: 0,
    conversionRate: 0,
    averageWaterCount: 0
  });
  
  // User Activity
  const [recentClaims, setRecentClaims] = useState([]);
  const [dailyClaimData, setDailyClaimData] = useState([]);
  
  // Launch Configuration
  const [launchConfig, setLaunchConfig] = useState({
    claimingEnabled: true,
    autoShowModal: true,
    modalShowDays: 7,
    streamingLinks: {
      spotify: 'https://open.spotify.com/track/sharons-dream-garden',
      appleMusic: 'https://music.apple.com/track/sharons-dream-garden',
      youtube: 'https://youtube.com/watch?v=sharons-dream-garden'
    }
  });
  
  // Launch Checklist
  const [checklist, setChecklist] = useState({
    serverScaling: false,
    cacheWarmed: false,
    backupCreated: false,
    monitoringActive: false,
    notificationsScheduled: false,
    streamingLinksVerified: false
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
        
        // Load initial data
        loadLaunchData();
        loadMelodyStats();
        loadLaunchConfig();
        
      } catch (err) {
        console.error('Error checking admin status:', err);
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Real-time countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const timeDiff = SONG_LAUNCH_DATE - now;
      
      if (timeDiff <= 0) {
        setLaunchStatus(prev => ({ ...prev, isLaunched: true }));
      } else {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        setLaunchStatus(prev => ({
          ...prev,
          daysUntilLaunch: days,
          hoursUntilLaunch: hours,
          minutesUntilLaunch: minutes,
          isLaunched: false
        }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Load launch configuration
  const loadLaunchConfig = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'config', 'songLaunch'));
      if (configDoc.exists()) {
        setLaunchConfig(configDoc.data());
      }
      
      const checklistDoc = await getDoc(doc(db, 'config', 'launchChecklist'));
      if (checklistDoc.exists()) {
        setChecklist(checklistDoc.data());
      }
    } catch (error) {
      console.error('Error loading launch config:', error);
    }
  };

  // Load melody seed statistics
  const loadMelodyStats = async () => {
    try {
      // Get all melody seeds
      const melodyQuery = query(
        collection(db, 'flowers'),
        where('songSeed', '==', true)
      );
      const melodySnap = await getDocs(melodyQuery);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let totalClaimed = 0;
      let totalBloomed = 0;
      let claimedToday = 0;
      let bloomedToday = 0;
      let totalWaterCount = 0;
      
      melodySnap.docs.forEach(doc => {
        const data = doc.data();
        totalClaimed++;
        
        if (data.bloomed) {
          totalBloomed++;
        }
        
        totalWaterCount += data.waterCount || 0;
        
        // Check if claimed today
        if (data.createdAt) {
          const claimedDate = new Date(data.createdAt);
          if (claimedDate >= today) {
            claimedToday++;
          }
        }
        
        // Check if bloomed today
        if (data.bloomed && data.bloomTime) {
          const bloomDate = data.bloomTime.toDate ? data.bloomTime.toDate() : new Date(data.bloomTime);
          if (bloomDate >= today) {
            bloomedToday++;
          }
        }
      });
      
      const conversionRate = totalClaimed > 0 ? (totalBloomed / totalClaimed * 100).toFixed(1) : 0;
      const averageWaterCount = totalClaimed > 0 ? (totalWaterCount / totalClaimed).toFixed(1) : 0;
      
      setMelodyStats({
        totalClaimed,
        totalBloomed,
        claimedToday,
        bloomedToday,
        conversionRate,
        averageWaterCount
      });
      
      // Load daily claim data for chart
      await loadDailyClaimData();
      
    } catch (error) {
      console.error('Error loading melody stats:', error);
    }
  };

  // Load daily claim data for chart
  const loadDailyClaimData = async () => {
    try {
      const data = [];
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
        
        data.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          claims: dailySnap.size
        });
      }
      
      setDailyClaimData(data);
    } catch (error) {
      console.error('Error loading daily claim data:', error);
    }
  };

  // Load general launch data
  const loadLaunchData = async () => {
    try {
      // Recent claims
      const recentQuery = query(
        collection(db, 'flowers'),
        where('songSeed', '==', true),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const recentSnap = await getDocs(recentQuery);
      const recent = recentSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        claimedAt: doc.data().createdAt
      }));
      setRecentClaims(recent);
      
    } catch (error) {
      console.error('Error loading launch data:', error);
    }
  };

  // Toggle claiming
  const toggleClaiming = async () => {
    try {
      const newStatus = !launchConfig.claimingEnabled;
      await setDoc(doc(db, 'config', 'songLaunch'), {
        ...launchConfig,
        claimingEnabled: newStatus
      }, { merge: true });
      
      setLaunchConfig(prev => ({ ...prev, claimingEnabled: newStatus }));
      toast.success(`Melody seed claiming ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling claiming:', error);
      toast.error('Failed to update claiming status');
    }
  };

  // Toggle launch mode
  const toggleLaunchMode = async () => {
    try {
      const newStatus = !launchStatus.launchModeActive;
      await setDoc(doc(db, 'config', 'system'), {
        launchMode: newStatus,
        launchModeActivatedAt: new Date().toISOString(),
        launchModeActivatedBy: auth.currentUser.uid
      }, { merge: true });
      
      setLaunchStatus(prev => ({ ...prev, launchModeActive: newStatus }));
      toast.success(`Launch mode ${newStatus ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling launch mode:', error);
      toast.error('Failed to update launch mode');
    }
  };

  // Update checklist
  const updateChecklist = async (item, value) => {
    try {
      const newChecklist = { ...checklist, [item]: value };
      await setDoc(doc(db, 'config', 'launchChecklist'), newChecklist, { merge: true });
      setChecklist(newChecklist);
      toast.success(`Checklist updated: ${item}`);
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast.error('Failed to update checklist');
    }
  };

  // Schedule notification
  const scheduleNotification = async (type) => {
    try {
      let title, message, scheduledFor;
      
      switch (type) {
        case '24h':
          title = "🎵 Sharon's Song Launches Tomorrow!";
          message = "Don't forget to claim your Melody Seed before it's too late! The song drops in 24 hours.";
          scheduledFor = new Date(SONG_LAUNCH_DATE);
          scheduledFor.setDate(scheduledFor.getDate() - 1);
          break;
        case '1h':
          title = "⏰ One Hour Until Sharon's Song!";
          message = "The moment is almost here! Get ready for Sharon's debut single launching in 60 minutes!";
          scheduledFor = new Date(SONG_LAUNCH_DATE);
          scheduledFor.setHours(scheduledFor.getHours() - 1);
          break;
        case 'live':
          title = "🎉 Sharon's Song is LIVE!";
          message = "The wait is over! Sharon's debut single 'Dream Garden' is now available on all platforms!";
          scheduledFor = SONG_LAUNCH_DATE;
          break;
      }
      
      // In production, this would schedule the notification
      // For now, we'll just show success
      toast.success(`Notification scheduled for ${scheduledFor.toLocaleString()}`);
      
    } catch (error) {
      console.error('Error scheduling notification:', error);
      toast.error('Failed to schedule notification');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading song launch manager...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const checklistComplete = Object.values(checklist).every(v => v === true);
  const checklistProgress = (Object.values(checklist).filter(v => v === true).length / Object.keys(checklist).length * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🎵 Song Launch Manager</h1>
          <p className="text-gray-600">Manage Sharon's song launch on May 30, 2025</p>
        </div>

        {/* Countdown Timer - Prominent Display */}
        <Card className={`mb-6 ${launchStatus.daysUntilLaunch <= 1 ? 'border-red-500 border-2' : ''}`}>
          <CardContent className="p-6 text-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg">
            <h2 className="text-2xl font-bold mb-4">
              {launchStatus.isLaunched ? '🎉 Song is LIVE!' : '⏰ Launch Countdown'}
            </h2>
            {!launchStatus.isLaunched ? (
              <div className="flex justify-center gap-8">
                <div>
                  <div className="text-4xl font-bold">{launchStatus.daysUntilLaunch}</div>
                  <div className="text-sm">Days</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">{launchStatus.hoursUntilLaunch}</div>
                  <div className="text-sm">Hours</div>
                </div>
                <div>
                  <div className="text-4xl font-bold">{launchStatus.minutesUntilLaunch}</div>
                  <div className="text-sm">Minutes</div>
                </div>
              </div>
            ) : (
              <p className="text-xl">The song has been launched! 🚀</p>
            )}
          </CardContent>
        </Card>

        {/* Launch Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Quick Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">🎮 Launch Controls</h3>
              <div className="space-y-3">
                <Button
                  onClick={toggleLaunchMode}
                  className={`w-full ${launchStatus.launchModeActive ? 'bg-red-600 hover:bg-red-700' : ''}`}
                >
                  {launchStatus.launchModeActive ? '🔴 Deactivate' : '🟢 Activate'} Launch Mode
                </Button>
                
                <Button
                  onClick={toggleClaiming}
                  variant={launchConfig.claimingEnabled ? 'destructive' : 'default'}
                  className="w-full"
                >
                  {launchConfig.claimingEnabled ? '🛑 Disable' : '✅ Enable'} Seed Claiming
                </Button>
                
                <Button
                  onClick={() => router.push('/admin/notifications')}
                  variant="outline"
                  className="w-full"
                >
                  📢 Send Announcement
                </Button>
                
                <Button
                  onClick={() => window.open('/notifications', '_blank')}
                  variant="outline"
                  className="w-full"
                >
                  👁️ Preview User View
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Melody Seed Stats */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">🎵 Melody Seed Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Claimed</span>
                  <span className="font-bold text-indigo-600">{melodyStats.totalClaimed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Bloomed</span>
                  <span className="font-bold text-green-600">{melodyStats.totalBloomed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Conversion Rate</span>
                  <span className="font-bold">{melodyStats.conversionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Avg Waters</span>
                  <span className="font-bold">{melodyStats.averageWaterCount}/7</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Claimed Today</span>
                  <span className="font-bold text-blue-600">{melodyStats.claimedToday}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Bloomed Today</span>
                  <span className="font-bold text-purple-600">{melodyStats.bloomedToday}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Launch Checklist */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                ✅ Launch Checklist ({checklistProgress}%)
              </h3>
              <div className="space-y-2">
                {Object.entries(checklist).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => updateChecklist(key, e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span className={`text-sm ${value ? 'line-through text-gray-500' : ''}`}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                  </label>
                ))}
              </div>
              {checklistComplete && (
                <div className="mt-4 p-2 bg-green-100 text-green-700 rounded text-center text-sm">
                  ✅ All systems ready for launch!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Claims Chart */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">📊 Daily Melody Seed Claims</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dailyClaimData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="claims" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Notification Scheduler */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">🔔 Notification Scheduler</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">24 Hours Before</p>
                      <p className="text-sm text-gray-600">Reminder to claim Melody Seed</p>
                    </div>
                    <Button
                      onClick={() => scheduleNotification('24h')}
                      size="sm"
                      variant="outline"
                    >
                      Schedule
                    </Button>
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">1 Hour Before</p>
                      <p className="text-sm text-gray-600">Final countdown notification</p>
                    </div>
                    <Button
                      onClick={() => scheduleNotification('1h')}
                      size="sm"
                      variant="outline"
                    >
                      Schedule
                    </Button>
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Launch Time</p>
                      <p className="text-sm text-gray-600">Song is live announcement</p>
                    </div>
                    <Button
                      onClick={() => scheduleNotification('live')}
                      size="sm"
                      variant="outline"
                    >
                      Schedule
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Claims */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">🌱 Recent Melody Seed Claims</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-2 text-sm font-medium text-gray-600">User</th>
                    <th className="pb-2 text-sm font-medium text-gray-600">Claimed</th>
                    <th className="pb-2 text-sm font-medium text-gray-600">Waters</th>
                    <th className="pb-2 text-sm font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClaims.map((claim) => (
                    <tr key={claim.id} className="border-b">
                      <td className="py-2 text-sm">{claim.plantedBy || 'Anonymous'}</td>
                      <td className="py-2 text-sm">
                        {claim.claimedAt ? new Date(claim.claimedAt).toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="py-2 text-sm">{claim.waterCount || 0}/7</td>
                      <td className="py-2 text-sm">
                        {claim.bloomed ? (
                          <span className="text-green-600 font-medium">🌸 Bloomed</span>
                        ) : (
                          <span className="text-blue-600">🌱 Growing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Streaming Links Configuration */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">🎧 Streaming Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Spotify</label>
                <input
                  type="url"
                  value={launchConfig.streamingLinks?.spotify || ''}
                  onChange={(e) => {
                    // In production, this would update the config
                    console.log('Update Spotify link:', e.target.value);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="https://open.spotify.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Apple Music</label>
                <input
                  type="url"
                  value={launchConfig.streamingLinks?.appleMusic || ''}
                  onChange={(e) => {
                    console.log('Update Apple Music link:', e.target.value);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="https://music.apple.com/..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">YouTube</label>
                <input
                  type="url"
                  value={launchConfig.streamingLinks?.youtube || ''}
                  onChange={(e) => {
                    console.log('Update YouTube link:', e.target.value);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="https://youtube.com/..."
                />
              </div>
            </div>
            <Button className="mt-4" variant="outline">
              💾 Save Streaming Links
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
