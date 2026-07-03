import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Download, Check, Trash2, MapPin } from 'lucide-react';
import { cacheTile, getCachedTile, clearTileCache, getCachedTilesCount } from '../lib/db';

// 緯度経度からタイル座標への変換
function lon2tile(lon, zoom) {
  return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}
function lat2tile(lat, zoom) {
  return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}

// 大村市周辺の基本範囲設定
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
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    updateCacheStatus();
  }, []);

  const updateCacheStatus = async () => {
    const count = await getCachedTilesCount();
    setCachedCount(count);
  };

  // MapLibre のリクエストカスタムインターセプタ (オフライン時の IndexedDB 読み書き)
  const transformRequest = (url, resourceType) => {
    if (resourceType === 'Tile' && (url.includes('tile.openstreetmap.org') || url.includes('openstreetmap.org'))) {
      // URLからズーム・X・Yを抽出
      const tileMatch = url.match(/\/(\d+)\/(\d+)\/(\d+)\.png/);
      if (tileMatch) {
        const tileId = `${tileMatch[1]}-${tileMatch[2]}-${tileMatch[3]}`;
        
        return getCachedTile(tileId).then(cached => {
          if (cached) {
            // キャッシュがあればObjectURLを生成して返す
            return { url: URL.createObjectURL(cached.blob) };
          }
          
          // キャッシュがない場合、オンラインならフェッチして自動保存
          if (navigator.onLine) {
            return fetch(url)
              .then(res => {
                if (!res.ok) throw new Error("Fetch failed");
                return res.blob();
              })
              .then(blob => {
                cacheTile(tileId, blob);
                return { url: URL.createObjectURL(blob) };
              })
              .catch(() => ({ url }));
          }
          return { url };
        });
      }
    }
    return { url };
  };

  // 地図の初期化
  useEffect(() => {
    if (map.current) return;

    // カスタムプロトコルの登録 (IndexedDBから非同期でタイルを読み込む)
    const protocolName = 'offline-osm';
    
    // 多重登録を防ぐため、既に登録されているか確認
    try {
      maplibregl.addProtocol(protocolName, (params, callback) => {
        const tileMatch = params.url.match(/offline-osm:\/\/(\d+)-(\d+)-(\d+)/);
        if (tileMatch) {
          const tileId = `${tileMatch[1]}-${tileMatch[2]}-${tileMatch[3]}`;
          
          getCachedTile(tileId).then(cached => {
            if (cached) {
              cached.blob.arrayBuffer().then(buf => {
                callback(null, buf, null, null);
              });
            } else {
              // キャッシュがない場合、オンラインならインターネットから取得
              if (navigator.onLine) {
                const osmUrl = `https://a.tile.openstreetmap.org/${tileMatch[1]}/${tileMatch[2]}/${tileMatch[3]}.png`;
                fetch(osmUrl)
                  .then(res => {
                    if (!res.ok) throw new Error("Fetch failed");
                    return res.blob();
                  })
                  .then(blob => {
                    // バックグラウンドでキャッシュ
                    cacheTile(tileId, blob);
                    return blob.arrayBuffer();
                  })
                  .then(buf => {
                    callback(null, buf, null, null);
                  })
                  .catch(err => {
                    callback(err);
                  });
              } else {
                callback(new Error('Offline and no cache'));
              }
            }
          }).catch(err => {
            callback(err);
          });
        }
        return { cancel: () => {} };
      });
    } catch (e) {
      // 既にプロトコルが登録されている場合はエラーを無視
    }

    // 初期表示は大村市中心
    const initialCenter = currentPosition ? [currentPosition.lng, currentPosition.lat] : [129.96, 32.90];

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: [
              'offline-osm://{z}-{x}-{y}'
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
            maxzoom: 18
          }
        ]
      },
      center: initialCenter,
      zoom: 12
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // 自分の現在地マーカー作成
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
      // 地図中心を滑らかに移動
      map.current.easeTo({
        center: [currentPosition.lng, currentPosition.lat],
        duration: 1000
      });
    }
  }, [currentPosition]);

  // 他の隊員の軌跡・現在地を描画 (本部・他団員位置プロット用)
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    // 既存のレイヤーとソースのクリア
    memberTracks.forEach(track => {
      const sourceId = `track-${track.userId}`;
      const layerId = `layer-${track.userId}`;
      const markerId = `marker-${track.userId}`;

      if (map.current.getLayer(layerId)) map.current.removeLayer(layerId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
      
      // 他の団員用HTMLマーカー削除
      const markerElement = document.getElementById(markerId);
      if (markerElement) markerElement.remove();
    });

    // 新規描画
    memberTracks.forEach(track => {
      if (!track.points || track.points.length === 0) return;
      const sourceId = `track-${track.userId}`;
      const layerId = `layer-${track.userId}`;
      const markerId = `marker-${track.userId}`;

      // 軌跡 (LINE)
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

      // 最新位置マーカー
      const lastPoint = track.points[track.points.length - 1];
      const el = document.createElement('div');
      el.id = markerId;
      el.className = 'px-3 py-1 bg-red-600 text-white text-[10px] font-black rounded-full border-2 border-white shadow-md transform -translate-y-4';
      el.innerText = track.userName || '団員';

      new maplibregl.Marker({ element: el })
        .setLngLat([lastPoint.lng, lastPoint.lat])
        .addTo(map.current);
    });

  }, [memberTracks]);

  // 地図の事前ダウンロード (一括キャッシュ)
  const downloadOmuraMap = async () => {
    if (downloading) return;
    setDownloading(true);

    const zooms = [11, 12, 13, 14]; // 捜索エリアの主要詳細度
    const tileList = [];

    zooms.forEach(z => {
      const xMin = lon2tile(OMURA_BOUNDS.minLon, z);
      const xMax = lon2tile(OMURA_BOUNDS.maxLon, z);
      const yMin = lat2tile(OMURA_BOUNDS.maxLat, z); // 緯度は北に行くほどY座標が小さい
      const yMax = lat2tile(OMURA_BOUNDS.minLat, z);

      for (let x = xMin; x <= xMax; x++) {
        for (let y = yMin; y <= yMax; y++) {
          tileList.push({ z, x, y });
        }
      }
    });

    setDownloadProgress({ current: 0, total: tileList.length });

    // 同時ダウンロード並行数制限付きでフェッチ
    const limit = 4; // 同時4リクエスト
    let active = 0;
    let index = 0;
    let completed = 0;

    const downloadNext = async () => {
      if (index >= tileList.length) return;
      const tile = tileList[index++];
      active++;

      const tileId = `${tile.z}-${tile.x}-${tile.y}`;
      const url = `https://a.tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`;

      try {
        // すでに存在するかチェック
        const existing = await getCachedTile(tileId);
        if (!existing) {
          const response = await fetch(url);
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
        
        // 次のダウンロードを促す
        downloadNext();
      }
    };

    // 初期並行数の起動
    const promises = [];
    for (let i = 0; i < Math.min(limit, tileList.length); i++) {
      promises.push(downloadNext());
    }
    
    // 全て終わるのを待つ
    await Promise.all(promises);

    // 完了後の処理
    setDownloading(false);
    updateCacheStatus();
    alert(`ダウンロード完了！\n${completed} 枚の地図タイルをローカルに保存しました。圏外でも捜索エリアを表示可能です。`);
  };

  const handleClearCache = async () => {
    if (window.confirm("保存したオフライン用地図データを全て削除しますか？\n（山に入る前はWi-Fiで再ダウンロードが必要になります）")) {
      await clearTileCache();
      updateCacheStatus();
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* マップコンテナ */}
      <div ref={mapContainer} className="w-full h-full bg-slate-900" />

      {/* 地図キャッシュ操作UI (オーバーレイ) */}
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
              <Download size={12} /> 大村周辺を一括保存
            </button>
            {cachedCount > 0 && (
              <button
                onClick={handleClearCache}
                className="p-2 bg-gray-800 hover:bg-red-950 text-gray-400 hover:text-red-400 rounded-lg active:scale-95 transition-all"
                title="キャッシュのクリア"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* コピーライト表記 */}
      <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 bg-black/55 text-white text-[9px] font-bold rounded">
        &copy; OpenStreetMap contributors
      </div>
    </div>
  );
}
