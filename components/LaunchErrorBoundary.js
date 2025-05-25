// components/LaunchErrorBoundary.js - Robust Error Handling for Launch Day
import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

// Error fallback UI component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200 p-6">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">🌱</div>
          <h2 className="text-2xl font-bold text-purple-700 mb-4">
            Oops! Something went wrong
          </h2>
          
          <p className="text-gray-600 mb-6">
            Don't worry - your garden is safe! We're experiencing high traffic due to Sharon's song launch.
          </p>

          <div className="space-y-3">
            <Button
              onClick={resetErrorBoundary}
              className="w-full"
            >
              🔄 Try Again
            </Button>
            
            <Button
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              🏠 Go to Home
            </Button>
          </div>

          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-red-600">
                Error Details (Dev Only)
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                {error?.toString()}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main Error Boundary Class
export class LaunchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to monitoring service
    this.logErrorToService(error, errorInfo);
    
    // Update state
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // If too many errors, suggest maintenance mode
    if (this.state.errorCount > 5) {
      console.error('🚨 Multiple errors detected - possible system issue');
    }
  }

  logErrorToService = (error, errorInfo) => {
    const errorData = {
      message: error.toString(),
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorBoundary: 'LaunchErrorBoundary'
    };

    // Log locally
    console.error('🚨 Error caught by boundary:', errorData);

    // Send to monitoring service (replace with your service)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.toString(),
        fatal: true
      });
    }

    // Store in localStorage for debugging
    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push(errorData);
      // Keep only last 10 errors
      if (errors.length > 10) errors.shift();
      localStorage.setItem('app_errors', JSON.stringify(errors));
    } catch (e) {
      console.error('Failed to store error:', e);
    }
  };

  resetErrorBoundary = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

// Performance Monitor Component
export function PerformanceMonitor({ children }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Monitor page performance
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // Log slow operations
        if (entry.duration > 3000) {
          console.warn(`⚠️ Slow operation detected: ${entry.name} took ${entry.duration}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });

    // Monitor memory usage
    const memoryInterval = setInterval(() => {
      if (performance.memory) {
        const usedMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        const limitMB = Math.round(performance.memory.jsHeapSizeLimit / 1048576);
        
        if (usedMB > limitMB * 0.9) {
          console.warn(`⚠️ High memory usage: ${usedMB}MB / ${limitMB}MB`);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      observer.disconnect();
      clearInterval(memoryInterval);
    };
  }, []);

  return children;
}

// Offline Support Component
export function OfflineSupport({ children }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('✅ Back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📡 Offline detected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-100 to-purple-200 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">📡</div>
            <h2 className="text-2xl font-bold text-purple-700 mb-4">
              You're Offline
            </h2>
            <p className="text-gray-600 mb-6">
              Please check your internet connection to continue growing your garden.
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              🔄 Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return children;
}

// Launch Day Status Component
export function LaunchDayStatus() {
  const [metrics, setMetrics] = useState(null);
  const [showMetrics, setShowMetrics] = useState(false);

  useEffect(() => {
    // Only show in development or for admins
    if (process.env.NODE_ENV === 'development') {
      setShowMetrics(true);
    }
  }, []);

  useEffect(() => {
    if (!showMetrics) return;

    const updateMetrics = async () => {
      try {
        const { wateringManager } = await import('../utils/WateringManager');
        const metrics = wateringManager.getMetrics();
        setMetrics(metrics);
      } catch (err) {
        console.error('Failed to get metrics:', err);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, [showMetrics]);

  if (!showMetrics || !metrics) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 text-xs max-w-xs">
      <h3 className="font-bold text-purple-700 mb-2">🚀 System Status</h3>
      <div className="space-y-1">
        <div>Queue: {metrics.queueLength}</div>
        <div>Success Rate: {metrics.successRate}</div>
        <div>Avg Response: {Math.round(metrics.averageResponseTime)}ms</div>
        <div>Peak Concurrent: {metrics.peakConcurrent}</div>
      </div>
    </div>
  );
}

// Hook for error reporting
export function useErrorHandler() {
  const logError = (error, context = {}) => {
    const errorData = {
      message: error.message || error.toString(),
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      url: window.location.href
    };

    console.error('Error logged:', errorData);

    // Send to monitoring
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: errorData.message,
        fatal: false,
        error_context: JSON.stringify(context)
      });
    }
  };

  return { logError };
}
