// pages/admin/launch-monitor.js - Real-time Launch Day Monitoring
import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { auth, db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  getDoc,
  doc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import wateringManager from '../../utils/WateringManager';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function LaunchMonitorPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Metrics state
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [realtimeStats, setRealtimeStats] = useState({
    activeUsers: 0,
    seedsPlanted: 0,
    wateringActions: 0,
    bloomsToday: 0,
    errorRate: 0,
    avgResponseTime: 0
  });
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [errorLog, setErrorLog] = useState([]);
  const [alerts, setAlerts] = useState([]);

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

  // Real-time monitoring
  useEffect(() => {
    if (!isAdmin) return;

    // Monitor watering actions
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const wateringQuery = query(
      collection(db, 'waterings'),
      where('timestamp', '>=', today),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

    const unsubscribeWatering = onSnapshot(wateringQuery, (snapshot) => {
      const wateringCount = snapshot.size;
      const blooms = snapshot.docs.filter(doc => doc.data().resultedInBloom).length;
      
      setRealtimeStats(prev => ({
        ...prev,
        wateringActions: wateringCount,
        bloomsToday: blooms
      }));
    });

    // Monitor new seeds
    const seedsQuery = query(
      collection(db, 'flowers'),
      where('createdAt', '>=', today.toISOString()),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeSeeds = onSnapshot(seedsQuery, (snapshot) => {
      setRealtimeStats(prev => ({
        ...prev,
        seedsPlanted: snapshot.size
      }));
    });

    // System metrics update
    const metricsInterval = setInterval(() => {
      const metrics = wateringManager.getMetrics();
      setSystemMetrics(metrics);
      
      // Calculate error rate
      const errorRate = metrics.totalOperations > 0
        ? (metrics.failedOperations / metrics.totalOperations * 100).toFixed(2)
        : 0;
      
      setRealtimeStats(prev => ({
        ...prev,
        errorRate: parseFloat(errorRate),
        avgResponseTime: Math.round(metrics.averageResponseTime)
      }));

      // Update performance history
      setPerformanceHistory(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString(),
          responseTime: Math.round(metrics.averageResponseTime),
          queueLength: metrics.queueLength,
          successRate: parseFloat(metrics.successRate)
        };
        
        const updated = [...prev, newPoint];
        // Keep last 20 points
        if (updated.length > 20) updated.shift();
        return updated;
      });

      // Check for alerts
      checkSystemAlerts(metrics);
    }, 5000);

    // Active users monitoring
    const activeUsersInterval = setInterval(async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const activeQuery = query(
          collection(db, 'waterings'),
          where('timestamp', '>=', fiveMinutesAgo)
        );
        
        const snapshot = await getDocs(activeQuery);
        const uniqueUsers = new Set(
          snapshot.docs.map(doc => doc.data().wateredByUserId)
        );
        
        setRealtimeStats(prev => ({
          ...prev,
          activeUsers: uniqueUsers.size
        }));
      } catch (err) {
        console.error('Error counting active users:', err);
      }
    }, 10000);

    return () => {
      unsubscribeWatering();
      unsubscribeSeeds();
      clearInterval(metricsInterval);
      clearInterval(activeUsersInterval);
    };
  }, [isAdmin]);

  // Alert system
  const checkSystemAlerts = (metrics) => {
    const newAlerts = [];
    
    // High queue length
    if (metrics.queueLength > 50) {
      newAlerts.push({
        type: 'warning',
        message: `High queue length: ${metrics.queueLength} operations pending`,
        timestamp: new Date()
      });
    }
    
    // High error rate
    const errorRate = metrics.totalOperations > 0
      ? (metrics.failedOperations / metrics.totalOperations * 100)
      : 0;
    
    if (errorRate > 10) {
      newAlerts.push({
        type: 'error',
        message: `High error rate: ${errorRate.toFixed(2)}%`,
        timestamp: new Date()
      });
    }
    
    // Slow response time
    if (metrics.averageResponseTime > 5000) {
      newAlerts.push({
        type: 'warning',
        message: `Slow response time: ${Math.round(metrics.averageResponseTime)}ms`,
        timestamp: new Date()
      });
    }
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));
    }
  };

  // Admin controls
  const handleEmergencyStop = () => {
    if (confirm('Are you sure? This will pause all watering operations.')) {
      wateringManager.pauseProcessing();
      setAlerts(prev => [{
        type: 'info',
        message: 'Queue processing paused by admin',
        timestamp: new Date()
      }, ...prev]);
    }
  };

  const handleResume = () => {
    wateringManager.resumeProcessing();
    setAlerts(prev => [{
      type: 'success',
      message: 'Queue processing resumed',
      timestamp: new Date()
    }, ...prev]);
  };

  const handleClearQueue = () => {
    if (confirm('This will cancel all pending operations. Continue?')) {
      wateringManager.clearQueue();
      setAlerts(prev => [{
        type: 'warning',
        message: 'Queue cleared by admin',
        timestamp: new Date()
      }, ...prev]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading monitoring dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          🚀 Launch Day Monitoring Dashboard
        </h1>

        {/* Critical Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <MetricCard
            title="Active Users"
            value={realtimeStats.activeUsers}
            icon="👥"
            color="blue"
          />
          <MetricCard
            title="Seeds Today"
            value={realtimeStats.seedsPlanted}
            icon="🌱"
            color="green"
          />
          <MetricCard
            title="Waters Today"
            value={realtimeStats.wateringActions}
            icon="💧"
            color="blue"
          />
          <MetricCard
            title="Blooms Today"
            value={realtimeStats.bloomsToday}
            icon="🌸"
            color="pink"
          />
          <MetricCard
            title="Error Rate"
            value={`${realtimeStats.errorRate}%`}
            icon="⚠️"
            color={realtimeStats.errorRate > 5 ? 'red' : 'green'}
          />
          <MetricCard
            title="Avg Response"
            value={`${realtimeStats.avgResponseTime}ms`}
            icon="⚡"
            color={realtimeStats.avgResponseTime > 3000 ? 'yellow' : 'green'}
          />
        </div>

        {/* System Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">🎮 System Controls</h2>
            <div className="flex gap-4">
              <Button onClick={handleEmergencyStop} variant="destructive">
                🛑 Emergency Stop
              </Button>
              <Button onClick={handleResume} variant="default">
                ▶️ Resume Processing
              </Button>
              <Button onClick={handleClearQueue} variant="outline">
                🧹 Clear Queue
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
              >
                🔄 Refresh Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">📈 Response Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">📊 Queue Length</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={performanceHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="queueLength" 
                    stroke="#10b981" 
                    fill="#10b981" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* System Metrics */}
        {systemMetrics && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">📊 System Metrics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Operations</p>
                  <p className="text-2xl font-bold">{systemMetrics.totalOperations}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">{systemMetrics.successRate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Queue Length</p>
                  <p className="text-2xl font-bold">{systemMetrics.queueLength}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Peak Concurrent</p>
                  <p className="text-2xl font-bold">{systemMetrics.peakConcurrent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">🚨 System Alerts</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-gray-500">No alerts</p>
              ) : (
                alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded flex items-start gap-2 ${
                      alert.type === 'error' ? 'bg-red-100 text-red-700' :
                      alert.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      alert.type === 'success' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <span>{
                      alert.type === 'error' ? '❌' :
                      alert.type === 'warning' ? '⚠️' :
                      alert.type === 'success' ? '✅' :
                      'ℹ️'
                    }</span>
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-xs opacity-75">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    pink: 'bg-pink-100 text-pink-700'
  };

  return (
    <Card className={colorClasses[color]}>
      <CardContent className="p-4 text-center">
        <div className="text-3xl mb-2">{icon}</div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
