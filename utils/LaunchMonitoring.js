// utils/LaunchMonitoring.js
import React from 'react';
import { auth } from '../lib/firebase';

class LaunchMonitoring {
  constructor() {
    this.errors = [];
    this.metrics = {
      pageLoads: 0,
      seedsPlanted: 0,
      wateringActions: 0,
      shareActions: 0,
      errors: 0,
      userSessions: new Set(),
      performanceIssues: 0
    };
    this.startTime = Date.now();
    this.performanceThresholds = {
      slowOperation: 3000,
      verySlowOperation: 8000,
      memoryWarning: 100 // MB
    };
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  // Track user actions for analytics and debugging
  trackAction(action, metadata = {}) {
    this.metrics[action] = (this.metrics[action] || 0) + 1;
    
    // Track unique users
    const userId = auth.currentUser?.uid || 'anonymous';
    this.metrics.userSessions.add(userId);
    
    const actionData = {
      action,
      metadata,
      timestamp: new Date().toISOString(),
      userId,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    // Send to analytics (replace with your service)
    if (typeof gtag !== 'undefined') {
      gtag('event', action, {
        custom_parameter: metadata,
        app_name: 'SharonsGarden',
        user_id: userId
      });
    }

    console.log(`📊 Action tracked: ${action}`, metadata);
    
    // Store locally for batch sending
    this.storeActionLocally(actionData);
  }

  // Enhanced error capture with context
  captureError(error, errorInfo = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: auth.currentUser?.uid || 'anonymous',
      sessionDuration: Date.now() - this.startTime,
      memoryUsage: this.getMemoryUsage(),
      ...errorInfo
    };

    this.errors.push(errorData);
    this.metrics.errors++;

    // Log different severity levels
    if (errorInfo.severity === 'critical') {
      console.error('🚨 CRITICAL ERROR:', errorData);
    } else {
      console.error('⚠️ Error captured:', errorData);
    }

    // Send to error tracking service
    this.sendErrorToService(errorData);

    // Auto-recovery for common issues
    this.attemptAutoRecovery(error, errorInfo);

    return errorData;
  }

  // Performance monitoring with automatic issue detection
  measurePerformance(operationName, operation) {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    return new Promise(async (resolve, reject) => {
      try {
        const result = await operation();
        const duration = performance.now() - startTime;
        const memoryDelta = this.getMemoryUsage() - startMemory;
        
        const perfData = {
          operation: operationName,
          duration: Math.round(duration),
          memoryDelta: Math.round(memoryDelta)
        };

        console.log(`⚡ ${operationName}: ${perfData.duration}ms, Memory: ${perfData.memoryDelta}MB`);
        
        // Track performance issues
        if (duration > this.performanceThresholds.slowOperation) {
          this.metrics.performanceIssues++;
          this.captureError(new Error(`Slow operation: ${operationName}`), {
            type: 'performance',
            duration,
            severity: duration > this.performanceThresholds.verySlowOperation ? 'critical' : 'warning'
          });
        }
        
        // Track memory leaks
        if (memoryDelta > this.performanceThresholds.memoryWarning) {
          this.captureError(new Error(`Memory spike: ${operationName}`), {
            type: 'memory',
            memoryDelta,
            severity: 'warning'
          });
        }
        
        resolve(result);
      } catch (error) {
        const duration = performance.now() - startTime;
        this.captureError(error, { 
          operationName, 
          duration,
          type: 'operation_failure',
          severity: 'error'
        });
        reject(error);
      }
    });
  }

  // Comprehensive health check
  async runHealthCheck() {
    const checks = {
      firebase: { status: false, latency: 0, error: null },
      localStorage: { status: false, error: null },
      imageGeneration: { status: false, error: null },
      network: { status: false, latency: 0, error: null },
      memory: { status: false, usage: 0, error: null }
    };

    try {
      // Test Firebase connection with latency
      const firebaseStart = performance.now();
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      await getDoc(doc(db, 'health', 'test'));
      checks.firebase.status = true;
      checks.firebase.latency = Math.round(performance.now() - firebaseStart);
    } catch (err) {
      checks.firebase.error = err.message;
      this.captureError(err, { system: 'firebase', severity: 'critical' });
    }

    try {
      // Test localStorage
      const testKey = 'healthCheck_' + Date.now();
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      checks.localStorage.status = true;
    } catch (err) {
      checks.localStorage.error = err.message;
      this.captureError(err, { system: 'localStorage', severity: 'warning' });
    }

    try {
      // Test image generation
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.fillRect(0, 0, 100, 100);
      canvas.toDataURL();
      checks.imageGeneration.status = true;
    } catch (err) {
      checks.imageGeneration.error = err.message;
      this.captureError(err, { system: 'imageGeneration', severity: 'error' });
    }

    try {
      // Test network connectivity
      const networkStart = performance.now();
      await fetch('/api/health', { method: 'HEAD' }).catch(() => {
        // Fallback to external service
        return fetch('https://www.google.com/favicon.ico', { method: 'HEAD', mode: 'no-cors' });
      });
      checks.network.status = true;
      checks.network.latency = Math.round(performance.now() - networkStart);
    } catch (err) {
      checks.network.error = err.message;
    }

    // Memory check
    const memoryUsage = this.getMemoryUsage();
    checks.memory.usage = memoryUsage;
    checks.memory.status = memoryUsage < 500; // Under 500MB is good

    return checks;
  }

  // Auto-recovery mechanisms
  attemptAutoRecovery(error, errorInfo) {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      console.log('🔄 Attempting network recovery...');
      // Could implement retry logic here
    }
    
    if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
      console.log('🔄 Quota exceeded, switching to local storage...');
      // Could implement fallback to localStorage
    }
    
