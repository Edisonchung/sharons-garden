// utils/CacheWarmer.js
export class CacheWarmer {
  constructor() {
    this.cacheKeys = [
      'user-flowers-*',
      'melody-seeds',
      'recent-waterings',
      'user-badges-*'
    ];
  }

  async warmCache() {
    console.log('Starting cache warming...');
    const results = {
      warmed: 0,
      failed: 0,
      duration: 0
    };

    const startTime = Date.now();

    try {
      // 1. Warm user data for active users
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const activeUsersQuery = query(
        collection(db, 'users'),
        where('lastLoginAt', '>=', sevenDaysAgo),
        limit(1000)
      );
      
      const activeUsers = await getDocs(activeUsersQuery);
      
      // Pre-fetch flowers for active users
      for (const userDoc of activeUsers.docs) {
        try {
          const flowersQuery = query(
            collection(db, 'flowers'),
            where('userId', '==', userDoc.id)
          );
          
          await getDocs(flowersQuery);
          results.warmed++;
        } catch (error) {
          results.failed++;
        }
      }

      // 2. Warm melody seed data
      const melodySeedsQuery = query(
        collection(db, 'flowers'),
        where('songSeed', '==', true)
      );
      
      await getDocs(melodySeedsQuery);
      results.warmed++;

      // 3. Warm recent waterings
      const recentWateringsQuery = query(
        collection(db, 'waterings'),
        orderBy('timestamp', 'desc'),
        limit(500)
      );
      
      await getDocs(recentWateringsQuery);
      results.warmed++;

    } catch (error) {
      console.error('Cache warming error:', error);
    }

    results.duration = Date.now() - startTime;
    console.log('Cache warming completed:', results);
    
    return results;
  }
}
