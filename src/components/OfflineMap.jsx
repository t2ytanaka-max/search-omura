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

// 大村市・鹿島市・諫早市・嬉野市・太良町に跨る「多良岳山系全域」の広域範囲設定
const OMURA_BOUNDS = {
  minLon: 129.80, // 西：大村湾・大村市街地
  maxLon: 130.22, // 東：鹿島市・太良町・有明海沿岸
  minLat: 32.78,  // 南：諫早市・高来町
  maxLat: 33.12   // 北：嬉野市・鹿島北部（経ヶ岳北面）
};

const getMemberColor = (userIdOrName) => {
  const colors = [
    '#EF4444', // 赤
    '#3B82F6', // 青
    '#10B981', // エメラルド
    '#F97316', // オレンジ
    '#EC4899', // ピンク
    '#06B6D4', // シアン
    '#D97706', // 琥珀/アンバー
    '#8B5CF6'  // パープル
  ];
  let hash = 0;
  const str = userIdOrName || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const MARKER_STYLE_MAP = {
  'ST02': { text: '異状なし', color: 'bg-emerald-600 text-white border-white', arrowColor: 'border-t-emerald-600' },
  'ST03': { text: '発見', color: 'bg-yellow-400 text-black border-black font-black', arrowColor: 'border-t-yellow-400' },
  'ST04': { text: '要請', color: 'bg-red-600 text-white border-white animate-pulse', arrowColor: 'border-t-red-600' },
  'ST05': { text: '危険', color: 'bg-purple-600 text-white border-white', arrowColor: 'border-t-purple-600' }
};

export default function OfflineMap({ currentPosition, memberTracks = [], reportMarkers = [], onDeleteMarker }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const [cachedCount, setCachedCount] = useState(() => {
    const saved = localStorage.getItem('search_cached_tile_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [cachedTilesMap, setCachedTilesMap] = useState(new Map()); // メモリ上のタイルキャッシュ
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [isStyleLoaded, setIsStyleLoaded] = useState(false); // 地図読み込み完了フラグ
  const renderedUserIdsRef = useRef([]); // 前回描画したユーザーIDの記録（クリーンアップ用）
  const renderedReportMarkersRef = useRef([]); // 描画した報告マーカーの記録 (消去用)

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
      
      // 読み込み時差を解消するため、最新カウントをlocalStorageに即同期
      localStorage.setItem('search_cached_tile_count', tileMap.size.toString());
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
      setIsStyleLoaded(true);
      map.current.resize();
    });
    setTimeout(() => {
      if (map.current) map.current.resize();
    }, 500);

    // 現在地マーカー (位置情報が渡されている場合＝団員画面のみ表示)
    if (currentPosition) {
      const el = document.createElement('div');
      el.className = 'w-6 h-6 bg-blue-500 border-4 border-white rounded-full shadow-lg animate-pulse';
      marker.current = new maplibregl.Marker(el)
        .setLngLat(initialCenter)
        .addTo(map.current);
    }
  }, [cachedTilesMap]); // キャッシュがロードされたら地図を再初期化または追従

  // 自分の現在地マーカー更新＆中心移動
  useEffect(() => {
    if (map.current && currentPosition) {
      if (marker.current) {
        marker.current.setLngLat([currentPosition.lng, currentPosition.lat]);
      }
      map.current.easeTo({
        center: [currentPosition.lng, currentPosition.lat],
        duration: 1000
      });
    }
  }, [currentPosition]);

  // 他の団員の軌跡・現在地を描画
  useEffect(() => {
    if (!map.current || !isStyleLoaded) return;

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

        const memberColor = getMemberColor(track.userId);

        map.current.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': memberColor,
            'line-width': 6,
            'line-opacity': 0.8
          }
        });

        const lastPoint = track.points[track.points.length - 1];
        if (!lastPoint || typeof lastPoint.lat !== 'number' || typeof lastPoint.lng !== 'number' || isNaN(lastPoint.lat) || isNaN(lastPoint.lng)) {
          return; // 位置情報が不正な場合はクラッシュ防止のためピン描画をスキップ
        }

        const el = document.createElement('div');
        el.id = markerId;
        el.className = 'relative px-3 py-1.5 text-white text-[10px] font-black rounded-xl border-2 border-white shadow-xl transform -translate-y-5 select-none whitespace-nowrap w-max';
        el.style.backgroundColor = memberColor;
        el.innerText = track.userName || '団員';

        // 下向きの逆三角形のしっぽ (▼)
        const arrow = document.createElement('div');
        arrow.className = 'absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-t-[7px]';
        arrow.style.borderTopColor = memberColor;
        el.appendChild(arrow);

        new maplibregl.Marker({ element: el })
          .setLngLat([lastPoint.lng, lastPoint.lat])
          .addTo(map.current);
      } catch (e) {
        console.error("Failed to render member track:", track.userId, e);
      }
    });

    // 今回描画したIDリストを保存して次回の消去に使用する
    renderedUserIdsRef.current = memberTracks.map(t => t.userId);

  }, [memberTracks, isStyleLoaded]);

  // 3. 報告マーカー (要救助者発見、危険箇所など) を描画
  useEffect(() => {
    if (!map.current || !isStyleLoaded) return;

    // 前回の報告マーカーを一旦すべてクリーンアップする
    renderedReportMarkersRef.current.forEach(markerInstance => {
      markerInstance.remove();
    });
    renderedReportMarkersRef.current = [];

    const newMarkers = [];

    // 新規描画
    reportMarkers.forEach((markerData) => {
      const { id, lat, lng, statusCode, userName } = markerData;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        return; // 位置情報が不正な場合はクラッシュ防止のためスキップ
      }
      const style = MARKER_STYLE_MAP[statusCode];
      if (!style) return; // プロット対象外のステータス

      // マーカー要素を作成
      const el = document.createElement('div');
      el.className = `relative px-2.5 py-1.5 ${style.color} text-[10px] font-black rounded-xl border shadow-lg flex flex-col items-center gap-0.5 transform -translate-y-5 cursor-pointer select-none whitespace-nowrap w-max`;
      
      const labelSpan = document.createElement('span');
      labelSpan.innerText = style.text;
      el.appendChild(labelSpan);

      if (userName) {
        const nameSpan = document.createElement('span');
        nameSpan.className = 'text-[7px] opacity-75 font-normal scale-90 border-t border-white/20 pt-0.5';
        nameSpan.innerText = userName;
        el.appendChild(nameSpan);
      }

      // 下向きの逆三角形のしっぽ (▼) の追加
      const arrow = document.createElement('div');
      arrow.className = `absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${style.arrowColor}`;
      el.appendChild(arrow);

      // 長押し削除トリガー (右クリックまたはロングタップ)
      const handleDeleteTrigger = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDeleteMarker && id) {
          if (window.confirm(`この「${style.text}」ピンを削除しますか？\n※削除すると本部および他メンバーの画面からも消去されます。`)) {
            onDeleteMarker(id);
          }
        }
      };

      el.addEventListener('contextmenu', handleDeleteTrigger);

      // スマホ用タッチタイマー長押し検知 (700ms)
      let touchTimer = null;
      el.addEventListener('touchstart', (e) => {
        touchTimer = setTimeout(() => {
          handleDeleteTrigger(e);
        }, 700);
      }, { passive: true });

      const clearTouchTimer = () => {
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
      };

      el.addEventListener('touchend', clearTouchTimer);
      el.addEventListener('touchmove', clearTouchTimer);
      el.addEventListener('touchcancel', clearTouchTimer);

      try {
        const m = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(map.current);
        newMarkers.push(m);
      } catch (e) {
        console.error("Failed to add report marker to map:", e);
      }
    });

    renderedReportMarkersRef.current = newMarkers;

  }, [reportMarkers, isStyleLoaded]);

  // 国土地理院マップタイルを確実にBlob化して取得するハイブリッド関数
  const fetchTileAsBlob = async (url) => {
    // 1. 標準fetch試行
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.blob();
      }
    } catch (e) {
      // fetch失敗時はCanvasフォールバックへ移行
    }

    // 2. HTML5 Canvas 経由での画像描画＆Blobキャプチャ (CORS制限回避)
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 256;
          canvas.height = img.height || 256;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/png');
        } catch (err) {
          resolve(null);
        }
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = url;
    });
  };

  // 地図の事前ダウンロード (一括キャッシュ)
  const downloadOmuraMap = async () => {
    if (downloading) return;

    // 事前の書き込み診断 (シークレットモードや空き容量チェック)
    try {
      const testDb = await getDB();
      // テスト用のダミーデータを書き込んで即時消去する
      await testDb.put('tiles', { id: 'write-test-temp', blob: new Blob(['test'], { type: 'text/plain' }) });
      await testDb.delete('tiles', 'write-test-temp');
    } catch (e) {
      alert("【重要：地図保存エラー】\nブラウザの保存領域（IndexedDB）への書き込みに失敗しました。\n\n原因として以下の可能性があります：\n1. Google Chromeの『シークレットモード』を使っている（通常モードで開き直してください）\n2. スマートフォンの空き容量が不足している\n3. ブラウザのストレージアクセス権限が許可されていない");
      return;
    }

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
    let failedCount = 0; // 保存失敗カウンター
    let firstErrReason = ""; // 最初の失敗理由

    const downloadNext = async () => {
      if (index >= tileList.length) return;
      const tile = tileList[index++];
      active++;

      const tileId = `${tile.z}-${tile.x}-${tile.y}`;
      const url = `https://cyberjapandata.gsi.go.jp/xyz/std/${tile.z}/${tile.x}/${tile.y}.png`;

      try {
        const existing = await getCachedTile(tileId);
        if (!existing) {
          const blob = await fetchTileAsBlob(url);
          if (blob && blob.size > 0) {
            await cacheTile(tileId, blob);
          } else {
            failedCount++;
            if (!firstErrReason) firstErrReason = "画像の取得またはデータ変換に失敗しました。";
          }
        }
      } catch (e) {
        console.warn(`Tile download failed for: ${tileId}`, e);
        failedCount++;
        if (!firstErrReason) firstErrReason = e.message || String(e);
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

    if (failedCount > 0) {
      alert(`ダウンロード処理は完了しましたが、一部の地図（${failedCount}枚）の保存に失敗しました。\n詳細原因: ${firstErrReason}\n\n端末の空き容量不足やChromeの設定を確認してください。`);
    } else {
      alert(`ダウンロード完了！\n${completed} 枚の地図タイルをローカルに保存しました。\n多良岳山系全域（大村市・鹿島市・諫早市・嬉野市・太良町）の圏外エリアでもマップを表示可能です。`);
    }
  };

  const handleClearCache = async () => {
    if (window.confirm("保存したオフライン用地図データを全て削除しますか？\n（山に入る前はWi-Fiで再ダウンロードが必要になります）")) {
      await clearTileCache();
      localStorage.removeItem('search_cached_tile_count');
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
              多良岳山系全域を一括保存
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
