// config/launchConfig.js
export const LAUNCH_CONFIG = {
  songLaunchDate: new Date('2025-05-30T00:00:00'),
  
  features: {
    melodySeedEnabled: true,
    melodySeedStartDate: new Date('2025-05-23T00:00:00'), // 7 days before
    melodySeedEndDate: new Date('2025-05-30T23:59:59'),
    autoShowModal: true,
    modalShowDays: 7
  },
  
  rateLimits: {
    standard: {
      windowMs: 60000, // 1 minute
      maxActions: 10,
      dailyLimit: 50
    },
    launchDay: {
      windowMs: 60000,
      maxActions: 20, // Increased for launch
      dailyLimit: 100
    }
  },
  
  performance: {
    maxConcurrentOperations: 10, // Increased from 5
    queueProcessInterval: 50, // Decreased from 100ms
    transactionTimeout: 15000, // Increased from 10s
    cacheExpiration: 5000 // 5 seconds
  },
  
  monitoring: {
    errorThreshold: 0.05, // 5%
    slowQueryThreshold: 5000, // 5 seconds
    queueSizeWarning: 100,
    queueSizeCritical: 500
  }
};

// Save to Firestore
export async function saveLaunchConfig() {
  await setDoc(doc(db, 'config', 'launch'), LAUNCH_CONFIG);
}
