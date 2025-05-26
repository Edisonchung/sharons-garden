// migrations/002_data_cleanup.js
import { writeBatch, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

const dataCleanupMigration = {
  name: '002_data_cleanup',
  
  up: async () => {
    const stats = {
      oldWateringsRemoved: 0,
      orphanedFlowersRemoved: 0,
      expiredNotificationsRemoved: 0,
      duplicateUsersFixed: 0
    };

    const batch = writeBatch(db);
    let batchCount = 0;

    // 1. Remove old waterings (30+ days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldWateringsQuery = query(
      collection(db, 'waterings'),
      where('timestamp', '<', Timestamp.fromDate(thirtyDaysAgo))
    );
    
    const oldWaterings = await getDocs(oldWateringsQuery);
    
    for (const doc of oldWaterings.docs) {
      batch.delete(doc.ref);
      stats.oldWateringsRemoved++;
      batchCount++;
      
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // 2. Find and remove orphaned flowers
    const [flowersSnap, usersSnap] = await Promise.all([
      getDocs(collection(db, 'flowers')),
      getDocs(collection(db, 'users'))
    ]);
    
    const validUserIds = new Set(usersSnap.docs.map(doc => doc.id));
    
    for (const flowerDoc of flowersSnap.docs) {
      const userId = flowerDoc.data().userId;
      if (!validUserIds.has(userId)) {
        batch.delete(flowerDoc.ref);
        stats.orphanedFlowersRemoved++;
        batchCount++;
        
        if (batchCount >= 400) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }

    // 3. Clean expired notifications
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    for (const userDoc of usersSnap.docs) {
      const notifications = userDoc.data().notifications || [];
      const activeNotifications = notifications.filter(n => {
        const notifDate = n.timestamp?.toDate?.() || new Date(n.createdAt);
        return notifDate > sixtyDaysAgo;
      });
      
      if (activeNotifications.length < notifications.length) {
        batch.update(userDoc.ref, { notifications: activeNotifications });
        stats.expiredNotificationsRemoved += notifications.length - activeNotifications.length;
        batchCount++;
        
        if (batchCount >= 400) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }

    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
    }

    return stats;
  },

  down: async () => {
    // Cannot restore deleted data without backup
    throw new Error('Rollback requires restore from backup');
  }
};

migrationRunner.register('002_data_cleanup', dataCleanupMigration);
