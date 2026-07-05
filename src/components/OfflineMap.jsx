import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Download, Trash2 } from 'lucide-react';
import { getDB, cacheTile, clearTileCache, getCachedTilesCount } from '../lib/db';

// 緯度経度からタイル座標への変換
function lon2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}
function lat2tile(lat, zoom) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}

// 大村市周辺の基本範囲設定（山岳地帯を含む）
const OMURA_BOUNDS = {
  minLon: 129.85,
  maxLon: 130.10,
  minLat: 32.80,
  maxLat: 33.05
};

export default function OfflineMap({ currentPosition, memberTracks = [] }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [cachedCount, setCachedCount] = useState(0);
  const [cachedTilesMap, setCachedTilesMap] = useState(new Map()); // メモリ上のタイルキャッシュ
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const renderedUserIdsRef = useRef([]); // 前回描画したユーザーIDの記録（クリーンアップ用）

  // 1. 起動時に IndexedDB のタイルデータをすべてメモリ（State）にロードする
  // これにより transformRequest 内で「同期的」に ObjectURL を返せるようになり、MapLibreがクラッシュしません
  const loadTilesToMemory = async () => {
    try {
      const db = await getDB();
      const allTiles = await db.getAll('tiles');
      const tileMap = new Map();
      allTiles.forEach(tile => {
        tileMap.set(tile.id, tile.blob);
      });
      setCachedTilesMap(tileMap);
      setCachedCount(tileMap.size);
    } catch (e) {
      console.error("Failed to load tiles to memory:", e);
    }
  };

  useEffect(() => {
    loadTilesToMemory();
  }, []);

  // 2. 地図の初期化
  useEffect(() => {
    if (map.current) return;

    const initialCenter = currentPosition ? [currentPosition.lng, currentPosition.lat] : [129.96, 32.90];

    // 同期処理のみの transformRequest
    const transformRequest = (url, resourceType) => {
      if (resourceType === 'Tile' && url.includes('cyberjapandata.gsi.go.jp')) {
        const tileMatch = url.match(/\/(\d+)\/(\d+)\/(\d+)\.png/);
        if (tileMatch) {
          const tileId = `${tileMatch[1]}-${tileMatch[2]}-${tileMatch[3]}`;
          
          // メモリ上にキャッシュがあれば、同期的に即座に返す (CORS回避・完全オフライン対応)
          if (cachedTilesMap.has(tileId)) {
            const blob = cachedTilesMap.get(tileId);
            return { url: URL.createObjectURL(blob) };
          }
        }
      }
      return { url };
    };

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
      zoom: 12,
      transformRequest: transformRequest
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      map.current.resize();
    });
    setTimeout(() => {
      if (map.current) map.current.resize();
    }, 500);

    // 現在地マーカー
    const el = document.createElement('div');
    el.className = 'w-6 h-6 bg-blue-500 border-4 border-white rounded-full shadow-lg animate-pulse';
    marker.current = new maplibregl.Marker(el)
      .setLngLat(initialCenter)
      .addTo(map.current);
  }, [cachedTilesMap]); // キャッシュがロードされたら地図を再初期化または追従

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

  // 他の団員の軌跡・現在地を描画
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // 前回の描画データを一旦すべてクリーンアップする (消去漏れ防止)
    renderedUserIdsRef.current.forEach(userId => {
      const sourceId = `track-${userId}`;
      const layerId = `layer-${userId}`;
      const markerId = `marker-${userId}`;

      try {
        if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
        if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
      } catch (e) {
        console.warn("Cleanup layers error:", e);
      }
      
      const markerElement = document.getElementById(markerId);
      if (markerElement) markerElement.remove();
    });

    // 新規描画
    memberTracks.forEach(track => {
      if (!track.points || track.points.length === 0) return;
      const sourceId = `track-${track.userId}`;
      const layerId = `layer-${track.userId}`;
      const markerId = `marker-${track.userId}`;

      try {
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: track.points.map(p => [p.lng, p.lat])
            }
          }
        });

        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#ff3b3b',
            'line-width': 6,
            'line-opacity': 0.8
          }
        });

        const lastPoint = track.points[track.points.length - 1];
        const el = document.createElement('div');
        el.id = markerId;
        el.className = 'px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-full border-2 border-white shadow-md transform -translate-y-4';
        el.innerText = track.userName || '団員';

        new maplibregl.Marker({ element: el })
          .setLngLat([lastPoint.lng, lastPoint.lat])
          .addTo(map.current);
      } catch (e) {
        console.error("Failed to render member track:", track.userId, e);
      }
    });

    // 今回描画したIDリストを保存して次回の消去に使用する
    renderedUserIdsRef.current = memberTracks.map(t => t.userId);

  }, [memberTracks]);

  // 地図の事前ダウンロード (一括キャッシュ)
  const downloadOmuraMap = async () => {
    if (downloading) return;
    setDownloading(true);

    const zooms = [11, 12, 13, 14];
    const tileList = [];

    zooms.forEach(z => {
      const xMin = lon2tile(OMURA_BOUNDS.minLon, z);
      const xMax = lon2tile(OMURA_BOUNDS.maxLon, z);
      const yMin = lat2tile(OMURA_BOUNDS.maxLat, z);
      const yMax = lat2tile(OMURA_BOUNDS.minLat, z);

      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          tileList.push({ z, x, y });
        }
      }
    });

    setDownloadProgress({ current: 0, total: tileList.length });

    const limit = 4;
    let active = 0;
    let index = 0;
    let completed = 0;

    const downloadNext = async () => {
      if (index >= tileList.length) return;
      const tile = tileList[index++];
      active++;

      const tileId = `${tile.z}-${tile.x}-${tile.y}`;
      const url = `https://cyberjapandata.gsi.go.jp/xyz/std/${tile.z}/${tile.x}/${tile.y}.png`;

      try {
        const existing = await getCachedTile(tileId);
        if (!existing) {
          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            await cacheTile(tileId, blob);
          }
        }
      } catch (e) {
        console.warn(`Tile download failed for: ${tileId}`, e);
      } finally {
        completed++;
        active--;
        setDownloadProgress({ current: completed, total: tileList.length });
        downloadNext();
      }
    };

    const promises = [];
    for (let i = 0; i < Math.min(limit, tileList.length); i++) {
      promises.push(downloadNext());
    }
    
    await Promise.all(promises);

    setDownloading(false);
    // メモリ上のキャッシュと件数を最新化
    await loadTilesToMemory();
    alert(`ダウンロード完了！\n${completed} 枚の地図タイルをローカルに保存しました。圏外でも捜索エリアを表示可能です。`);
  };

  const handleClearCache = async () => {
    if (window.confirm("保存したオフライン用地図データを全て削除しますか？\n（山に入る前はWi-Fiで再ダウンロードが必要になります）")) {
      await clearTileCache();
      await loadTilesToMemory();
      // マップを強制的に再描画させるためにリロードを推奨
      window.location.reload();
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* マップコンテナ */}
      <div ref={mapContainer} className="absolute inset-0 bg-slate-900" />

      {/* 地図キャッシュ操作UI */}
      <div className="absolute top-4 left-4 z-10 glass p-3 rounded-2xl max-w-[280px] space-y-2 pointer-events-auto">
        <div className="flex justify-between items-center text-xs font-bold text-gray-200">
          <span>オフライン地図: {cachedCount}枚</span>
        </div>
        
        {downloading ? (
          <div className="space-y-1.5">
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-rescue-500 h-full transition-all duration-300"
                style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 font-mono text-center">
              DL中... {downloadProgress.current} / {downloadProgress.total} Tiles
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={downloadOmuraMap}
              className="flex-1 py-2 px-3 bg-rescue-500 hover:bg-rescue-600 active:scale-95 text-white text-[11px] font-black rounded-lg flex items-center justify-center gap-1 transition-all"
            >
              大村周辺を一括保存
            </button>
            {cachedCount > 0 && (
              <button
                onClick={handleClearCache}
                className="p-2 bg-gray-800 hover:bg-red-950 text-gray-400 hover:text-red-400 rounded-lg active:scale-95 transition-all"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* コピーライト表記 */}
      <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 bg-black/55 text-white text-[9px] font-bold rounded">
        地理院地図
      </div>
    </div>
  );
}
