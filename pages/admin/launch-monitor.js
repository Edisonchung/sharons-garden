// pages/admin/launch-monitor.js - Fixed Launch Monitor
import React, { useState, useEffect } from 'react'; // ADD MISSING REACT IMPORT
import { useRouter } from 'next/router';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { wateringManager, getSystemHealth } from '../../utils/WateringManager';

export default function LaunchMonitorPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/auth');
        return;
      }

      setUser(currentUser);

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const userData = userDoc.data();
        
        if (userData?.role === 'admin') {
          setIsAdmin(true);
          startMonitoring();
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const startMonitoring = () => {
    const updateMetrics = () => {
      try {
        const currentMetrics = wateringManager.getMetrics();
        const health = getSystemHealth();
        
        setMetrics(currentMetrics);
        setSystemHealth(health);
      } catch (error) {
        console.error('Error updating metrics:', error);
      }
    };

    // Initial load
    updateMetrics();

    // Set up interval
    const interval = setInterval(updateMetrics, 2000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  };

  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  const handleClearQueue = () => {
    if (confirm('Are you sure you want to clear the watering queue?')) {
      wateringManager.queue = [];
      alert('Queue cleared successfully');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl animate-pulse mb-4">🔧</div>
          <p className="text-gray-700">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-700 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🚀 Launch Monitor
          </h1>
          <p className="text-gray-600">
            Real-time system monitoring for Sharon's Garden launch
          </p>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <div className={`text-2xl font-bold ${getStatusColor(systemHealth?.status)}`}>
                {systemHealth?.status?.toUpperCase() || 'UNKNOWN'}
              </div>
              <p className="text-sm text-gray-600">System Status</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics?.queueLength || 0}
              </div>
              <p className="text-sm text-gray-600">Queue Length</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics?.successRate || '0%'}
              </div>
              <p className="text-sm text-gray-600">Success Rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(metrics?.averageResponseTime || 0)}ms
              </div>
              <p className="text-sm text-gray-600">Avg Response</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Watering System Metrics */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                💧 Watering System
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Operations:</span>
                  <span className="font-semibold">{metrics?.totalOperations || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Successful:</span>
                  <span className="font-semibold text-green-600">{metrics?.successfulOperations || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-semibold text-red-600">{metrics?.failedOperations || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending:</span>
                  <span className="font-semibold text-blue-600">{metrics?.pendingOperations || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Peak Concurrent:</span>
                  <span className="font-semibold">{metrics?.peakConcurrent || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Warnings */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                ⚠️ System Warnings
              </h3>
              
              {systemHealth?.warnings?.length > 0 ? (
                <div className="space-y-2">
                  {systemHealth.warnings.map((warning, index) => (
                    <div key={index} className="flex items-center gap-2 text-yellow-600">
                      <span>⚠️</span>
                      <span className="text-sm">{warning}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-green-600">
                  <div className="text-4xl mb-2">✅</div>
                  <p className="text-sm">All systems healthy</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Real-time Activity */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📊 Real-time Activity
            </h3>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
              <div className="space-y-1">
                <div>🌊 WateringManager Status: {systemHealth?.status}</div>
                <div>⏰ Last Updated: {new Date().toLocaleTimeString()}</div>
                <div>🔄 Queue Processing: Active</div>
                <div>📈 Operations/min: {Math.round((metrics?.totalOperations || 0) / 5)}</div>
                <div>🎯 Success Rate: {metrics?.successRate}</div>
                <div>⚡ Avg Response: {Math.round(metrics?.averageResponseTime || 0)}ms</div>
                {metrics?.queueLength > 0 && (
                  <div className="text-yellow-400">
                    ⚠️ Queue has {metrics.queueLength} pending operations
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Controls */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              🚨 Emergency Controls
            </h3>
            
            <div className="flex gap-4 flex-wrap">
              <Button
                onClick={handleClearQueue}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                🧹 Clear Queue
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
              >
                🔄 Refresh Monitor
              </Button>
              
              <Button
                onClick={() => console.log('Detailed metrics:', metrics)}
                variant="outline"
              >
                📋 Export Logs
              </Button>
              
              <Button
                onClick={() => router.push('/admin')}
                variant="outline"
              >
                ← Back to Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
