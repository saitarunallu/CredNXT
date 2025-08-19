import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  connectionType?: string;
  isSlowConnection: boolean;
}

/**
 * Displays and manages performance metrics of the application in a development environment.
 * @example
 * PerformanceMonitor()
 * null // Only renders in development mode, otherwise returns null.
 * @returns {JSX.Element | null} Returns a JSX element displaying performance metrics if in development mode and visible; otherwise null.
 */
export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development mode
    if (import.meta.env.MODE !== 'development') return;

    /**
     * Capture and set performance metrics such as load time, render time, and memory usage.
     * @example
     * performanceMonitor()
     * // Sets metrics like loadTime, renderTime, etc.
     * @returns {void} No return value; sets metrics in a global state.
     */
    const measurePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const connection = (navigator as any).connection;
      
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      const renderTime = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      
      let memoryUsage: number | undefined;
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        memoryUsage = memory.usedJSHeapSize / 1048576; // Convert to MB
      }

      const connectionType = connection?.effectiveType || 'unknown';
      const isSlowConnection = connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';

      setMetrics({
        loadTime,
        renderTime,
        memoryUsage,
        connectionType,
        isSlowConnection
      });
    };

    // Measure after page load
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
    }

    // Keyboard shortcut to toggle visibility
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('load', measurePerformance);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (!metrics || !isVisible || import.meta.env.MODE !== 'development') {
    return null;
  }

  const getPerformanceColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'bg-green-100 text-green-800';
    if (value < thresholds[1]) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm" data-testid="performance-monitor">
      <Card className="shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Performance Metrics</CardTitle>
            <button
              onClick={() => setIsVisible(false)}
              className="text-muted-foreground hover:text-foreground"
              data-testid="close-performance-monitor"
            >
              ×
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Load Time:</span>
            <Badge 
              variant="outline" 
              className={getPerformanceColor(metrics.loadTime, [1000, 3000])}
            >
              {metrics.loadTime.toFixed(0)}ms
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Render Time:</span>
            <Badge 
              variant="outline"
              className={getPerformanceColor(metrics.renderTime, [500, 1500])}
            >
              {metrics.renderTime.toFixed(0)}ms
            </Badge>
          </div>

          {metrics.memoryUsage && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Memory:</span>
              <Badge 
                variant="outline"
                className={getPerformanceColor(metrics.memoryUsage, [50, 100])}
              >
                {metrics.memoryUsage.toFixed(1)}MB
              </Badge>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Connection:</span>
            <Badge 
              variant="outline"
              className={metrics.isSlowConnection ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
            >
              {metrics.connectionType}
            </Badge>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Shift+P to toggle
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};