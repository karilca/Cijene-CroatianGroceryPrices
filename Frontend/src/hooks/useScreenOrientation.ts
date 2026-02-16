import { useState, useEffect } from 'react';

type OrientationType = 'portrait-primary' | 'portrait-secondary' | 'landscape-primary' | 'landscape-secondary';

interface ScreenOrientationState {
  orientation: OrientationType | null;
  isPortrait: boolean;
  isLandscape: boolean;
  angle: number;
}

export function useScreenOrientation(): ScreenOrientationState {
  const [orientationState, setOrientationState] = useState<ScreenOrientationState>({
    orientation: null,
    isPortrait: true,
    isLandscape: false,
    angle: 0,
  });

  useEffect(() => {
    const updateOrientation = () => {
      if (screen.orientation) {
        const orientation = screen.orientation.type as OrientationType;
        const angle = screen.orientation.angle;
        const isPortrait = orientation.includes('portrait');
        const isLandscape = orientation.includes('landscape');

        setOrientationState({
          orientation,
          isPortrait,
          isLandscape,
          angle,
        });
      } else {
        // Fallback for browsers without screen.orientation API
        const isPortrait = window.innerHeight > window.innerWidth;
        setOrientationState({
          orientation: isPortrait ? 'portrait-primary' : 'landscape-primary',
          isPortrait,
          isLandscape: !isPortrait,
          angle: isPortrait ? 0 : 90,
        });
      }
    };

    // Initial check
    updateOrientation();

    // Listen for orientation changes
    if (screen.orientation) {
      screen.orientation.addEventListener('change', updateOrientation);
    } else {
      // Fallback for older browsers
      window.addEventListener('orientationchange', updateOrientation);
      window.addEventListener('resize', updateOrientation);
    }

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', updateOrientation);
      } else {
        window.removeEventListener('orientationchange', updateOrientation);
        window.removeEventListener('resize', updateOrientation);
      }
    };
  }, []);

  return orientationState;
}
