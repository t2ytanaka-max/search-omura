import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export default function OfflineMap({ currentPosition, memberTracks = [] }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);

  // 地図の初期化 (最もシンプルな通常ロード)
  useEffect(() => {
    if (map.current) return;

    const initialCenter = currentPosition ? [currentPosition.lng, currentPosition.lat] : [129.96, 32.90];

    // プロトコル等を使わず、国土地理院の標準タイルURLをそのまま指定
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'gsi': {
            type: 'raster',
            tiles: [
              'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '地理院地図'
          }
        },
        layers: [
          {
            id: 'gsi-layer',
            type: 'raster',
            source: 'gsi',
            minzoom: 0,
            maxzoom: 18
          }
        ]
      },
      center: initialCenter,
      zoom: 12
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      map.current.resize();
    });
    setTimeout(() => {
      if (map.current) map.current.resize();
    }, 500);

    // 自分の現在地マーカー
    const el = document.createElement('div');
    el.className = 'w-6 h-6 bg-blue-500 border-4 border-white rounded-full shadow-lg animate-pulse';
    marker.current = new maplibregl.Marker(el)
      .setLngLat(initialCenter)
      .addTo(map.current);
  }, []);

  // 自分の現在地マーカー更新＆中心移動
  useEffect(() => {
    if (map.current && currentPosition && marker.current) {
      marker.current.setLngLat([currentPosition.lng, currentPosition.lat]);
      map.current.easeTo({
        center: [currentPosition.lng, currentPosition.lat],
        duration: 1000
      });
    }
  }, [currentPosition]);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* マップコンテナ */}
      <div ref={mapContainer} className="absolute inset-0 bg-slate-900" />
      
      {/* コピーライト表記 */}
      <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 bg-black/55 text-white text-[9px] font-bold rounded">
        地理院地図
      </div>
    </div>
  );
}
