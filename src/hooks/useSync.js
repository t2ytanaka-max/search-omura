import { useEffect, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAllLogs, deleteLogsUntil } from '../lib/idb';
import { generateBuffer } from '../lib/geoUtils';

const SYNC_INTERVAL = 30 * 1000; // 30 seconds for testing

export const useSync = (isTracking, userId, userName, trackId) => {
  const syncTimerRef = useRef(null);

  const syncData = async (force = false) => {
    if (!userId || !trackId) return;

    try {
      const logs = await getAllLogs();
      if (logs.length < 2) return;

      const lastTimestamp = logs[logs.length - 1].timestamp;
      const bufferGeoJSON = generateBuffer(logs);

      if (!bufferGeoJSON) return;

      // 1. Update user's last known location and status
      await setDoc(doc(db, 'users', userId), {
        name: userName,
        lastLocation: { lat: logs[logs.length-1].lat, lng: logs[logs.length-1].lng },
        lastSync: serverTimestamp(),
        isTracking: isTracking
      }, { merge: true });

      // 2. Upload search log batch
      const logId = `${trackId}_${Math.floor(lastTimestamp / SYNC_INTERVAL)}`;
      await setDoc(doc(db, 'search_logs', logId), {
        userId,
        trackId,
        userName,
        startTime: logs[0].timestamp,
        endTime: lastTimestamp,
        buffer: JSON.stringify(bufferGeoJSON),
        pointsCount: logs.length,
        timestamp: serverTimestamp()
      });

      // 3. Clear synced logs from IndexedDB
      await deleteLogsUntil(lastTimestamp);
      console.log(`Synced ${logs.length} points.`);
    } catch (error) {
      console.error("Sync error:", error);
    }
  };

  useEffect(() => {
    if (isTracking) {
      // Start periodic sync
      syncTimerRef.current = setInterval(() => {
        syncData();
      }, SYNC_INTERVAL);
    } else {
      // Stop periodic sync and do one last force sync
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
        syncData(true);
      }
    }

    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [isTracking, userId, trackId]);

  return { syncData };
};
