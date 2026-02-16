// Offline status indicator component

import React from 'react';
import { useNetworkStatus } from '../../utils/errorHandling';
import { useNotifications } from './NotificationSystem';
import { useEffect, useRef } from 'react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useNetworkStatus();
  const { notifyWarning, notifySuccess } = useNotifications();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!isOnline && !wasOffline.current) {
      // Just went offline
      wasOffline.current = true;
      notifyWarning(
        'You are currently offline. Some features may not be available.',
        'No Internet Connection',
      );
    } else if (isOnline && wasOffline.current) {
      // Just came back online
      wasOffline.current = false;
      notifySuccess(
        'Connection restored. All features are now available.',
        'Back Online'
      );
    }
  }, [isOnline, notifyWarning, notifySuccess]);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center z-50">
      <div className="flex items-center justify-center gap-2">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="font-medium">You are offline</span>
        <span className="text-yellow-100">• Some features may be limited</span>
      </div>
    </div>
  );
};
