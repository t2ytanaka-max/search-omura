import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Map({ currentPosition, showAllTracks = true }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef({});

  useEffect(() => {
    if (map.current) return; // Initialize only once

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [129.95, 32.91], // Default to Omura City area
      zoom: 13
    });

    map.current.on('load', () => {
      // Source for searched areas (polygons)
      map.current.addSource('searched-areas', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: 'searched-areas-fill',
        type: 'fill',
        source: 'searched-areas',
        paint: {
          'fill-color': '#ff3131',
          'fill-opacity': 0.3
        }
      });

      map.current.addLayer({
        id: 'searched-areas-outline',
        type: 'line',
        source: 'searched-areas',
        paint: {
          'line-color': '#ed1515',
          'line-width': 1
        }
      });
    });

    return () => map.current.remove();
  }, []);

  // Sync searched areas from Firestore
  useEffect(() => {
    if (!map.current) return;

    const q = query(collection(db, 'search_logs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 地図がまだ読み込み中、またはソースがまだ追加されていない場合はスキップ
      if (!map.current || !map.current.isStyleLoaded()) return;
      
      const source = map.current.getSource('searched-areas');
      if (!source) return;

      const features = snapshot.docs.map(doc => {
        const data = doc.data();
        try {
          return JSON.parse(data.buffer);
        } catch (e) {
          console.error("Parse error:", e);
          return null;
        }
      }).filter(f => f !== null);

      source.setData({
        type: 'FeatureCollection',
        features: features
      });
    });

    return () => unsubscribe();
  }, []);

  // Update current position marker
  useEffect(() => {
    if (!map.current || !currentPosition) return;

    if (!markers.current['me']) {
      const el = document.createElement('div');
      el.className = 'w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg';
      markers.current['me'] = new maplibregl.Marker(el)
        .setLngLat([currentPosition.lng, currentPosition.lat])
        .addTo(map.current);
    } else {
      markers.current['me'].setLngLat([currentPosition.lng, currentPosition.lat]);
    }

    // Auto-pan if tracking
    // map.current.setCenter([currentPosition.lng, currentPosition.lat]);
  }, [currentPosition]);

  return (
    <div className="absolute inset-0 w-full h-full bg-slate-200">
      <div ref={mapContainer} className="w-full h-full" />
      {!currentPosition && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 glass px-4 py-2 rounded-full shadow-lg pointer-events-none">
          <p className="text-[10px] font-black text-primary-600 animate-pulse tracking-widest uppercase">GPS Searching...</p>
        </div>
      )}
    </div>
  );
}
