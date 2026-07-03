import React, { useState, useEffect } from 'react';
import { Play, MapPin, Send, Mail, CheckCircle, AlertTriangle, Moon, RefreshCw, Smartphone } from 'lucide-react';
import OfflineMap from '../components/OfflineMap';
import NotificationManager from '../components/NotificationManager';
import { useSyncQueue } from '../hooks/useSyncQueue';
import { addToQueue, getQueue } from '../lib/db';

const REPORT_TEMPLATES = [
  { code: 'ST01', text: '捜索中（定期連絡）', color: 'bg-blue-600 active:bg-blue-700' },
  { code: 'ST02', text: '異状なし', color: 'bg-emerald-600 active:bg-emerald-700' },
  { code: 'ST03', text: '要救助者を発見', color: 'bg-yellow-500 active:bg-yellow-600 text-black' },
  { code: 'ST04', text: '救助要請（応援）', color: 'bg-red-600 active:bg-red-700' },
  { code: 'ST05', text: '危険箇所（滑落注意）', color: 'bg-purple-600 active:bg-purple-700' },
  { code: 'ST06', text: '下山開始', color: 'bg-gray-600 active:bg-gray-700' }
];

export default function MemberView() {
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
  const [activeAlert, setActiveAlert] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // 1. 同期・キュー監視カスタムフック
  const {
    isOnline,
    queueCount,
    messagesList,
    updateQueueCount,
    triggerSync
  } = useSyncQueue(userId, () => {
    // 新着指示があった時のコールバック
    const latest = messagesList[0] || { id: 'test', text: '本部からの指示を受信しました。' };
    setActiveAlert(latest);
  });

  // 最新メッセージ受信時に即座にモーダルを表示するための監視
  useEffect(() => {
    const unread = messagesList.find(m => !m.read);
    if (unread) {
      setActiveAlert(unread);
    }
  }, [messagesList]);

  // GPSの常時監視（地図用）
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
      },
      (err) => console.warn("GPS watch error:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    localStorage.setItem('search_member_name', userName);
  }, [userName]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // 巨大報告ボタン押下時の処理
  const handleReport = (template) => {
    if (!userName) {
      alert("先に設定画面、または画面上部で名前を入力してください。");
      return;
    }

    if (!('geolocation' in navigator)) {
      alert("GPS機能が利用できません。");
      return;
    }

    showToast("GPS取得中...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        
        // 衛星通信を想定した超軽量CSVテキスト圧縮（約30文字）
        // [隊員ID],[名前],[ステータスコード],[緯度],[経度],[タイムスタンプ]
        const payload = `${userId},${userName},${template.code},${lat},${lng},${Date.now()}`;
        
        // ローカル送信キューに突っ込む（圏外でも即時永続化）
        await addToQueue(payload);
        await updateQueueCount();
        
        showToast("送信キューに保存しました");
        
        // オンラインなら即座に送信を試みる
        triggerSync();
      },
      async (err) => {
        console.warn("Geolocation fallback: saving with previous coordinates or zero", err);
        // GPS取得に失敗しても「送信待ち」のデータだけは最後の位置情報で保存する
        const lat = currentPosition ? currentPosition.lat.toFixed(5) : "0.00000";
        const lng = currentPosition ? currentPosition.lng.toFixed(5) : "0.00000";
        
        const payload = `${userId},${userName},${template.code},${lat},${lng},${Date.now()}`;
        await addToQueue(payload);
        await updateQueueCount();
        showToast("GPS取得タイムアウト。送信キューに一時保存。");
        triggerSync();
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 5000 }
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-950 text-white overflow-hidden">
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
          <div>
            <h1 className="text-lg font-black tracking-tighter text-rescue-500">山岳捜索サポーター</h1>
            <p className="text-[9px] text-gray-400 font-mono tracking-widest uppercase">Search Omura Corps</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 衛星電波インジケータ */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black ${isOnline ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-red-950 text-red-400 border border-red-500/30 animate-pulse'}`}>
              <Smartphone size={10} />
              {isOnline ? '衛星接続中' : '圏外 (オフライン)'}
            </div>
            
            {/* 隊員ID */}
            <div className="text-[11px] font-mono font-bold px-2 py-1 bg-gray-800 rounded text-gray-300">
              ID: {userId}
            </div>
          </div>
        </div>

        {/* 隊員名入力 */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-gray-400 font-bold whitespace-nowrap">隊員氏名:</span>
          <input 
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="氏名を入力してください"
            className="flex-1 text-sm bg-gray-950 border border-gray-800 rounded-lg px-3 py-1 font-bold focus:outline-none focus:border-rescue-500 text-white"
          />
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
          <div className="h-full p-4 grid grid-cols-2 gap-3 overflow-y-auto">
            {REPORT_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.code}
                onClick={() => handleReport(tmpl)}
                className={`${tmpl.color} btn-active-scale rounded-2xl flex flex-col justify-center items-center p-6 text-center shadow-lg transition-transform`}
              >
                <span className="text-2xl font-black">{tmpl.text}</span>
                <span className="text-[10px] opacity-60 font-mono mt-1 uppercase">TAP TO SEND ({tmpl.code})</span>
              </button>
            ))}
          </div>
        )}

        {/* タブ2: オフライン地図 */}
        {activeTab === 'map' && (
          <div className="w-full h-full">
            <OfflineMap currentPosition={currentPosition} />
          </div>
        )}

        {/* タブ3: 指示・着信履歴 */}
        {activeTab === 'messages' && (
          <div className="h-full p-4 overflow-y-auto space-y-3">
            <h2 className="text-xs font-black text-gray-500 tracking-wider uppercase mb-2">本部指令履歴</h2>
            {messagesList.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Mail size={36} className="mx-auto mb-2 opacity-35" />
                <p className="text-xs">受信履歴はありません</p>
              </div>
            ) : (
              messagesList.map((msg) => (
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
        )}

        {/* タブ4: 送信ステータス */}
        {activeTab === 'queue' && (
          <div className="h-full p-4 overflow-y-auto space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-gray-500 tracking-wider uppercase">送信保留データ</h2>
              <button 
                onClick={triggerSync}
                className="py-1 px-3 bg-gray-800 hover:bg-gray-700 active:scale-95 text-[10px] font-black rounded transition-all flex items-center gap-1"
              >
                <RefreshCw size={10} /> 手動再試行
              </button>
            </div>
            
            {queueCount === 0 ? (
              <div className="bg-emerald-950/20 border border-emerald-900/40 p-6 rounded-2xl text-center space-y-2">
                <CheckCircle size={32} className="text-emerald-500 mx-auto" />
                <h3 className="text-sm font-black text-emerald-400">保留データなし</h3>
                <p className="text-[10px] text-gray-500">すべての活動報告が正常に送信されました。</p>
              </div>
            ) : (
              <div className="bg-yellow-950/20 border border-yellow-900/40 p-6 rounded-2xl text-center space-y-2">
                <AlertTriangle size={32} className="text-yellow-500 mx-auto animate-pulse" />
                <h3 className="text-sm font-black text-yellow-400">{queueCount} 件の送信待ちデータ</h3>
                <p className="text-[10px] text-gray-500">現在圏外です。衛生通信が接続されると自動で再送されます。</p>
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
