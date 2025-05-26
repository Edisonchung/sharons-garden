// pages/admin/command-center.js
import { useState, useEffect } from 'react';
import { PreLaunchChecklist } from '../../utils/PreLaunchChecklist';
import { BackupManager } from '../../utils/backup/BackupManager';
import { migrationRunner } from '../../utils/migrations/MigrationRunner';

export default function CommandCenter() {
  const [checklistResults, setChecklistResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [systemStatus, setSystemStatus] = useState({});

  const runPreLaunchChecklist = async () => {
    setIsRunning(true);
    try {
      const checklist = new PreLaunchChecklist();
      const results = await checklist.runAll();
      setChecklistResults(results);
    } catch (error) {
      toast.error(`Checklist failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runMigration = async (migrationName) => {
    try {
      const result = await migrationRunner.run(migrationName);
      toast.success(`Migration ${migrationName} completed`);
      return result;
    } catch (error) {
      toast.error(`Migration failed: ${error.message}`);
      throw error;
    }
  };

  const createEmergencyBackup = async () => {
    const backupManager = new BackupManager();
    const backupId = await backupManager.createBackup('Emergency backup');
    toast.success(`Backup created: ${backupId}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">🎮 Launch Command Center</h1>
      
      {/* System Status */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="grid grid-cols-4 gap-4">
            <StatusIndicator 
              label="Database" 
              status={systemStatus.database || 'unknown'} 
            />
            <StatusIndicator 
              label="Cache" 
              status={systemStatus.cache || 'unknown'} 
            />
            <StatusIndicator 
              label="Queue" 
              status={systemStatus.queue || 'unknown'} 
            />
            <StatusIndicator 
              label="Monitoring" 
              status={systemStatus.monitoring || 'unknown'} 
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
            {isRunning ? 'Running...' : 'Run All Checks'}
          </Button>

          {checklistResults.length > 0 && (
            <div className="space-y-2">
              {checklistResults.map((result) => (
                <div 
                  key={result.id} 
                  className={`p-3 rounded ${
                    result.status === 'passed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{result.name}</span>
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
          <div className="grid grid-cols-3 gap-4">
            <Button onClick={createEmergencyBackup} variant="outline">
              💾 Emergency Backup
            </Button>
            <Button 
              onClick={() => runMigration('001_create_indexes')} 
              variant="outline"
            >
              📊 Run Index Migration
            </Button>
            <Button 
              onClick={() => runMigration('002_data_cleanup')} 
              variant="outline"
            >
              🧹 Run Cleanup Migration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
