// utils/WateringManager.js - FIXED: Minimal Working Version
import { useState, useCallback } from 'react';
import { 
  doc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp, 
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

class SimpleWateringManager {
  constructor() {
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      queueLength: 0,
      pendingOperations: 0,
      averageResponseTime: 0
    };
  }

  async canWaterToday(userId, seedId) {
    console.log('🔍 Checking daily watering for:', { userId, seedId });
    const today = new Date().toDateString();
    const lastKey = `lastWatered_${seedId}`;
    const lastWater = localStorage.getItem(lastKey);
    const canWater = !lastWater || new Date(lastWater).toDateString() !== today;
    console.log('✅ Daily check result:', { canWater, lastWater, today });
    return canWater;
  }

  async waterSeed(userId, seedId, wateredBy, seedData) {
    console.log('🌊 FIXED: Starting direct watering operation:', { userId, seedId, wateredBy });
    
    const startTime = Date.now();
    
    try {
      // STEP 1: Basic auth check
      if (!auth.currentUser) {
        throw new Error('Not authenticated');
      }
      console.log('✅ Auth check passed:', auth.currentUser.uid);
      
      // STEP 2: Check daily limit
      const canWater = await this.canWaterToday(userId, seedId);
      if (!canWater) {
        throw new Error('You have already watered this seed today. Come back tomorrow! 🌙');
      }
      console.log('✅ Daily limit check passed');

      // STEP 3: Get current seed state (exactly like debug test)
      const seedRef = doc(db, 'flowers', seedId);
      console.log('📖 Reading seed document:', seedId);
      
      const seedSnap = await getDoc(seedRef);
      
      if (!seedSnap.exists()) {
        console.error('❌ Seed not found:', seedId);
        throw new Error('Seed not found or has been removed.');
      }

      const currentSeed = seedSnap.data();
      console.log('📊 Current seed state:', {
        waterCount: currentSeed.waterCount,
        bloomed: currentSeed.bloomed,
        userId: currentSeed.userId
      });
      
      // STEP 4: Validation checks
      if (currentSeed.bloomed) {
        console.log('❌ Seed already bloomed');
        throw new Error('This seed has already bloomed! 🌸');
      }
      
      if (currentSeed.waterCount >= 7) {
        console.log('❌ Seed at max water count');
        throw new Error('This seed has reached its maximum water limit.');
      }

      // STEP 5: Calculate new state
      const newWaterCount = (currentSeed.waterCount || 0) + 1;
      const willBloom = newWaterCount >= 7;
      const isOwner = userId === currentSeed.userId;
      
      console.log('🧮 Calculated update:', {
        currentWaterCount: currentSeed.waterCount || 0,
        newWaterCount,
        willBloom,
        isOwner
      });

      // STEP 6: EXACT SAME UPDATE AS DEBUG TEST - MINIMAL OBJECT
      const seedUpdate = {
        waterCount: newWaterCount
      };

      // Only add bloom fields if actually blooming
      if (willBloom) {
        console.log('🌸 Seed will bloom, adding bloom fields...');
        seedUpdate.bloomed = true;
        seedUpdate.bloomedFlower = '🌸';
        seedUpdate.bloomTime = serverTimestamp();
      }

      console.log('📝 Final update object:', seedUpdate);
      console.log('🔒 Current user:', auth.currentUser.uid);
      console.log('🔒 Seed owner:', currentSeed.userId);

      // STEP 7: Perform the update (exactly like debug test)
      console.log('💾 Updating seed document...');
      await updateDoc(seedRef, seedUpdate);
      console.log('✅ Document updated successfully');

      // STEP 8: Update localStorage (exactly like debug test)
      localStorage.setItem(`lastWatered_${seedId}`, new Date().toISOString());
      console.log('💾 Updated localStorage');

      // STEP 9: Create logs in background (don't await - don't let this fail the main operation)
      this.createLogsInBackground({
        seedId,
        seedOwnerId: currentSeed.userId,
        seedType: currentSeed.type,
        wateredByUserId: userId,
        wateredByUsername: wateredBy,
        waterCount: newWaterCount,
        resultedInBloom: willBloom,
        isOwnerWatering: isOwner
      });

      // STEP 10: Update metrics
      this.metrics.totalOperations++;
      this.metrics.successfulOperations++;
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);

      const result = {
        success: true,
        newWaterCount,
        bloomed: willBloom,
        isOwner,
        wateredBy,
        bloomedFlower: willBloom ? '🌸' : null,
        responseTime,
        seedOwnerId: currentSeed.userId,
        seedType: currentSeed.type
      };

      console.log('🎉 Watering operation completed successfully:', result);
      return result;

    } catch (error) {
      console.error('❌ Watering operation failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      this.metrics.totalOperations++;
      this.metrics.failedOperations++;
      
      // Transform Firebase errors into user-friendly messages
      const userError = this.getUserFriendlyError(error);
      throw new Error(userError);
    }
  }

  // Create logs in background - don't let this fail the main operation
  createLogsInBackground(logData) {
    console.log('📋 Creating logs in background...', logData);
    
    // Fire and forget - don't await these
    Promise.all([
      // Create watering log
      addDoc(collection(db, 'waterings'), {
        ...logData,
        timestamp: serverTimestamp()
      }).then(doc => console.log('✅ Watering log created:', doc.id)),
      
      // Create daily watering record
      addDoc(collection(db, 'dailyWaterings'), {
        userId: logData.wateredByUserId,
        seedId: logData.seedId,
        seedOwnerId: logData.seedOwnerId,
        date: new Date().toDateString().replace(/\s/g, '_'),
        timestamp: serverTimestamp()
      }).then(doc => console.log('✅ Daily watering log created:', doc.id))
      
    ]).catch(logError => {
      console.warn('⚠️ Failed to create logs (non-critical):', logError);
      // Don't fail the main operation for logging errors
    });
  }

  getUserFriendlyError(error) {
    const message = error.message.toLowerCase();
    
    console.log('🔍 Processing error:', { 
      originalMessage: error.message,
      code: error.code,
      isFirebaseError: error.code !== undefined 
    });
    
    if (message.includes('permission') || message.includes('denied') || error.code === 'permission-denied') {
      return 'Permission denied. Please try signing out and signing back in.';
    }
    
    if (message.includes('network') || message.includes('timeout')) {
      return 'Network connection issue. Please check your internet and try again.';
    }
    
    if (message.includes('already watered')) {
      return 'You already watered this seed today. Come back tomorrow! 🌙';
    }
    
    if (message.includes('bloomed')) {
      return 'This seed has already bloomed! 🌸';
    }
    
    // Return original message for debugging in development
    if (process.env.NODE_ENV === 'development') {
      return `DEV: ${error.message}`;
    }
    
    return 'Something went wrong while watering. Please try again.';
  }

  updateAverageResponseTime(responseTime) {
    const oldAvg = this.metrics.averageResponseTime;
    const total = this.metrics.totalOperations;
    this.metrics.averageResponseTime = 
      (oldAvg * (total - 1) + responseTime) / total;
  }

  getMetrics() {
    const successRate = this.metrics.totalOperations > 0 
      ? ((this.metrics.successfulOperations / this.metrics.totalOperations) * 100).toFixed(1)
      : '0.0';

    return {
      ...this.metrics,
      successRate: `${successRate}%`,
      averageResponseTime: `${this.metrics.averageResponseTime.toFixed(0)}ms`,
      queueLength: 0, // No queue in simple version
      pendingOperations: 0 // No queue in simple version
    };
  }
}

// Create singleton instance
export const wateringManager = new SimpleWateringManager();

// React hook
export function useWatering() {
  const [isWatering, setIsWatering] = useState(false);
  const [error, setError] = useState(null);

  const waterSeed = useCallback(async (userId, seedId, wateredBy, seedData) => {
    console.log('🎣 useWatering hook called:', { userId, seedId, wateredBy });
    
    if (!auth.currentUser) {
      console.error('❌ No authenticated user');
      throw new Error('Please sign in to water seeds');
    }

    setIsWatering(true);
    setError(null);

    try {
      const result = await wateringManager.waterSeed(userId, seedId, wateredBy, seedData);
      console.log('🎉 Hook: Watering successful');
      return result;
    } catch (err) {
      console.error('❌ Hook: Watering error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsWatering(false);
      console.log('🏁 Hook: Watering operation finished');
    }
  }, []);

  const canWaterToday = useCallback(async (userId, seedId) => {
    try {
      return await wateringManager.canWaterToday(userId, seedId);
    } catch (err) {
      console.error('❌ Error checking daily watering:', err);
      return false;
    }
  }, []);

  return {
    waterSeed,
    canWaterToday,
    isWatering,
    error
  };
}

export default wateringManager;
