// hooks/useOptimizedFirebase.js
import { useState, useEffect, useRef } from 'react';
import { onSnapshot, doc, collection, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Singleton pattern to prevent duplicate listeners
const activeListeners = new Map();

export function useOptimizedSnapshot(queryKey, firestoreQuery, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const unsubscribeRef = useRef(null);
  
  // Cache duration - prevent unnecessary re-fetches
  const { cacheDuration = 30000 } = options;
  const lastFetchRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    
    // Check if we have recent cached data
    if (now - lastFetchRef.current < cacheDuration && data) {
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
    
    const unsubscribe = onSnapshot(
      firestoreQuery,
      (snapshot) => {
        const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setData(result);
        setLoading(false);
        lastFetchRef.current = now;
        
        // Update shared cache
        activeListeners.set(queryKey, { data: result, timestamp: now });
      },
      (err) => {
        setError(err);
        setLoading(false);
        console.error(`Firebase error for ${queryKey}:`, err);
      }
    );

    unsubscribeRef.current = unsubscribe;

    // Cleanup after cache expires
    const cleanupTimer = setTimeout(() => {
      activeListeners.delete(queryKey);
    }, cacheDuration);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      clearTimeout(cleanupTimer);
    };
  }, [queryKey, cacheDuration]);

  return { data, loading, error };
}

// Batched write operations to prevent Firebase quota hits
export class FirebaseBatchManager {
  constructor(maxBatchSize = 500) {
    this.pendingWrites = [];
    this.maxBatchSize = maxBatchSize;
    this.flushTimer = null;
  }

  addWrite(operation) {
    this.pendingWrites.push(operation);
    
    if (this.pendingWrites.length >= this.maxBatchSize) {
      this.flush();
    } else {
      // Auto-flush after 2 seconds
      clearTimeout(this.flushTimer);
      this.flushTimer = setTimeout(() => this.flush(), 2000);
    }
  }

  async flush() {
    if (this.pendingWrites.length === 0) return;
    
    const batch = writeBatch(db);
    const operations = this.pendingWrites.splice(0, this.maxBatchSize);
    
    operations.forEach(op => {
      if (op.type === 'set') {
        batch.set(op.ref, op.data);
      } else if (op.type === 'update') {
        batch.update(op.ref, op.data);
      }
    });

    try {
      await batch.commit();
      console.log(`✅ Batched ${operations.length} operations`);
    } catch (error) {
      console.error('❌ Batch write failed:', error);
      // Re-add failed operations to retry queue
      this.pendingWrites.unshift(...operations);
    }
  }
}

export const batchManager = new FirebaseBatchManager();
