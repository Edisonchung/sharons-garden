// utils/backup/BackupManager.js
import { db, storage } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ref, uploadString, listAll, getDownloadURL } from 'firebase/storage';

export class BackupManager {
  constructor() {
    this.collections = [
      'users', 'flowers', 'waterings', 'rewards', 
      'notifications', 'usernameRequests'
    ];
  }

  async createBackup(description = 'Manual backup') {
    const backupId = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const backupData = {
      id: backupId,
      timestamp: new Date().toISOString(),
      description,
      collections: {}
    };

    console.log(`Creating backup: ${backupId}`);

    try {
      // Backup each collection
      for (const collName of this.collections) {
        console.log(`Backing up ${collName}...`);
        const snapshot = await getDocs(collection(db, collName));
        
        backupData.collections[collName] = {
          count: snapshot.size,
          documents: []
        };

        snapshot.forEach(doc => {
          backupData.collections[collName].documents.push({
            id: doc.id,
            data: doc.data()
          });
        });
      }

      // Save to Firebase Storage
      const backupJson = JSON.stringify(backupData, null, 2);
      const storageRef = ref(storage, `backups/${backupId}.json`);
      await uploadString(storageRef, backupJson);

      // Record backup metadata
      await setDoc(doc(db, '_backups', backupId), {
        id: backupId,
        timestamp: backupData.timestamp,
        description,
        size: new Blob([backupJson]).size,
        documentCount: Object.values(backupData.collections)
          .reduce((sum, coll) => sum + coll.count, 0),
        collections: Object.keys(backupData.collections),
        createdBy: auth.currentUser?.uid
      });

      console.log(`Backup completed: ${backupId}`);
      return backupId;
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  async listBackups() {
    const backupsRef = ref(storage, 'backups');
    const result = await listAll(backupsRef);
    
    const backups = await Promise.all(
      result.items.map(async (item) => {
        const url = await getDownloadURL(item);
        const metadata = await getDoc(doc(db, '_backups', item.name.replace('.json', '')));
        return {
          name: item.name,
          url,
          metadata: metadata.data()
        };
      })
    );

    return backups.sort((a, b) => 
      new Date(b.metadata?.timestamp) - new Date(a.metadata?.timestamp)
    );
  }

  async restore(backupId) {
    // Implementation for restore functionality
    console.log(`Restoring from backup: ${backupId}`);
    // This should be implemented with careful consideration
    // and likely require admin confirmation
  }
}
