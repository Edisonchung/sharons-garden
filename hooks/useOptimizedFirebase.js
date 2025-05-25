// hooks/useOptimizedFirebase.js - SIMPLE SAFE VERSION
import { useState, useEffect, useRef } from 'react';
import { onSnapshot } from 'firebase/firestore';

// Simple cache to prevent duplicate Firebase listeners
const queryCache = new Map();

export function useOptimizedSnapshot(queryKey, firestoreQuery, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const unsubscribeRef = useRef(null);
  
  const { cacheDuration = 10000 } = options; // 10 seconds cache
  const lastFetchRef = useRef(0);

  useEffect(() => {
    if (!firestoreQuery) {
      setLoading(false);
      return;
    }

    const now = Date.now();
    
    // Check cache first to prevent unnecessary Firebase reads
    const cachedData = queryCache.get(queryKey);
    if (cachedData && (now - cachedData.timestamp) < cacheDuration) {
      setData(cachedData.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const unsubscribe = onSnapshot(firestoreQuery, (snapshot) => {
      const result = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      setData(result);
      setLoading(false);
      lastFetchRef.current = now;
      
      // Update cache
      queryCache.set(queryKey, { data: result, timestamp: now });
      
      console.log(`📊 Firebase query: ${queryKey} (${result.length} docs)`);
    });

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [queryKey, firestoreQuery, cacheDuration]);

  return { data, loading };
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 60000; // 1 minute
  
  for (const [key, value] of queryCache.entries()) {
    if (now - value.timestamp > maxAge) {
      queryCache.delete(key);
    }
  }
}, 30000);
