// utils/LaunchMonitoring.js
class LaunchMonitoring {
  constructor() {
    this.errors = [];
    this.metrics = {
      pageLoads: 0,
      seedsPlanted: 0,
      wateringActions: 0,
      shareActions: 0,
      errors: 0
    };
    this.startTime = Date.now();
  }

  // Track user actions for analytics
  trackAction(action, metadata = {}) {
    this.metrics[action] = (this.metrics[action] || 0) + 1;
    
    // Send to analytics service (replace with your analytics)
    if (typeof gtag !== 'undefined') {
      gtag('event', action, {
        custom_parameter: metadata,
        app_name: 'SharonsGarden'
      });
    }

    console.log(`📊 Action tracked: ${action}`, metadata);
  }

  // Error boundary integration
  captureError(error, errorInfo = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: auth.currentUser?.uid || 'anonymous',
      ...errorInfo
    };

    this.errors.push(errorData);
    this.metrics.errors++;

    // Log to console for debugging
    console.error('🚨 Error captured:', errorData);

    // Send to error tracking service
    this.sendErrorToService(errorData);

    return errorData;
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

  // Performance monitoring
  measurePerformance(operationName, operation) {
    const startTime = performance.now();
    
    return new Promise(async (resolve, reject) => {
      try {
        const result = await operation();
        const duration = performance.now() - startTime;
        
        console.log(`⚡ ${operationName}: ${duration.toFixed(2)}ms`);
        
        // Track slow operations
        if (duration > 3000) {
          this.captureError(new Error(`Slow operation: ${operationName}`), {
            duration,
            type: 'performance'
          });
        }
        
        resolve(result);
      } catch (error) {
        const duration = performance.now() - startTime;
        this.captureError(error, { operationName, duration });
        reject(error);
      }
    });
  }

  // Health check for critical systems
  async runHealthCheck() {
    const checks = {
      firebase: false,
      localStorage: false,
      imageGeneration: false
    };

    try {
      // Test Firebase connection
      const testDoc = await getDoc(doc(db, 'health', 'test'));
      checks.firebase = true;
    } catch (err) {
      this.captureError(err, { system: 'firebase' });
    }

    try {
      // Test localStorage
      localStorage.setItem('healthCheck', 'test');
      localStorage.removeItem('healthCheck');
      checks.localStorage = true;
    } catch (err) {
      this.captureError(err, { system: 'localStorage' });
    }

    try {
      // Test image generation
      const canvas = document.createElement('canvas');
      canvas.toDataURL();
      checks.imageGeneration = true;
    } catch (err) {
      this.captureError(err, { system: 'imageGeneration' });
    }

    return checks;
  }

  // Generate launch report
  generateReport() {
    const uptime = Date.now() - this.startTime;
    const uptimeMinutes = Math.floor(uptime / 60000);

    return {
      uptime: uptimeMinutes,
      metrics: this.metrics,
      errorCount: this.errors.length,
      recentErrors: this.errors.slice(-10),
      timestamp: new Date().toISOString()
    };
  }
}

export const launchMonitor = new LaunchMonitoring();

// React Error Boundary component
export class LaunchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    launchMonitor.captureError(error, {
      componentStack: errorInfo.componentStack,
      type: 'react_error_boundary'
    });
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

// Hook for components to report actions
export function useAnalytics() {
  const trackSeedPlanted = (seedType) => {
    launchMonitor.trackAction('seedsPlanted', { seedType });
  };

  const trackWatering = (seedId, userId) => {
    launchMonitor.trackAction('wateringActions', { seedId, userId });
  };

  const trackShare = (platform, flowerId) => {
    launchMonitor.trackAction('shareActions', { platform, flowerId });
  };

  const trackError = (error, context) => {
    launchMonitor.captureError(error, context);
  };

  return {
    trackSeedPlanted,
    trackWatering, 
    trackShare,
    trackError
  };
}
