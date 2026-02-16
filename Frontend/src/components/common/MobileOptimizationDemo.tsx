// Mobile optimization demo component

import React, { useState } from 'react';
import {
  MobileOptimized,
  TouchFriendlyCard,
  LoadingSpinner,
  VirtualizedList
} from '../common';
import { Button } from '../ui/Button';
import { useScreenOrientation, usePerformanceMonitoring, useTouchGestures } from '../../hooks';

export const MobileOptimizationDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<string>('');
  const [gestureCount, setGestureCount] = useState(0);

  const { orientation, isPortrait, isLandscape, angle } = useScreenOrientation();
  const { metrics, isSlowConnection, shouldOptimizeForPerformance } = usePerformanceMonitoring({
    trackRender: true,
    trackMemory: true,
    trackNetwork: true,
  });

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sample data for virtualized list
  const virtualizedItems = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i + 1}`,
    description: `Description for item ${i + 1}`,
  }));

  const handleSwipe = (direction: string) => {
    setSwipeDirection(direction);
    setGestureCount(prev => prev + 1);
    setTimeout(() => setSwipeDirection(''), 2000);
  };

  useTouchGestures(containerRef as React.RefObject<HTMLElement>, {
    onSwipeLeft: () => handleSwipe('left'),
    onSwipeRight: () => handleSwipe('right'),
    onSwipeUp: () => handleSwipe('up'),
    onSwipeDown: () => handleSwipe('down'),
    threshold: 50,
  });

  const renderVirtualItem = (item: any) => (
    <TouchFriendlyCard
      key={item.id}
      className="p-4 m-1"
      onClick={() => console.log(`Clicked item ${item.id}`)}
      variant="interactive"
    >
      <h4 className="font-medium">{item.name}</h4>
      <p className="text-sm text-gray-600">{item.description}</p>
    </TouchFriendlyCard>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="responsive-heading font-bold text-gray-900 mb-4">
          Mobile Optimization Demo
        </h1>
        <p className="responsive-text text-gray-600 mb-6">
          Test all mobile optimization features implemented in the app
        </p>
      </div>

      {/* Device Information */}
      <TouchFriendlyCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">Device Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Orientation:</strong> {orientation} ({angle}°)
          </div>
          <div>
            <strong>Portrait:</strong> {isPortrait ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Landscape:</strong> {isLandscape ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Online:</strong> {metrics.isOnline ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Connection:</strong> {metrics.connectionSpeed || 'Unknown'}
          </div>
          <div>
            <strong>Slow Connection:</strong> {isSlowConnection ? 'Yes' : 'No'}
          </div>
          {metrics.memoryUsage && (
            <div>
              <strong>Memory Usage:</strong> {metrics.memoryUsage.toFixed(1)} MB
            </div>
          )}
          <div>
            <strong>Render Time:</strong> {metrics.renderTime.toFixed(2)}ms
          </div>
        </div>
      </TouchFriendlyCard>

      {/* Touch Gestures Demo */}
      <MobileOptimized
        enableSwipeGestures={true}
        onSwipeLeft={() => handleSwipe('left')}
        onSwipeRight={() => handleSwipe('right')}
        onSwipeUp={() => handleSwipe('up')}
        onSwipeDown={() => handleSwipe('down')}
      >
        <TouchFriendlyCard className="p-6 bg-gradient-to-r from-primary-50 to-purple-50">
          <h2 className="text-xl font-semibold mb-4">Touch Gestures Test</h2>
          <p className="text-gray-600 mb-4">
            Swipe in any direction on this card to test gesture recognition
          </p>

          {swipeDirection && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
              <strong>Detected swipe:</strong> {swipeDirection}
            </div>
          )}

          <div className="text-sm text-gray-500">
            Total gestures detected: {gestureCount}
          </div>
        </TouchFriendlyCard>
      </MobileOptimized>

      {/* Touch-Friendly Buttons */}
      <TouchFriendlyCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">Touch-Friendly Controls</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button size="sm" className="min-touch-target">
              Small Button
            </Button>
            <Button size="md" className="min-touch-target">
              Medium Button
            </Button>
            <Button size="lg" className="large-touch-target">
              Large Button
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button variant="primary" size="md" className="min-touch-target">
              Primary
            </Button>
            <Button variant="secondary" size="md" className="min-touch-target">
              Secondary
            </Button>
            <Button variant="outline" size="md" className="min-touch-target">
              Outline
            </Button>
            <Button variant="ghost" size="md" className="min-touch-target">
              Ghost
            </Button>
          </div>
        </div>
      </TouchFriendlyCard>

      {/* Performance Optimizations */}
      <TouchFriendlyCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">Performance Features</h2>

        <div className="space-y-4">
          <Button
            onClick={() => setActiveDemo(activeDemo === 'virtualized' ? null : 'virtualized')}
            className="min-touch-target"
          >
            {activeDemo === 'virtualized' ? 'Hide' : 'Show'} Virtualized List Demo
          </Button>

          {activeDemo === 'virtualized' && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Virtualized List (1000 items)</h3>
              <p className="text-sm text-gray-600 mb-4">
                Only visible items are rendered for optimal performance
              </p>
              <div className="h-64 border rounded">
                <VirtualizedList
                  items={virtualizedItems}
                  itemHeight={80}
                  containerHeight={256}
                  renderItem={renderVirtualItem}
                  overscan={5}
                />
              </div>
            </div>
          )}

          {shouldOptimizeForPerformance && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <strong>Performance Mode Active:</strong> Optimizations enabled for slow connection
            </div>
          )}
        </div>
      </TouchFriendlyCard>

      {/* Responsive Design Demo */}
      <MobileOptimized
        adaptToOrientation={true}
        className="space-y-4"
      >
        <TouchFriendlyCard className="p-6">
          <h2 className="text-xl font-semibold mb-4">Responsive Design</h2>

          <div className="mobile-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-primary-100 p-4 rounded-lg text-center">
              <h3 className="responsive-text font-medium">Card 1</h3>
              <p className="text-sm text-gray-600">Responsive spacing</p>
            </div>
            <div className="bg-green-100 p-4 rounded-lg text-center">
              <h3 className="responsive-text font-medium">Card 2</h3>
              <p className="text-sm text-gray-600">Adaptive layout</p>
            </div>
            <div className="bg-purple-100 p-4 rounded-lg text-center sm:col-span-2 lg:col-span-1">
              <h3 className="responsive-text font-medium">Card 3</h3>
              <p className="text-sm text-gray-600">Orientation aware</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="portrait-hidden">
              <strong>Landscape mode content:</strong> This text only shows in landscape
            </div>
            <div className="landscape-hidden">
              <strong>Portrait mode content:</strong> This text only shows in portrait
            </div>
          </div>
        </TouchFriendlyCard>
      </MobileOptimized>

      {/* Loading States */}
      <TouchFriendlyCard className="p-6">
        <h2 className="text-xl font-semibold mb-4">Loading States</h2>
        <div className="flex items-center space-x-4">
          <LoadingSpinner size="sm" />
          <LoadingSpinner size="md" />
          <LoadingSpinner size="lg" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="mobile-skeleton h-4 bg-gray-200 rounded"></div>
          <div className="mobile-skeleton h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="mobile-skeleton h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </TouchFriendlyCard>
    </div>
  );
};
