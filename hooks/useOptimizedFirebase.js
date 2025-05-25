// hooks/useOptimizedFirebase.js
import { useState, useEffect, useRef } from 'react';
import { onSnapshot, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Singleton pattern to prevent duplicate listeners across components
const activeListeners = new Map();
const queryCache = new Map();

export function useOptimizedSnapshot(queryKey, firestoreQuery, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);
  
  // Cache configuration
  const { 
    cacheDuration = 10000, // 10 seconds default cache
    maxRetries = 3,
    retryDelay = 1000
  } = options;
  
  const lastFetchRef = useRef(0);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!firestoreQuery) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    
    // Check cache first
    const cachedData = queryCache.get(queryKey);
    if (cachedData && (now - cachedData.timestamp) < cacheDuration) {
      setData(cachedData.data);
      setLoading(false);
      return;
    }

    // Check if listener already exists for this query
    if (activeListeners.has(queryKey)) {
      const existingListener = activeListeners.get(queryKey);
      setData(existingListener.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    const attemptConnection = () => {
      const unsubscribe = onSnapshot(
        firestoreQuery,
        (snapshot) => {
          try {
            const result = snapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            }));
            
            setData(result);
            setLoading(false);
            setError(null);
            lastFetchRef.current = now;
            retryCountRef.current = 0;
            
            // Update caches
            queryCache.set(queryKey, { data: result, timestamp: now });
            activeListeners.set(queryKey, { data: result, timestamp: now });
            
            console.log(`📊 Firebase read: ${queryKey} (${result.length} docs)`);
            
          } catch (err) {
            console.error(`Data processing error for ${queryKey}:`, err);
            setError(err);
          }
        },
        (err) => {
          console.error(`Firebase error for ${queryKey}:`, err);
          setError(err);
          setLoading(false);
          
          // Retry logic for network issues
          if (retryCountRef.current < maxRetries) {
            retryCountRef.current++;
            console.log(`Retrying ${queryKey} (${retryCountRef.current}/${maxRetries})`);
            
            setTimeout(() => {
              attemptConnection();
            }, retryDelay * retryCountRef.current);
          }
        }
      );

      unsubscribeRef.current = unsubscribe;
    };

    attemptConnection();

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      // Remove from active listeners after delay to allow other components to use cache
      setTimeout(() => {
        activeListeners.delete(queryKey);
      }, cacheDuration);
    };
  }, [queryKey, firestoreQuery, cacheDuration, maxRetries, retryDelay]);

  return { data, loading, error };
}

// NEW: Hook for notification badge count
export function useNotificationCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUnreadCount(0);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const unsubscribeNotifications = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const notifications = doc.data().notifications || [];
          const unread = notifications.filter(n => !n.read).length;
          setUnreadCount(unread);
        }
      });

      return () => unsubscribeNotifications();
    });

    return () => unsubscribe();
  }, []);

  return unreadCount;
}

// Batched write operations to prevent Firebase quota hits during high traffic
export class FirebaseBatchManager {
  constructor(maxBatchSize = 500) {
    this.pendingWrites = [];
    this.maxBatchSize = maxBatchSize;
    this.flushTimer = null;
    this.isProcessing = false;
  }

  addWrite(operation) {
    this.pendingWrites.push({
      ...operation,
      timestamp: Date.now()
    });
    
    console.log(`📝 Batch: Added operation, queue size: ${this.pendingWrites.length}`);
    
    if (this.pendingWrites.length >= this.maxBatchSize) {
      this.flush();
    } else {
      // Auto-flush after 2 seconds of inactivity
      clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => this.flush(), 2000);
    }
  }

  async flush() {
    if (this.pendingWrites.length === 0 || this.isProcessing) return;
    
    this.isProcessing = true;
    clearTimeout(this.flushTimer);
    
    const batch = writeBatch(db);
    const operations = this.pendingWrites.splice(0, this.maxBatchSize);
    
    console.log(`🚀 Batch: Processing ${operations.length} operations`);
    
    try {
      operations.forEach(op => {
        if (op.type === 'set') {
          batch.set(op.ref, op.data);
        } else if (op.type === 'update') {
          batch.update(op.ref, op.data);
        } else if (op.type === 'delete') {
          batch.delete(op.ref);
        }
      });

      await batch.commit();
      console.log(`✅ Batch: Successfully committed ${operations.length} operations`);
      
    } catch (error) {
      console.error('❌ Batch write failed:', error);
      
      // Re-add failed operations to retry queue (at the front)
      this.pendingWrites.unshift(...operations);
      
      // Exponential backoff for retry
      setTimeout(() => {
        this.isProcessing = false;
        this.flush();
      }, Math.min(5000, 1000 * Math.pow(2, operations.length / 100)));
      
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  // Force flush all pending operations (useful for app shutdown)
  async forceFlush() {
    while (this.pendingWrites.length > 0) {
      await this.flush();
    }
  }

  // Get current queue status
  getStatus() {
    return {
      pending: this.pendingWrites.length,
      processing: this.isProcessing,
      oldestOperation: this.pendingWrites.length > 0 ? 
        Date.now() - this.pendingWrites[0].timestamp : 0
    };
  }
}

// Singleton instance
export const batchManager = new FirebaseBatchManager();

// Clean up cache periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const maxAge = 60000; // 1 minute
  
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > maxAge) {
      queryCache.delete(key);
    }
  }
  
  for (const [key, value] of activeListeners.entries()) {
    if (now - value.timestamp > maxAge) {
      activeListeners.delete(key);
    }
  }
}, 30000); // Clean every 30 seconds

// Emergency cache clear function
export function clearFirebaseCache() {
  queryCache.clear();
  activeListeners.clear();
  console.log('🧹 Firebase cache cleared');
}