    if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      console.log('🔄 Memory issue detected, clearing caches...');
      this.clearCaches();
    }
  }

  // Performance monitoring setup
  startPerformanceMonitoring() {
    // Monitor page load performance
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            this.trackAction('pageLoads', {
              loadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
              domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart)
            });
          }
        }, 0);
      });

      // Monitor memory usage periodically
      setInterval(() => {
        const memoryUsage = this.getMemoryUsage();
        if (memoryUsage > 200) { // Over 200MB
          console.warn(`💾 High memory usage: ${memoryUsage}MB`);
        }
      }, 30000); // Check every 30 seconds
    }
  }

  // Utility functions
  getMemoryUsage() {
    if (performance.memory) {
      return Math.round(performance.memory.usedJSHeapSize / 1048576); // Convert to MB
    }
    return 0;
  }

  storeActionLocally(actionData) {
    try {
      const stored = JSON.parse(localStorage.getItem('analytics_queue') || '[]');
      stored.push(actionData);
      
      // Keep only last 100 actions to prevent localStorage bloat
      if (stored.length > 100) {
        stored.splice(0, stored.length - 100);
      }
      
      localStorage.setItem('analytics_queue', JSON.stringify(stored));
    } catch (err) {
      console.warn('Failed to store analytics locally:', err);
    }
  }

  clearCaches() {
    try {
      // Clear various caches
      if (typeof caches !== 'undefined') {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
      
      // Clear local analytics queue
      localStorage.removeItem('analytics_queue');
      
      console.log('🧹 Caches cleared for memory recovery');
    } catch (err) {
      console.warn('Cache clearing failed:', err);
    }
  }

  async sendErrorToService(errorData) {
    try {
      // Replace with your error tracking service (Sentry, LogRocket, etc.)
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      });
    } catch (err) {
      console.warn('Failed to send error to tracking service:', err);
    }
  }

  // Generate launch report
  generateReport() {
    const uptime = Date.now() - this.startTime;
    const uptimeMinutes = Math.floor(uptime / 60000);

    return {
      uptime: uptimeMinutes,
      metrics: {
        ...this.metrics,
        userSessions: this.metrics.userSessions.size
      },
      errorCount: this.errors.length,
      recentErrors: this.errors.slice(-10),
      performanceStatus: {
        averageMemory: this.getMemoryUsage(),
        performanceIssues: this.metrics.performanceIssues
      },
      timestamp: new Date().toISOString()
    };
  }
}

export const launchMonitor = new LaunchMonitoring();

// React Error Boundary component
export class LaunchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    launchMonitor.captureError(error, {
      componentStack: errorInfo.componentStack,
      type: 'react_error_boundary',
      severity: 'critical'
    });
    
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200 p-6">
          <div className="bg-white rounded-xl p-8 max-w-md text-center shadow-xl">
            <div className="text-6xl mb-4">🌱</div>
            <h2 className="text-2xl font-bold text-purple-700 mb-4">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              Don't worry - your garden is safe! We're working to fix this issue.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="text-left mb-4 text-xs">
                <summary className="cursor-pointer text-red-600 mb-2">
                  Error Details (Development)
                </summary>
                <pre className="bg-gray-100 p-2 rounded overflow-auto">
                  {this.state.error?.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 text-white py-2 px-6 rounded hover:bg-purple-700"
            >
              🔄 Refresh Garden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for components to report actions and errors
export function useAnalytics() {
  const trackSeedPlanted = (seedType, metadata = {}) => {
    launchMonitor.trackAction('seedsPlanted', { seedType, ...metadata });
  };

  const trackWatering = (seedId, userId, metadata = {}) => {
    launchMonitor.trackAction('wateringActions', { seedId, userId, ...metadata });
  };

  const trackShare = (platform, flowerId, metadata = {}) => {
    launchMonitor.trackAction('shareActions', { platform, flowerId, ...metadata });
  };

  const trackError = (error, context = {}) => {
    launchMonitor.captureError(error, context);
  };

  const measurePerformance = (operationName, operation) => {
    return launchMonitor.measurePerformance(operationName, operation);
  };

  return {
    trackSeedPlanted,
    trackWatering, 
    trackShare,
    trackError,
    measurePerformance
  };
}
