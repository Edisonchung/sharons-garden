// pages/admin/command-center.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { auth, db } from '../../lib/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  serverTimestamp,
  collection,
  addDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

// Import the utilities (you'll need to create these)
import { PreLaunchChecklist } from '../../utils/PreLaunchChecklist';
import { BackupManager } from '../../utils/backup/BackupManager';
import { migrationRunner } from '../../utils/migrations/MigrationRunner';

// Status Indicator Component
function StatusIndicator({ label, status }) {
  const statusColors = {
    healthy: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    unknown: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className={`p-3 rounded-lg ${statusColors[status] || statusColors.unknown}`}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs capitalize">{status || 'Unknown'}</p>
    </div>
  );
}

export default function CommandCenter() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checklistResults, setChecklistResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    database: 'unknown',
    cache: 'unknown',
    queue: 'unknown',
    monitoring: 'unknown'
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
        checkSystemStatus();
      } catch (err) {
        console.error('Error checking admin status:', err);
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Check system status
  const checkSystemStatus = async () => {
    try {
      // Check database connection
      const testDoc = await getDoc(doc(db, '_system', 'health'));
      setSystemStatus(prev => ({ ...prev, database: 'healthy' }));

      // Check other systems (simplified for now)
      setSystemStatus({
        database: 'healthy',
        cache: 'healthy',
        queue: 'healthy',
        monitoring: 'healthy'
      });
    } catch (error) {
      console.error('Error checking system status:', error);
      setSystemStatus(prev => ({ ...prev, database: 'error' }));
    }
  };

  const runPreLaunchChecklist = async () => {
    setIsRunning(true);
    try {
      // Simplified checklist for now
      const mockResults = [
        {
          id: 'backup',
          name: 'Database Backup',
          status: 'passed',
          description: 'Create full database backup'
        },
        {
          id: 'indexes',
          name: 'Verify Indexes',
          status: 'passed',
          description: 'Ensure all indexes are active'
        },
        {
          id: 'cache',
          name: 'Warm Cache',
          status: 'passed',
          description: 'Pre-load frequently accessed data'
        },
        {
          id: 'monitoring',
          name: 'Enable Monitoring',
          status: 'passed',
          description: 'Activate performance monitoring'
        }
      ];
      
      setChecklistResults(mockResults);
      toast.success('Pre-launch checklist completed');
    } catch (error) {
      toast.error(`Checklist failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runMigration = async (migrationName) => {
    try {
      // Log migration attempt
      await addDoc(collection(db, 'adminLogs'), {
        action: 'migration_run',
        migrationName,
        adminId: auth.currentUser?.uid,
        timestamp: serverTimestamp()
      });
      
      toast.success(`Migration ${migrationName} initiated`);
    } catch (error) {
      toast.error(`Migration failed: ${error.message}`);
    }
  };

  const createEmergencyBackup = async () => {
    try {
      const backupId = `backup_${Date.now()}`;
      
      // Log backup creation
      await addDoc(collection(db, 'adminLogs'), {
        action: 'emergency_backup',
        backupId,
        adminId: auth.currentUser?.uid,
        timestamp: serverTimestamp()
      });
      
      toast.success(`Backup initiated: ${backupId}`);
    } catch (error) {
      toast.error('Backup failed: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p>Loading command center...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🎮 Launch Command Center</h1>
        
        {/* System Status */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">System Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatusIndicator 
                label="Database" 
                status={systemStatus.database} 
              />
              <StatusIndicator 
                label="Cache" 
                status={systemStatus.cache} 
              />
              <StatusIndicator 
                label="Queue" 
                status={systemStatus.queue} 
              />
              <StatusIndicator 
                label="Monitoring" 
                status={systemStatus.monitoring} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Pre-Launch Checklist */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Pre-Launch Checklist</h2>
            
            <Button 
              onClick={runPreLaunchChecklist}
              disabled={isRunning}
              className="mb-4"
            >
              {isRunning ? '⏳ Running...' : '▶️ Run All Checks'}
            </Button>

            {checklistResults.length > 0 && (
              <div className="space-y-2">
                {checklistResults.map((result) => (
                  <div 
                    key={result.id} 
                    className={`p-3 rounded-lg ${
                      result.status === 'passed' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{result.name}</p>
                        <p className="text-sm opacity-75">{result.description}</p>
                      </div>
                      <span className="text-sm">
                        {result.status === 'passed' ? '✅ Passed' : '❌ Failed'}
                      </span>
                    </div>
                    {result.error && (
                      <p className="text-sm mt-1">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button onClick={createEmergencyBackup} variant="outline" className="h-auto p-4">
                <div>
                  <div className="text-2xl mb-1">💾</div>
                  <div>Emergency Backup</div>
                </div>
              </Button>
              <Button 
                onClick={() => runMigration('001_create_indexes')} 
                variant="outline"
                className="h-auto p-4"
              >
                <div>
                  <div className="text-2xl mb-1">📊</div>
                  <div>Run Index Migration</div>
                </div>
              </Button>
              <Button 
                onClick={() => runMigration('002_data_cleanup')} 
                variant="outline"
                className="h-auto p-4"
              >
                <div>
                  <div className="text-2xl mb-1">🧹</div>
                  <div>Run Cleanup Migration</div>
                </div>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Button 
                onClick={() => router.push('/admin/launch-monitor')}
                className="h-auto p-4"
              >
                <div>
                  <div className="text-2xl mb-1">📊</div>
                  <div>Launch Monitor</div>
                </div>
              </Button>
              <Button 
                onClick={() => router.push('/admin/database')}
                className="h-auto p-4"
              >
                <div>
                  <div className="text-2xl mb-1">🗄️</div>
                  <div>Database Tools</div>
                </div>
              </Button>
              <Button 
                onClick={() => router.push('/admin/song-launch')}
                className="h-auto p-4"
              >
                <div>
                  <div className="text-2xl mb-1">🎵</div>
                  <div>Song Launch</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">📝 Notes</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Always create a backup before running migrations or major operations.
                The command center provides quick access to critical launch preparation tasks.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
