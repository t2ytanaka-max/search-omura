import { useState, useEffect, useRef } from 'react';
import { saveLog } from '../lib/idb';

export const useTracking = (isTracking, trackId) => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (isTracking && trackId) {
      // Start tracking
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const log = {
            lat: latitude,
            lng: longitude,
            accuracy: accuracy,
            timestamp: Date.now(),
            trackId: trackId
          };
          
          setCurrentPosition(log);
          saveLog(log); // Save to IndexedDB
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000, // 10秒前のデータまで許容
          timeout: 15000 // タイムアウトを15秒に延長
        }
      );
    } else {
      // Stop tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isTracking, trackId]);

  return currentPosition;
};
