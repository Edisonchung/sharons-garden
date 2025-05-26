// utils/monitoring/PerformanceMonitor.js
export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      operations: [],
      errors: [],
      slowQueries: []
    };
    this.thresholds = {
      slowQuery: 3000, // 3 seconds
      errorRate: 0.05  // 5%
    };
  }

  async measureOperation(name, operation) {
    const start = performance.now();
    const startMemory = performance.memory?.usedJSHeapSize;
    
    try {
      const result = await operation();
      const duration = performance.now() - start;
      const memoryUsed = performance.memory?.usedJSHeapSize - startMemory;
      
      const metric = {
        name,
        duration,
        memoryUsed,
        timestamp: new Date().toISOString(),
        success: true
      };

      this.metrics.operations.push(metric);
      
      // Check for slow operations
      if (duration > this.thresholds.slowQuery) {
        this.metrics.slowQueries.push(metric);
        console.warn(`Slow operation detected: ${name} took ${duration}ms`);
      }

      // Clean old metrics (keep last 1000)
      if (this.metrics.operations.length > 1000) {
        this.metrics.operations = this.metrics.operations.slice(-1000);
      }

      return result;
    } catch (error) {
      this.metrics.errors.push({
        name,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  getMetrics() {
    const totalOps = this.metrics.operations.length;
    const errors = this.metrics.errors.length;
    const errorRate = totalOps > 0 ? errors / totalOps : 0;
    
    const avgDuration = this.metrics.operations.length > 0
      ? this.metrics.operations.reduce((sum, op) => sum + op.duration, 0) / totalOps
      : 0;

    return {
      totalOperations: totalOps,
      errorCount: errors,
      errorRate: (errorRate * 100).toFixed(2) + '%',
      averageOperationTime: avgDuration.toFixed(2) + 'ms',
      slowQueries: this.metrics.slowQueries.length,
      lastError: this.metrics.errors[this.metrics.errors.length - 1]
    };
  }

  reset() {
    this.metrics = {
      operations: [],
      errors: [],
      slowQueries: []
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
