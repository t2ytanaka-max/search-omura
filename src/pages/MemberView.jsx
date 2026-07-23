import React, { useState, useEffect, useRef } from 'react';
import { Play, MapPin, Send, Mail, CheckCircle, AlertTriangle, Moon, RefreshCw, Smartphone, LogOut, Wifi, WifiOff } from 'lucide-react';
import OfflineMap from '../components/OfflineMap';
import { collection, query, onSnapshot, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import NotificationManager from '../components/NotificationManager';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { addToQueue, getQueue, clearMessages } from '../lib/db';

const REPORT_TEMPLATES = [
  { code: 'ST01', text: '捜索開始', color: 'bg-blue-600 active:bg-blue-700' },
  { code: 'ST02', text: '異状なし', color: 'bg-emerald-600 active:bg-emerald-700' },
  { code: 'ST03', text: '要救助者を発見', color: 'bg-yellow-500 active:bg-yellow-600 text-black' },
  { code: 'ST04', text: '救助要請（応援）', color: 'bg-red-600 active:bg-red-700' },
  { code: 'ST05', text: '危険箇所（滑落注意）', color: 'bg-purple-600 active:bg-purple-700' },
  { code: 'ST06', text: '捜索終了', color: 'bg-gray-600 active:bg-gray-700' }
];

export default function MemberView({ onGoBack }) {
  const [activeTab, setActiveTab] = useState('report'); // report, map, messages, queue
  const [userName, setUserName] = useState(() => localStorage.getItem('search_member_name') || '');
  const [userId] = useState(() => {
    let id = localStorage.getItem('search_member_id');
    if (!id) {
      id = 'D' + Math.floor(100 + Math.random() * 900); // 団員ID（例: D124）
      localStorage.setItem('search_member_id', id);
    }
    return id;
  });
  
  const [currentPosition, setCurrentPosition] = useState(null);
  const [isSearching, setIsSearching] = useState(() => {
    return localStorage.getItem('search_is_searching') === 'true';
  });
  const autoReportTimerRef = useRef(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [myReports, setMyReports] = useState(() => {
    const saved = localStorage.getItem('search_my_reports');
    return saved ? JSON.parse(saved) : [];
  });

  const [myPath, setMyPath] = useState(() => {
    const saved = localStorage.getItem('search_my_path');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('search_my_reports', JSON.stringify(myReports));
  }, [myReports]);

  const [memberTracks, setMemberTracks] = useState([]); // 他の班の軌跡データ (ST01〜ST04, ST06)
  const [sharedDangerMarkers, setSharedDangerMarkers] = useState([]); // 他の班からも共有された危険箇所ピン (ST05)

  // 他の班の現在位置・軌跡および危険箇所ピンをFirestoreからリアルタイム同期
  useEffect(() => {
    const q = query(collection(db, 'search_logs'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const parsedLogs = [];
      const tracksMap = {};
      const latestMembers = {};
      const dangerMarkers = [];

      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.payload) return;
        const parts = data.payload.split(',');
        if (parts.length < 5) return;
        const [uId, uName, statusCode, latStr, lngStr, tsStr, messageText] = parts;
        
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        const serverTs = data.timestamp ? data.timestamp.toDate().getTime() : Date.now();
        const timestamp = parseInt(tsStr) || serverTs;
        const message = messageText || '';

        const logEntry = {
          id: docSnap.id,
          userId: uId,
          userName: uName,
          statusCode,
          lat,
          lng,
          timestamp,
          message
        };
        parsedLogs.push(logEntry);
      });

      // タイムスタンプで昇順にソート (時系列順)
      parsedLogs.sort((a, b) => a.timestamp - b.timestamp);

      // 各ログのパース処理
      parsedLogs.forEach(log => {
        // 報告ピン (ST02, ST03, ST04, ST05) は共有ピンリストへ追加 (本部での削除にリアルタイム完全連動)
        if (['ST02', 'ST03', 'ST04', 'ST05'].includes(log.statusCode)) {
          dangerMarkers.push({
            id: log.id,
            lat: log.lat,
            lng: log.lng,
            statusCode: log.statusCode,
            userName: log.userName
          });
        }

        // 軌跡を追加 (自分を含む全員分)
        if (!tracksMap[log.userId]) {
          tracksMap[log.userId] = {
            userId: log.userId,
            userName: log.userName,
            points: []
          };
        }
        tracksMap[log.userId].userName = log.userName;
        tracksMap[log.userId].points.push({ lat: log.lat, lng: log.lng, timestamp: log.timestamp });

        // 最新ステータスの追従
        latestMembers[log.userId] = {
          userId: log.userId,
          userName: log.userName,
          statusCode: log.statusCode,
          lastSync: log.timestamp
        };
      });

      // 最新の「捜索開始 (ST01)」のタイムスタンプを取得 (過去セッションのゴミデータ混入防止)
      const userSessionStartTimes = {};
      parsedLogs.forEach(log => {
        if (log.statusCode === 'ST01') {
          userSessionStartTimes[log.userId] = log.timestamp;
        }
      });

      // アクティブな団員 (下山終了 ST06 でなく、かつ12時間以内に同期あり) の軌跡のみに絞り込む
      const activeTracks = Object.values(tracksMap).filter(track => {
        const info = latestMembers[track.userId];
        if (!info) return false;
        if (info.statusCode === 'ST06') return false;
        const isTimeout = (Date.now() - info.lastSync) > 12 * 60 * 60 * 1000;
        if (isTimeout) return false;

        // 過去セッションの古い軌跡点は除外して最新セッション分のみ描画
        const sessionStartTime = userSessionStartTimes[track.userId] || 0;
        track.points = track.points.filter(p => p.timestamp >= sessionStartTime);
        return track.points.length > 0;
      });

      setSharedDangerMarkers(dangerMarkers);
      setMemberTracks(activeTracks);
    });

    return () => unsubscribe();
  }, [userId]);

  // UTF-8のバイト数を計算するヘルパー
  const getByteLength = (str) => {
    return new TextEncoder().encode(str).length;
  };

  // 1. 同期・キュー監視カスタムフック
  const {
    isOnline,
    networkStatus,
    queueCount,
    messagesList,
    updateQueueCount,
    loadLocalMessages,
    triggerSync
  } = useSyncQueue(userId, () => {
    // 新着指示があった時のコールバック
    const latest = messagesList[0] || { id: 'test', text: '本部からの指示を受信しました。' };
    setActiveAlert(latest);
  });

  // 最新メッセージ受信時に即座にモーダルを表示するための監視
  useEffect(() => {
    if (!isSearching) return; // 捜索終了時はポップアップしない
    const sessionStartTime = parseInt(localStorage.getItem('search_session_start_time') || '0');
    const unread = messagesList.find(m => !m.read && m.timestamp >= sessionStartTime);
    if (unread) {
      setActiveAlert(unread);
    }
  }, [messagesList, isSearching]);

  // GPSの常時監視（地図用＆ローカル軌跡の記録）
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setCurrentPosition({ lat: newLat, lng: newLng });

        // 捜索中の場合のみ、自分自身の歩行軌跡 (myPath) に座標を蓄積
        if (isSearching) {
          // 1. デバイスのGPS速度センサーによるフィルタリング (時速15km以上 = 4.17 m/s以上)
          const gpsSpeed = pos.coords.speed;
          if (typeof gpsSpeed === 'number' && gpsSpeed > 4.17) {
            return; // 車両移動中として軌跡追加をスキップ
          }

          setMyPath(prev => {
            const newPt = { lat: newLat, lng: newLng, timestamp: Date.now() };
            
            if (prev.length > 0) {
              const last = prev[prev.length - 1];
              
              // 2. 座標間距離と時間差から簡易速度を算出してフィルタリング (GPS速度が取得できないデバイス対策)
              const R = 6371000; // 地球の半径 (m)
              const dLat = (newLat - last.lat) * Math.PI / 180;
              const dLon = (newLng - last.lng) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(last.lat * Math.PI / 180) * Math.cos(newLat * Math.PI / 180) *
                        Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const distanceMeters = R * c;
              
              const timeSec = (newPt.timestamp - last.timestamp) / 1000;
              
              if (timeSec > 0) {
                const calculatedSpeed = distanceMeters / timeSec; // m/s
                if (calculatedSpeed > 4.17) {
                  return prev; // 時速15km以上は車両移動中とみなして軌跡に追加しない
                }
              }

              // 3. バッテリー最適化: 移動距離10m未満、または経過時間10秒未満の場合は無駄な記録をスキップして省電力化
              if (distanceMeters < 10 || timeSec < 10) return prev;
            }
            
            const updated = [...prev, newPt];
            localStorage.setItem('search_my_path', JSON.stringify(updated));
            return updated;
          });
        }
      },
      (err) => console.warn("GPS watch error:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSearching]);

  useEffect(() => {
    localStorage.setItem('search_member_name', userName);
  }, [userName]);

  // 捜索状態の永続化
  useEffect(() => {
    localStorage.setItem('search_is_searching', isSearching ? 'true' : 'false');
  }, [isSearching]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const unlockAudio = () => {
    if (window.sharedAudioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      // iOS自動再生制限解除のためのダミー無音再生
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      window.sharedAudioCtx = ctx;
      console.log("Audio context unlocked successfully.");
    } catch (e) {
      console.error("Failed to unlock audio context:", e);
    }
  };

  // 位置情報をFirestore送信（キュー経由）する共通関数
  // 位置情報をFirestore送信（キュー経由）する共通関数
  const sendPayload = (statusCode, includeMessage = false) => {
    if (!('geolocation' in navigator)) {
      alert("GPS機能が利用できません。");
      return;
    }

    showToast("GPS取得中...");

    // メッセージが有れば改行とカンマを除去、無ければ空文字
    const cleanMsg = includeMessage ? messageText.trim().replace(/,/g, '、').replace(/\n/g, ' ') : '';

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        
        // 衛星通信を想定した超軽量CSVテキスト圧縮 (7項目目にメッセージを追加)
        const payload = `${userId},${userName},${statusCode},${lat},${lng},${Date.now()},${cleanMsg}`;
        
        await addToQueue(payload);
        await updateQueueCount();
        showToast("送信キューに保存しました");
        if (['ST02', 'ST03', 'ST04', 'ST05'].includes(statusCode)) {
          const uniqueId = `${userId}-${Date.now()}`;
          setMyReports(prev => [...prev, { id: uniqueId, lat: parseFloat(lat), lng: parseFloat(lng), statusCode, userName }]);
        } else if (statusCode === 'ST06') {
          // 捜索終了時は、各捜索班の安全共通情報である「危険箇所(ST05)」の紫ピンのみを残し、他をクリアする
          setMyReports(prev => prev.filter(r => r.statusCode === 'ST05'));
        }
        if (includeMessage) {
          setMessageText(''); // 送信成功後にメッセージ欄をクリア
        }
        triggerSync();
      },
      async (err) => {
        console.warn("Geolocation fallback: saving with last known coordinates", err);
        const lat = currentPosition ? currentPosition.lat.toFixed(5) : "0.00000";
        const lng = currentPosition ? currentPosition.lng.toFixed(5) : "0.00000";
        
        const payload = `${userId},${userName},${statusCode},${lat},${lng},${Date.now()},${cleanMsg}`;
        await addToQueue(payload);
        await updateQueueCount();
        showToast("GPS取得タイムアウト。一時保存。");
        if (['ST02', 'ST03', 'ST04', 'ST05'].includes(statusCode)) {
          const uniqueId = `${userId}-${Date.now()}`;
          setMyReports(prev => [...prev, { id: uniqueId, lat: parseFloat(lat), lng: parseFloat(lng), statusCode, userName }]);
        } else if (statusCode === 'ST06') {
          setMyReports(prev => prev.filter(r => r.statusCode === 'ST05'));
        }
        if (includeMessage) {
          setMessageText(''); // クリア
        }
        triggerSync();
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 }
    );
  };

  // プロットマーカーの削除処理 (Firestoreから削除して本部および全団員端末とリアルタイム同期)
  const handleDeleteMyReport = async (markerId) => {
    try {
      await deleteDoc(doc(db, 'search_logs', markerId));
    } catch (e) {
      console.warn("Failed to delete report marker from Firestore:", e);
    }
  };

  // 手動での再送試行処理 (結果の画面通知付き)
  const handleManualRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    showToast("衛星・通信の疎通テスト中...");
    
    try {
      const res = await triggerSync(true);
      if (res && res.success) {
        if (res.count > 0) {
          showToast(`送信成功！(${res.count}件)`);
        } else {
          showToast("送信待ちデータはありません。");
        }
      } else {
        const reason = res?.error || "通信疎通なし (タイムアウト)";
        showToast(`再送未完了: ${reason}`);
      }
    } catch (e) {
      showToast("送信試行完了。データは安全に保護中。");
    } finally {
      setIsRetrying(false);
    }
  };

  // 捜索終了時に、自分の過去のST02〜ST04の報告ピンをFirestoreから削除する
  const clearMyPastReportsFromFirestore = async () => {
    try {
      const q = query(collection(db, 'search_logs'));
      const querySnapshot = await getDocs(q);
      const deletePromises = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.payload) return;
        const parts = data.payload.split(',');
        if (parts.length < 3) return;
        const [uId, , statusCode] = parts;
        
        // 自分のIDであり、かつST02, ST03, ST04 のピンであれば削除 (危険箇所 ST05 は保護して残す)
        if (uId === userId && ['ST02', 'ST03', 'ST04'].includes(statusCode)) {
          deletePromises.push(deleteDoc(doc(db, 'search_logs', docSnap.id)));
        }
      });
      await Promise.all(deletePromises);
    } catch (e) {
      console.error("Failed to clear past reports from Firestore:", e);
    }
  };

  // 巨大報告ボタン押下時の処理
  const handleReport = (template) => {
    unlockAudio(); // 音声をアンロック
    if (!userName) {
      alert("所属記入欄に捜索班又は分団名を入力してください。");
      return;
    }

    // 捜索開始前または終了後の非アクティブ状態で、各報告ボタン(ST02〜ST05)が押された場合はブロックする
    if (template.code !== 'ST01' && template.code !== 'ST06' && !isSearching) {
      alert("捜索開始ボタンを押してから報告してください。");
      return;
    }

    // 捜索状態の制御、およびローカルマーカーの同期的（即座の）クリア
    if (template.code === 'ST01') {
      if (!isSearching) {
        setIsSearching(true);
      }
      // 最新のセッション開始時刻を保存
      localStorage.setItem('search_session_start_time', Date.now().toString());
      
      // ローカル軌跡履歴をリセットして再スタート
      setMyPath([]);
      localStorage.removeItem('search_my_path');
      
      // 再び活動開始（捜索開始）した際にも、念のため過去の危険ピン以外のローカルログを確実に一掃する
      setMyReports(prev => prev.filter(r => r.statusCode === 'ST05'));
    } else if (template.code === 'ST06') {
      setIsSearching(false);
      // 捜索終了ボタンが押された瞬間に、非同期のGPS取得を待たず即座に危険箇所(ST05)以外のピンをクリアする
      setMyReports(prev => prev.filter(r => r.statusCode === 'ST05'));
      
      // 自分のローカル軌跡をリセット
      setMyPath([]);
      localStorage.removeItem('search_my_path');
      
      clearMyPastReportsFromFirestore(); // 過去のピン(ST02〜ST04)をFirestoreからも自動一括クリア
      
      // 指示履歴をIndexedDBから消去して画面表示を更新
      clearMessages().then(() => {
        if (loadLocalMessages) loadLocalMessages();
      }).catch(e => console.warn("Failed to clear messages:", e));
    }

    // 初回・または通常の個別ステータス送信 (手動タップのため includeMessage=true)
    sendPayload(template.code, true);
  };

  return (
    <div 
      onClick={unlockAudio}
      onTouchStart={unlockAudio}
      className="flex flex-col h-[100dvh] w-full bg-gray-950 text-white overflow-hidden"
    >
      {/* 警告モーダル */}
      <NotificationManager 
        activeAlert={activeAlert} 
        onClear={() => {
          setActiveAlert(null);
          // 再ロード
          window.location.reload();
        }} 
      />

      {/* ヘッダー情報 */}
      <header className="p-4 bg-gray-900 border-b border-gray-800 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            {onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="p-2 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-xl transition-all text-gray-400 hover:text-white"
                title="選択画面に戻る"
              >
                <LogOut size={16} className="rotate-180 text-rescue-500" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-black tracking-tighter text-rescue-500">山岳捜索サポーター</h1>
              <p className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Search Omura Corps</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 通信ステータスインジケータ (オンライン / 衛星接続中 / 圏外) */}
            {networkStatus === 'online' && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-950 text-blue-400 border border-blue-500/30">
                <Wifi size={10} />
                オンライン
              </div>
            )}
            {networkStatus === 'satellite' && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                <Smartphone size={10} />
                衛星接続中
              </div>
            )}
            {networkStatus === 'offline' && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-red-950 text-red-400 border border-red-500/30 animate-pulse">
                <WifiOff size={10} />
                圏外 (オフライン)
              </div>
            )}
            
            {/* 団員ID */}
            <div className="text-[11px] font-mono font-bold px-2 py-1 bg-gray-800 rounded text-gray-300">
              ID: {userId}
            </div>
          </div>
        </div>

        {/* 団員名入力 */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold whitespace-nowrap">所属記入:</span>
          <input 
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="捜索班又は分団名　例：1班または15分団"
            className="flex-1 text-sm bg-gray-950 border border-gray-800 rounded-lg px-3 py-1 font-bold focus:outline-none focus:border-rescue-500 text-white"
          />
        </div>

        {/* 本部への伝達事項 (残り日本語文字数表示＆送信ボタン付き) */}
        <div className="mt-2.5 relative flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold whitespace-nowrap">伝達事項:</span>
          <div className={`flex-1 flex items-center gap-1.5 bg-gray-950 border rounded-lg pl-3 pr-2 py-1 ${isSearching ? 'border-gray-800 focus-within:border-rescue-500' : 'border-gray-900 opacity-60'}`}>
            <input 
              type="text"
              value={messageText}
              disabled={!isSearching}
              onChange={(e) => {
                const val = e.target.value;
                if (getByteLength(val) <= 90) {
                  setMessageText(val);
                }
              }}
              placeholder={isSearching ? "伝達テキスト (任意)　例:倒木あり通行不可" : "捜索開始後に伝達事項を送信できます"}
              className="flex-1 text-sm bg-transparent border-none outline-none text-white font-bold disabled:cursor-not-allowed disabled:text-gray-650"
            />
            {isSearching && (
              <span className={`text-[9px] font-mono font-bold shrink-0 ${Math.floor((90 - getByteLength(messageText)) / 3) <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                残り {Math.floor((90 - getByteLength(messageText)) / 3)}文字
              </span>
            )}
            <button
              type="button"
              disabled={!isSearching || !messageText.trim()}
              onClick={() => {
                if (!messageText.trim()) return;
                // 捜索中のみ送信可能（isSearchingは常にtrue）
                sendPayload('ST01', true);
              }}
              className="p-1.5 bg-rescue-500 hover:bg-rescue-600 active:scale-95 text-white rounded-md transition-all shadow-md shrink-0 flex items-center justify-center cursor-pointer disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
              title="伝達事項を即時送信"
            >
              <Send size={12} />
            </button>
          </div>
        </div>
      </header>

      {/* メメインコンテンツエリア */}
      <main className="flex-1 relative overflow-hidden">
        
        {/* トースト表示 */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-rescue-600 text-white text-xs font-black px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
            <RefreshCw size={12} className="animate-spin" /> {toastMessage}
          </div>
        )}

        {/* タブ1: 活動報告 */}
        {activeTab === 'report' && (
          <div className="h-full p-3 grid grid-cols-2 gap-2.5 overflow-y-auto">
            {REPORT_TEMPLATES.map((tmpl) => {
              let displayText = tmpl.text;
              let displayColor = tmpl.color;
              let isSubmittingText = `TAP TO SEND (${tmpl.code})`;

              if (tmpl.code === 'ST01') {
                if (isSearching) {
                  displayText = '現在地報告(ボタンを押して下さい)';
                  // 点滅アニメーション animate-pulse を付与し、かつアクティブ状態のボーダーを設定
                  displayColor = 'bg-blue-600 animate-pulse border-2 border-white shadow-[0_0_15px_rgba(37,99,235,0.7)]';
                  isSubmittingText = 'TAP TO REPORT';
                }
              }

              return (
                <button
                  key={tmpl.code}
                  onClick={() => handleReport(tmpl)}
                  className={`${displayColor} btn-active-scale rounded-xl flex flex-col justify-center items-center py-4 px-2 text-center shadow-lg transition-transform`}
                >
                  <span className="text-base sm:text-lg font-black leading-tight">{displayText}</span>
                  <span className="text-[9px] opacity-60 font-mono mt-0.5 uppercase">{isSubmittingText}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* タブ2: オフライン地図 */}
        {activeTab === 'map' && (() => {
          // 他班の軌跡(memberTracks)に、自分自身のローカル歩行軌跡(myPath)を合成
          const mergedMemberTracks = [...memberTracks];
          if (isSearching && myPath.length > 0) {
            const myTrackIndex = mergedMemberTracks.findIndex(t => t.userId === userId);
            const myTrackData = {
              userId,
              userName: userName || '自分',
              points: myPath
            };
            if (myTrackIndex > -1) {
              mergedMemberTracks[myTrackIndex] = myTrackData;
            } else {
              mergedMemberTracks.push(myTrackData);
            }
          }

          return (
            <div className="w-full h-full">
              <OfflineMap 
                currentPosition={currentPosition} 
                memberTracks={mergedMemberTracks} 
                reportMarkers={sharedDangerMarkers} 
                onDeleteMarker={handleDeleteMyReport} 
              />
            </div>
          );
        })()}

        {/* タブ3: 指示・着信履歴 */}
        {activeTab === 'messages' && (() => {
          const sessionStartTime = parseInt(localStorage.getItem('search_session_start_time') || '0');
          // 捜索中であり、かつ最新セッション開始時刻以降のメッセージのみに絞り込む
          const activeMsgs = isSearching
            ? messagesList.filter(msg => msg.timestamp >= sessionStartTime)
            : [];

          return (
            <div className="h-full p-4 overflow-y-auto space-y-3">
              <h2 className="text-xs font-black text-gray-500 tracking-wider uppercase mb-2">本部指令履歴</h2>
              {activeMsgs.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  <Mail size={36} className="mx-auto mb-2 opacity-35" />
                  <p className="text-xs">受信履歴はありません</p>
                </div>
              ) : (
                activeMsgs.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`p-4 rounded-xl border flex gap-3 ${msg.read ? 'bg-gray-900/40 border-gray-800/80 text-gray-400' : 'bg-red-950/20 border-red-900/50 text-white'}`}
                  >
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-black">{msg.text}</p>
                      <p className="text-[9px] font-mono opacity-50">
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {!msg.read && (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 self-center animate-pulse" />
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })()}

        {/* タブ4: 送信ステータス */}
        {activeTab === 'queue' && (
          <div className="h-full p-4 overflow-y-auto space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-gray-500 tracking-wider uppercase">送信保留データ</h2>
              <button 
                onClick={handleManualRetry}
                disabled={isRetrying}
                className="py-1.5 px-3 bg-rescue-500 hover:bg-rescue-600 disabled:opacity-50 active:scale-95 text-white text-[10px] font-black rounded-lg transition-all flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw size={12} className={isRetrying ? "animate-spin" : ""} />
                {isRetrying ? "通信試行中..." : "手動再試行"}
              </button>
            </div>
            
            {queueCount === 0 ? (
              <div className="bg-emerald-950/20 border border-emerald-900/40 p-6 rounded-2xl text-center space-y-2">
                <CheckCircle size={32} className="text-emerald-500 mx-auto" />
                <h3 className="text-sm font-black text-emerald-400">保留データなし</h3>
                <p className="text-[10px] text-gray-500">すべての活動報告が正常に送信されました。</p>
              </div>
            ) : (
              <div className="bg-yellow-950/20 border border-yellow-900/40 p-6 rounded-2xl text-center space-y-3">
                <AlertTriangle size={32} className="text-yellow-500 mx-auto animate-pulse" />
                <div>
                  <h3 className="text-sm font-black text-yellow-400">{queueCount} 件の送信待ちデータ</h3>
                  <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                    端末が完全圏外、または通信の疎通が確認できていません。<br/>
                    通信が疎通し次第、データは全自動で安全に送信されます。
                  </p>
                </div>

                <div className="text-[9px] text-gray-400 bg-gray-900/80 p-3 rounded-xl border border-gray-800 text-left font-medium leading-relaxed space-y-1">
                  <span className="text-white font-bold block">💡 衛星接続アイコン（アンテナ表示）について:</span>
                  <p>
                    スマートフォンの画面上に衛星マークが表示されていても、電波が微弱な場合や緊急通報（SOS）専用接続の場合は、アプリからのデータ通信パケットが届かないことがあります。
                  </p>
                  <p className="text-rescue-400 font-bold">
                    ※通信が通らない間も、入力した報告データはスマホ内に安全に自動保護されており、消えることはありません。
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* フッターナビゲーション */}
      <footer className="bg-gray-900 border-t border-gray-800 grid grid-cols-4 text-center z-10">
        <button 
          onClick={() => setActiveTab('report')}
          className={`py-4 flex flex-col items-center gap-1 font-black transition-all ${activeTab === 'report' ? 'text-rescue-500 bg-gray-950' : 'text-gray-400'}`}
        >
          <Play size={18} />
          <span className="text-[9px]">活動報告</span>
        </button>
        <button 
          onClick={() => setActiveTab('map')}
          className={`py-4 flex flex-col items-center gap-1 font-black transition-all ${activeTab === 'map' ? 'text-rescue-500 bg-gray-950' : 'text-gray-400'}`}
        >
          <MapPin size={18} />
          <span className="text-[9px]">地図</span>
        </button>
        <button 
          onClick={() => setActiveTab('messages')}
          className={`py-4 flex flex-col items-center gap-1 font-black transition-all relative ${activeTab === 'messages' ? 'text-rescue-500 bg-gray-950' : 'text-gray-400'}`}
        >
          <Mail size={18} />
          <span className="text-[9px]">指示履歴</span>
          {messagesList.some(m => !m.read) && (
            <span className="absolute top-3 right-8 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('queue')}
          className={`py-4 flex flex-col items-center gap-1 font-black transition-all relative ${activeTab === 'queue' ? 'text-rescue-500 bg-gray-950' : 'text-gray-400'}`}
        >
          <Send size={18} />
          <span className="text-[9px]">送信待ち</span>
          {queueCount > 0 && (
            <span className="absolute top-2 right-6 px-1.5 py-0.5 rounded-full bg-rescue-500 text-white text-[8px] font-bold">
              {queueCount}
            </span>
          )}
        </button>
      </footer>
    </div>
  );
}
