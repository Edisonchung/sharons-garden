// migrations/003_add_performance_fields.js
const addPerformanceFieldsMigration = {
  name: '003_add_performance_fields',
  
  up: async () => {
    const batch = writeBatch(db);
    let updated = 0;

    // Add performance tracking fields to users
    const usersSnap = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      
      if (!data.performanceMetrics) {
        batch.update(userDoc.ref, {
          performanceMetrics: {
            lastActiveAt: serverTimestamp(),
            totalWaterings: 0,
            averageResponseTime: 0,
            lastWateringAt: null
          }
        });
        updated++;
        
        if (updated % 400 === 0) {
          await batch.commit();
        }
      }
    }

    await batch.commit();
    
    return { usersUpdated: updated };
  }
};
