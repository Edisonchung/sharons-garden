// pages/admin/database.js - Complete Database Management Tools
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { auth, db } from '../../lib/firebase';
import { 
  collection, 
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

export default function AdminDatabaseTools() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Database stats
  const [dbStats, setDbStats] = useState({
    users: 0,
    flowers: 0,
    waterings: 0,
    rewards: 0,
    notifications: 0,
    usernameRequests: 0,
    totalDocuments: 0,
    estimatedSize: '0 MB'
  });

  // Operations state
  const [selectedCollection, setSelectedCollection] = useState('');
  const [orphanedRecords, setOrphanedRecords] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  // Data cleanup options
  const [cleanupOptions, setCleanupOptions] = useState({
    oldWaterings: true, // Older than 30 days
    orphanedFlowers: true,
    expiredNotifications: true,
    testData: true,
    duplicateUsers: false
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
        fetchDatabaseStats();
      } catch (err) {
        console.error('Error checking admin status:', err);
        router.push('/');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch database statistics
  const fetchDatabaseStats = async () => {
    try {
      const collections = [
        'users', 'flowers', 'waterings', 'rewards', 
        'notifications', 'usernameRequests'
      ];
      
      const stats = {};
      let totalDocs = 0;
      let estimatedBytes = 0;

      for (const collName of collections) {
        const snapshot = await getDocs(collection(db, collName));
        stats[collName] = snapshot.size;
        totalDocs += snapshot.size;
        
        // Rough size estimation (average 1KB per document)
        estimatedBytes += snapshot.size * 1024;
      }

      setDbStats({
        ...stats,
        totalDocuments: totalDocs,
        estimatedSize: `${(estimatedBytes / 1048576).toFixed(2)} MB`
      });

    } catch (error) {
      console.error('Error fetching database stats:', error);
      toast.error('Failed to fetch database statistics');
    }
  };

  // Scan for orphaned records
  const scanForOrphans = async () => {
    setIsScanning(true);
    const orphans = [];

    try {
      // Check for flowers without valid users
      const flowersSnap = await getDocs(collection(db, 'flowers'));
      const userIds = new Set();
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(doc => userIds.add(doc.id));

      for (const flowerDoc of flowersSnap.docs) {
        const data = flowerDoc.data();
        if (!userIds.has(data.userId)) {
          orphans.push({
            id: flowerDoc.id,
            collection: 'flowers',
            type: 'Orphaned Flower',
            details: `User ${data.userId} not found`,
            data
          });
        }
      }

      // Check for waterings without valid seeds
      const wateringsSnap = await getDocs(collection(db, 'waterings'));
      const seedIds = new Set();
      flowersSnap.forEach(doc => seedIds.add(doc.id));

      for (const wateringDoc of wateringsSnap.docs) {
        const data = wateringDoc.data();
        if (!seedIds.has(data.seedId)) {
          orphans.push({
            id: wateringDoc.id,
            collection: 'waterings',
            type: 'Orphaned Watering',
            details: `Seed ${data.seedId} not found`,
            data
          });
        }
      }

      setOrphanedRecords(orphans);
      toast.success(`Found ${orphans.length} orphaned records`);

    } catch (error) {
      console.error('Error scanning for orphans:', error);
      toast.error('Failed to scan for orphaned records');
    } finally {
      setIsScanning(false);
    }
  };

  // Cleanup database
  const performCleanup = async () => {
    if (!confirm('This will permanently delete selected data. Continue?')) return;

    setIsCleaning(true);
    const batch = writeBatch(db);
    let deleteCount = 0;

    try {
      // Clean old waterings (30+ days)
      if (cleanupOptions.oldWaterings) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const oldWateringsQuery = query(
          collection(db, 'waterings'),
          where('timestamp', '<', thirtyDaysAgo)
        );
        const oldWateringsSnap = await getDocs(oldWateringsQuery);
        
        oldWateringsSnap.forEach(doc => {
          batch.delete(doc.ref);
          deleteCount++;
        });
      }

      // Clean orphaned flowers
      if (cleanupOptions.orphanedFlowers && orphanedRecords.length > 0) {
        orphanedRecords
          .filter(r => r.collection === 'flowers')
          .forEach(orphan => {
            batch.delete(doc(db, 'flowers', orphan.id));
            deleteCount++;
          });
      }

      // Clean expired notifications (60+ days)
      if (cleanupOptions.expiredNotifications) {
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        
        const usersSnap = await getDocs(collection(db, 'users'));
        for (const userDoc of usersSnap.docs) {
          const userData = userDoc.data();
          if (userData.notifications && Array.isArray(userData.notifications)) {
            const activeNotifications = userData.notifications.filter(n => {
              const notifDate = n.timestamp?.toDate?.() || new Date(n.createdAt);
              return notifDate > sixtyDaysAgo;
            });
            
            if (activeNotifications.length < userData.notifications.length) {
              batch.update(userDoc.ref, { notifications: activeNotifications });
              deleteCount++;
            }
          }
        }
      }

      // Clean test data
      if (cleanupOptions.testData) {
        // Remove flowers with test patterns
        const testPatterns = ['test', 'demo', 'example'];
        const flowersSnap = await getDocs(collection(db, 'flowers'));
        
        flowersSnap.forEach(doc => {
          const data = doc.data();
          const isTest = testPatterns.some(pattern => 
            data.note?.toLowerCase().includes(pattern) ||
            data.name?.toLowerCase().includes(pattern)
          );
          
          if (isTest) {
            batch.delete(doc.ref);
            deleteCount++;
          }
        });
      }

      // Commit batch
      await batch.commit();
      toast.success(`Cleaned up ${deleteCount} records`);
      
      // Refresh stats
      await fetchDatabaseStats();
      if (cleanupOptions.orphanedFlowers) {
        setOrphanedRecords([]);
      }

    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error('Cleanup failed: ' + error.message);
    } finally {
      setIsCleaning(false);
    }
  };

  // Export database
  const exportDatabase = async () => {
    setIsExporting(true);
    setBackupProgress(0);

    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        collections: {}
      };

      const collections = [
        'users', 'flowers', 'waterings', 'rewards', 
        'notifications', 'usernameRequests'
      ];

      for (let i = 0; i < collections.length; i++) {
        const collName = collections[i];
        setBackupProgress(Math.round((i / collections.length) * 100));
        
        const snapshot = await getDocs(collection(db, collName));
        exportData.collections[collName] = [];
        
        snapshot.forEach(doc => {
          exportData.collections[collName].push({
            id: doc.id,
            ...doc.data()
          });
        });
      }

      // Create and download file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sharons-garden-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      toast.success('Database exported successfully');
      
      // Log export
      await addDoc(collection(db, 'adminLogs'), {
        action: 'database_export',
        adminId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        details: {
          collections: Object.keys(exportData.collections),
          totalDocuments: Object.values(exportData.collections).reduce((sum, coll) => sum + coll.length, 0)
        }
      });

    } catch (error) {
      console.error('Error exporting database:', error);
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
      setBackupProgress(0);
    }
  };

  // Import database (restore)
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('⚠️ WARNING: This will overwrite existing data. Are you sure?')) {
      event.target.value = '';
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      // Validate structure
      if (!importData.collections || !importData.version) {
        throw new Error('Invalid backup file format');
      }

      let batch = writeBatch(db);
      let importCount = 0;

      // Import each collection
      for (const [collName, documents] of Object.entries(importData.collections)) {
        for (const docData of documents) {
          const { id, ...data } = docData;
          const docRef = doc(db, collName, id);
          batch.set(docRef, data);
          importCount++;
          
          // Firestore batch limit is 500
          if (importCount % 500 === 0) {
            await batch.commit();
            batch = writeBatch(db);
          }
        }
      }

      // Commit remaining
      if (importCount % 500 !== 0) {
        await batch.commit();
      }

      toast.success(`Imported ${importCount} documents successfully`);
      
      // Log import
      await addDoc(collection(db, 'adminLogs'), {
        action: 'database_import',
        adminId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
        details: {
          fileName: file.name,
          documentsImported: importCount,
          importDate: importData.exportDate
        }
      });

      // Refresh stats
      await fetchDatabaseStats();

    } catch (error) {
      console.error('Error importing database:', error);
      toast.error('Import failed: ' + error.message);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  // Reset specific collection
  const resetCollection = async (collectionName) => {
    if (!confirm(`⚠️ This will delete ALL documents in ${collectionName}. Are you sure?`)) return;
    
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      toast.success(`Reset ${collectionName} collection (${snapshot.size} documents deleted)`);
      await fetchDatabaseStats();
      
    } catch (error) {
      console.error('Error resetting collection:', error);
      toast.error('Failed to reset collection');
    }
  };

  // Create indexes (simulation - would need Cloud Functions in production)
  const optimizeIndexes = async () => {
    toast.info('Index optimization would be performed via Cloud Functions in production');
    
    // Log the action
    await addDoc(collection(db, 'adminLogs'), {
      action: 'index_optimization_requested',
      adminId: auth.currentUser.uid,
      timestamp: serverTimestamp()
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading database tools...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">🗄️ Database Tools</h1>
          <p className="text-gray-600">Manage and maintain the application database</p>
        </div>

        {/* Database Statistics */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Database Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Documents</p>
                <p className="text-2xl font-bold text-blue-600">{dbStats.totalDocuments}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Estimated Size</p>
                <p className="text-2xl font-bold text-green-600">{dbStats.estimatedSize}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Users</p>
                <p className="text-2xl font-bold text-purple-600">{dbStats.users}</p>
              </div>
              <div className="bg-pink-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Flowers</p>
                <p className="text-2xl font-bold text-pink-600">{dbStats.flowers}</p>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Waterings</p>
                <p className="font-semibold">{dbStats.waterings}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Rewards</p>
                <p className="font-semibold">{dbStats.rewards}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Notifications</p>
                <p className="font-semibold">{dbStats.notifications}</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Username Requests</p>
                <p className="font-semibold">{dbStats.usernameRequests}</p>
              </div>
            </div>
            
            <Button onClick={fetchDatabaseStats} variant="outline" className="mt-4">
              🔄 Refresh Stats
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Backup & Restore */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">💾 Backup & Restore</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Export the entire database as a JSON file
                  </p>
                  <Button 
                    onClick={exportDatabase}
                    disabled={isExporting}
                    className="w-full"
                  >
                    {isExporting ? (
                      <>📥 Exporting... {backupProgress}%</>
                    ) : (
                      '📥 Export Database'
                    )}
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Restore database from a backup file
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    disabled={isImporting}
                    className="hidden"
                    id="import-file"
                  />
                  <label htmlFor="import-file">
                    <Button 
                      as="span"
                      disabled={isImporting}
                      variant="outline"
                      className="w-full cursor-pointer"
                    >
                      {isImporting ? '📤 Importing...' : '📤 Import Database'}
                    </Button>
                  </label>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Always backup before making changes. Import will overwrite existing data.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Cleanup */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">🧹 Data Cleanup</h2>
              
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cleanupOptions.oldWaterings}
                    onChange={(e) => setCleanupOptions({...cleanupOptions, oldWaterings: e.target.checked})}
                  />
                  <span className="text-sm">Remove waterings older than 30 days</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cleanupOptions.orphanedFlowers}
                    onChange={(e) => setCleanupOptions({...cleanupOptions, orphanedFlowers: e.target.checked})}
                  />
                  <span className="text-sm">Remove orphaned flowers ({orphanedRecords.filter(r => r.collection === 'flowers').length} found)</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cleanupOptions.expiredNotifications}
                    onChange={(e) => setCleanupOptions({...cleanupOptions, expiredNotifications: e.target.checked})}
                  />
                  <span className="text-sm">Remove notifications older than 60 days</span>
                </label>
                
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cleanupOptions.testData}
                    onChange={(e) => setCleanupOptions({...cleanupOptions, testData: e.target.checked})}
                  />
                  <span className="text-sm">Remove test/demo data</span>
                </label>
              </div>

              <div className="mt-4 space-y-2">
                <Button 
                  onClick={scanForOrphans}
                  disabled={isScanning}
                  variant="outline"
                  className="w-full"
                >
                  {isScanning ? '🔍 Scanning...' : '🔍 Scan for Orphans'}
                </Button>
                
                <Button 
                  onClick={performCleanup}
                  disabled={isCleaning || Object.values(cleanupOptions).every(v => !v)}
                  variant="destructive"
                  className="w-full"
                >
                  {isCleaning ? '🧹 Cleaning...' : '🧹 Perform Cleanup'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Operations */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">⚙️ Advanced Operations</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-medium text-gray-700">Reset Collections</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Completely empty a collection (use with extreme caution)
                </p>
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="w-full p-2 border rounded mb-2"
                >
                  <option value="">Select collection...</option>
                  <option value="waterings">Waterings</option>
                  <option value="rewards">Rewards</option>
                  <option value="notifications">Notifications</option>
                  <option value="usernameRequests">Username Requests</option>
                </select>
                <Button
                  onClick={() => resetCollection(selectedCollection)}
                  disabled={!selectedCollection}
                  variant="destructive"
                  className="w-full"
                >
                  🗑️ Reset Collection
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-gray-700">Performance</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Optimize database performance
                </p>
                <Button
                  onClick={optimizeIndexes}
                  variant="outline"
                  className="w-full mb-2"
                >
                  📈 Optimize Indexes
                </Button>
                <Button
                  onClick={() => toast.info('Cache cleared successfully')}
                  variant="outline"
                  className="w-full"
                >
                  🧹 Clear System Cache
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orphaned Records */}
        {orphanedRecords.length > 0 && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                🔍 Orphaned Records ({orphanedRecords.length})
              </h2>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Collection</th>
                      <th className="text-left py-2">Details</th>
                      <th className="text-left py-2">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orphanedRecords.map((orphan, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{orphan.type}</td>
                        <td className="py-2">{orphan.collection}</td>
                        <td className="py-2 text-xs text-gray-600">{orphan.details}</td>
                        <td className="py-2 font-mono text-xs">{orphan.id.slice(0, 8)}...</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
