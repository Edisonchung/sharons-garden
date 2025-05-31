// utils/WateringManager.js - Debug Enhanced Version
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
import { FLOWER_DATABASE } from '../hooks/useSeedTypes';

class DebugWateringManager {
  constructor() {
    this.operationQueue = [];
    this.isProcessing = false;
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      queueLength: 0,
      pendingOperations: 0,
      averageResponseTime: 0
    };
    
    setInterval(() => this.processQueue(), 500);
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
    console.log('🌊 Starting watering operation:', { userId, seedId, wateredBy, seedData });
    
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        userId,
        seedId,
        wateredBy,
        seedData,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.metrics.queueLength = this.operationQueue.length;
      console.log('📝 Added to queue, length:', this.metrics.queueLength);
    });
  }

  async processQueue() {
    if (this.isProcessing || this.operationQueue.length === 0) return;
    
    this.isProcessing = true;
    const operation = this.operationQueue.shift();
    this.metrics.queueLength = this.operationQueue.length;
    
    if (!operation) {
      this.isProcessing = false;
      return;
    }
    
    console.log('⚙️ Processing watering operation...');
    
    try {
      this.metrics.pendingOperations++;
      const result = await this.executeWatering(operation);
      
      this.metrics.successfulOperations++;
      this.updateMetrics(Date.now() - operation.timestamp);
      
      console.log('✅ Watering successful:', result);
      operation.resolve(result);
      
    } catch (error) {
      console.error('❌ Watering operation failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      this.metrics.failedOperations++;
      
      const userError = this.getUserFriendlyError(error);
      operation.reject(new Error(userError));
      
    } finally {
      this.metrics.pendingOperations--;
      this.isProcessing = false;
    }
  }

  async executeWatering({ userId, seedId, wateredBy, seedData }) {
    const startTime = Date.now();
    console.log('🔧 Executing watering:', { userId, seedId, wateredBy });
    
    // Check auth
    if (!auth.currentUser) {
      throw new Error('Not authenticated');
    }
    console.log('✅ Auth check passed:', auth.currentUser.uid);
    
    // Check daily limit
    const canWater = await this.canWaterToday(userId, seedId);
    if (!canWater) {
      throw new Error('You have already watered this seed today. Come back tomorrow! 🌙');
    }
    console.log('✅ Daily limit check passed');

    // Get current seed state
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
    
    // Validation checks
    if (currentSeed.bloomed) {
      console.log('❌ Seed already bloomed');
      throw new Error('This seed has already bloomed! 🌸');
    }
    
    if (currentSeed.waterCount >= 7) {
      console.log('❌ Seed at max water count');
      throw new Error('This seed has reached its maximum water limit.');
    }

    // Calculate new state
    const newWaterCount = (currentSeed.waterCount || 0) + 1;
    const willBloom = newWaterCount >= 7;
    const isOwner = userId === currentSeed.userId;
    
    console.log('🧮 Calculated update:', {
      currentWaterCount: currentSeed.waterCount || 0,
      newWaterCount,
      willBloom,
      isOwner
    });

    // MINIMAL UPDATE OBJECT - Only essential fields
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

    // Perform the update
    console.log('💾 Updating seed document...');
    await updateDoc(seedRef, seedUpdate);
    console.log('✅ Document updated successfully');

    // Create logs asynchronously (don't await)
    this.createLogsAsync({
      seedId,
      seedOwnerId: currentSeed.userId,
      seedType: currentSeed.type,
      wateredByUserId: userId,
      wateredByUsername: wateredBy,
      waterCount: newWaterCount,
      resultedInBloom: willBloom,
      isOwnerWatering: isOwner
    }).catch(logError => {
      console.warn('⚠️ Failed to create logs (non-critical):', logError);
    });

    // Update localStorage
    localStorage.setItem(`lastWatered_${seedId}`, new Date().toISOString());
    console.log('💾 Updated localStorage');

    const result = {
      success: true,
      newWaterCount,
      bloomed: willBloom,
      isOwner,
      wateredBy,
      bloomedFlower: willBloom ? '🌸' : null,
      responseTime: Date.now() - startTime,
      seedOwnerId: currentSeed.userId,
      seedType: currentSeed.type
    };

    console.log('🎉 Watering operation completed:', result);
    return result;
  }

  async createLogsAsync(logData) {
    console.log('📋 Creating logs...', logData);
    try {
      // Create watering log
      const wateringDoc = await addDoc(collection(db, 'waterings'), {
        ...logData,
        timestamp: serverTimestamp()
      });
      console.log('✅ Watering log created:', wateringDoc.id);

      // Create daily watering record
      const today = new Date().toDateString().replace(/\s/g, '_');
      const dailyDoc = await addDoc(collection(db, 'dailyWaterings'), {
        userId: logData.wateredByUserId,
        seedId: logData.seedId,
        seedOwnerId: logData.seedOwnerId,
        date: today,
        timestamp: serverTimestamp()
      });
      console.log('✅ Daily watering log created:', dailyDoc.id);

    } catch (logError) {
      console.warn('⚠️ Failed to create logs (non-critical):', logError);
    }
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
    
    // Return original message for debugging
    return error.message || 'Something went wrong while watering. Please try again.';
  }

  updateMetrics(responseTime) {
    this.metrics.totalOperations++;
    const oldAvg = this.metrics.averageResponseTime;
    this.metrics.averageResponseTime = 
      (oldAvg * (this.metrics.totalOperations - 1) + responseTime) / this.metrics.totalOperations;
  }

  getMetrics() {
    const successRate = this.metrics.totalOperations > 0 
      ? ((this.metrics.successfulOperations / this.metrics.totalOperations) * 100).toFixed(1)
      : '0.0';

    return {
      ...this.metrics,
      successRate: `${successRate}%`,
      averageResponseTime: `${this.metrics.averageResponseTime.toFixed(0)}ms`
    };
  }
}

// Create singleton instance
export const wateringManager = new DebugWateringManager();

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
