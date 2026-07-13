import React, { useState, useEffect, useRef } from 'react';
import { Users, Send, LayoutDashboard, MessageSquare, RefreshCw, Radio, LogOut, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import OfflineMap from '../components/OfflineMap';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STATUS_MAP = {
  'ST01': { text: '捜索中', color: 'text-white bg-blue-600 border border-blue-500' },
  'ST02': { text: '異状なし', color: 'text-white bg-emerald-600 border border-emerald-500' },
  'ST03': { text: '要救助者発見', color: 'text-black bg-yellow-400 border border-yellow-500 font-extrabold' },
  'ST04': { text: '救助要請', color: 'text-white bg-red-600 border border-red-500 animate-pulse font-extrabold shadow-[0_0_10px_rgba(239,68,68,0.5)]' },
  'ST05': { text: '危険箇所', color: 'text-white bg-purple-600 border border-purple-500' },
  'ST06': { text: '下山開始', color: 'text-white bg-gray-600 border border-gray-500' }
};

export default function AdminView({ onGoBack }) {
  const [logs, setLogs] = useState([]);
  const [memberTracks, setMemberTracks] = useState([]);
  const [membersInfo, setMembersInfo] = useState({});
  const [instructionText, setInstructionText] = useState('');
  const [targetMember, setTargetMember] = useState('all'); // 'all' or userId
  const [statusMessage, setStatusMessage] = useState('');
  const [activeTab, setActiveTab] = useState('map'); // 'map', 'control', 'logs' (mobile responsive tabs)
  const [activeMessageAlert, setActiveMessageAlert] = useState(null); // 新着メッセージポップアップ
  const [isLogsMinimized, setIsLogsMinimized] = useState(false); // 受信生ログ履歴の最小化状態
  const [reportMarkers, setReportMarkers] = useState([]); // 報告されたマーカー(要救助者発見、危険箇所など)

  const monitorStartTime = useRef(Date.now());
  const isLoadedRef = useRef(false);

  // 音声自動再生の制限解除 (ユーザーの最初のアクション時)
  const unlockAudio = () => {
    if (window.sharedAudioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      // iOSブロック解除用無音再生
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      window.sharedAudioCtx = ctx;
      console.log("Admin Audio context unlocked.");
    } catch (e) {
      console.error("Failed to unlock admin audio:", e);
    }
  };

  // 新着報告時の通知チャイム (ピッピッ音)
  const playNotificationSound = () => {
    try {
      let ctx = window.sharedAudioCtx;
      if (!ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioContext();
        window.sharedAudioCtx = ctx;
      }
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const now = ctx.currentTime;
      
      // 1音目: 880Hz (ラ)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.1);
      
      // 2音目: 1046.5Hz (ド)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now + 0.12);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.25);
    } catch (e) {
      console.error("Failed to play notify sound:", e);
    }
  };

  // 新着報告時のスマホバイブレーション
  const triggerVibration = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([150, 100, 150]); // 短い2連振動
    }
  };

  // メッセージ付新着報告時の特別なアラート音 (ポーン・ポーン音)
  const playAlertSound = () => {
    try {
      let ctx = window.sharedAudioCtx;
      if (!ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioContext();
        window.sharedAudioCtx = ctx;
      }
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      
      // 1音目: 1174.66Hz (D6 / レ)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1174.66, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);
      
      // 2音目: 1174.66Hz (D6 / レ) - 少し間隔を空けて余韻を持たせる
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now + 0.35);
      gain2.gain.setValueAtTime(0.4, now + 0.35);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.35);
      osc2.stop(now + 0.75);
    } catch (e) {
      console.error("Failed to play alert sound:", e);
    }
  };

  // UTF-8のバイト数を計算するヘルパー
  const getByteLength = (str) => {
    return new TextEncoder().encode(str).length;
  };

  // 1. Firebaseのログ受信監視 (リアルタイムデコード)
  useEffect(() => {
    const q = query(collection(db, 'search_logs'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const parsedLogs = [];
      const tracksMap = {};
      const latestMembers = {};

      // 新着変更を検知して通知 (初期読み込み完了後かつ起動時刻より新しい場合にトリガー)
      if (isLoadedRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            if (!data.payload) return;
            const parts = data.payload.split(',');
            if (parts.length >= 6) {
              const ts = parseInt(parts[5]);
              if (ts && ts > monitorStartTime.current) {
                const message = parts[6] || '';
                const uName = parts[1] || '団員';
                
                // メッセージがある場合は特別なアラート音＋ポップアップ表示
                if (message) {
                  playAlertSound();
                  setActiveMessageAlert({
                    id: change.doc.id,
                    userName: uName,
                    text: message,
                    timestamp: Date.now()
                  });
                } else {
                  playNotificationSound();
                }
                triggerVibration();
              }
            }
          }
        });
      }

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!data.payload) return;

        // CSV形式をデコード (例: userId,userName,statusCode,lat,lng,timestamp,messageText)
        const parts = data.payload.split(',');
        if (parts.length < 5) return;

        const [userId, userName, statusCode, latStr, lngStr, tsStr, messageText] = parts;
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        const timestamp = parseInt(tsStr) || Date.now();
        const message = messageText || '';

        const logEntry = {
          id: doc.id,
          userId,
          userName,
          statusCode,
          lat,
          lng,
          timestamp,
          message
        };
        parsedLogs.push(logEntry);

        // 軌跡の追加
        if (!tracksMap[userId]) {
          tracksMap[userId] = {
            userId,
            userName,
            points: []
          };
        }
        tracksMap[userId].points.push({ lat, lng, timestamp });

        // 最新のステータスと位置情報を上書き保持
        latestMembers[userId] = {
          userId,
          userName,
          statusCode,
          lat,
          lng,
          lastSync: timestamp,
          message
        };
      });

      setLogs(parsedLogs.reverse()); // 画面表示用は最新が上
      
      // 軌跡および赤い名前ラベルも、現在アクティブな団員（下山開始「ST06」や30分以上通信途絶していない人）のみに絞り込む
      const activeTracks = Object.values(tracksMap).filter(track => {
        const info = latestMembers[track.userId];
        if (!info) return false;
        if (info.statusCode === 'ST06') return false;
        const isTimeout = (Date.now() - info.lastSync) > 30 * 60 * 1000;
        if (isTimeout) return false;
        return true;
      });

      // マーカー (要救助者発見、危険箇所など) も、現在アクティブ（捜索終了 ST06 しておらず、かつ30分以内に通信同期がある）団員の報告のみに絞り込む
      const activeUserIds = new Set(
        Object.values(latestMembers)
          .filter(m => {
            if (m.statusCode === 'ST06') return false;
            const isTimeout = (Date.now() - m.lastSync) > 30 * 60 * 1000;
            if (isTimeout) return false;
            return true;
          })
          .map(m => m.userId)
      );

      // 各ユーザーの最新の「捜索開始 (ST01)」のタイムスタンプを取得 (過去セッションのゴミデータ混入防止)
      const userSessionStartTimes = {};
      parsedLogs.forEach(log => {
        if (log.statusCode === 'ST01') {
          // parsedLogsは時系列順(昇順)なので、ループの最後が最新の捜索開始時刻になる
          userSessionStartTimes[log.userId] = log.timestamp;
        }
      });

      const activeMarkers = parsedLogs.filter(log => {
        const isReportStatus = ['ST02', 'ST03', 'ST04', 'ST05'].includes(log.statusCode);
        const isActive = activeUserIds.has(log.userId);
        if (!isReportStatus || !isActive) return false;

        const sessionStartTime = userSessionStartTimes[log.userId] || 0;
        return log.timestamp >= sessionStartTime;
      });

      setReportMarkers(activeMarkers);
      setMemberTracks(activeTracks);
      setMembersInfo(latestMembers);
      
      // 初回の全読み込み完了を記録
      isLoadedRef.current = true;
    });

    return () => unsubscribe();
  }, []);

  // 2. 本部指示の送信
  const handleSendInstruction = async (e) => {
    e.preventDefault();
    if (!instructionText.trim()) return;

    setStatusMessage('送信中...');
    try {
      await addDoc(collection(db, 'instructions'), {
        text: instructionText,
        target: targetMember,
        timestamp: serverTimestamp()
      });
      setInstructionText('');
      setStatusMessage('指示を送信しました（団員の端末で強アラームが作動します）');
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (error) {
      console.error("Failed to send instruction:", error);
      setStatusMessage('送信失敗。ネットワーク環境を確認してください。');
    }
  };

  // 受信CSV生ログ履歴の一括削除
  const handleClearSearchLogs = async () => {
    if (!window.confirm("本当に「すべての受信CSV生ログ履歴」を削除しますか？\n（現場の団員の端末の地図上からも軌跡・現在地表示が一度消去されます。この操作は取り消せません）")) {
      return;
    }
    
    setStatusMessage('生ログ削除中...');
    try {
      const q = query(collection(db, 'search_logs'));
      const querySnapshot = await getDocs(q);
      const deletePromises = [];
      querySnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, 'search_logs', document.id)));
      });
      await Promise.all(deletePromises);
      setStatusMessage('生ログ履歴をすべて削除しました');
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (error) {
      console.error("Failed to clear search logs:", error);
      setStatusMessage('生ログの削除に失敗しました。');
    }
  };

  // 本部指令履歴の一括削除
  const handleClearInstructions = async () => {
    if (!window.confirm("本当に「すべての本部指令履歴」を削除しますか？\n（団員の端末に届いている指示履歴リストもすべて消去されます。この操作は取り消せません）")) {
      return;
    }
    
    setStatusMessage('指令履歴削除中...');
    try {
      const q = query(collection(db, 'instructions'));
      const querySnapshot = await getDocs(q);
      const deletePromises = [];
      querySnapshot.forEach((document) => {
        deletePromises.push(deleteDoc(doc(db, 'instructions', document.id)));
      });
      await Promise.all(deletePromises);
      setStatusMessage('指令履歴をすべて削除しました');
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (error) {
      console.error("Failed to clear instructions:", error);
      setStatusMessage('指令履歴の削除に失敗しました。');
    }
  };

  return (
    <div 
      onClick={unlockAudio}
      onTouchStart={unlockAudio}
      className="flex flex-col md:flex-row h-[100dvh] w-full bg-gray-950 text-white overflow-hidden relative"
    >
      
      {/* 新着緊急伝達ポップアップアラート (中央配置) */}
      {/* 新着緊急伝達ポップアップアラート (スマホ対応サイズ) */}
      {activeMessageAlert && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-orange-600 border-2 border-white text-white p-3.5 rounded-xl shadow-2xl max-w-[280px] sm:max-w-xs w-11/12 animate-pulse">
          <div className="flex items-center gap-2 mb-1.5 border-b border-orange-500 pb-1.5">
            <Radio size={14} className="text-white shrink-0" />
            <div>
              <span className="text-[8px] font-mono font-bold tracking-widest bg-black/30 px-1.5 py-0.5 rounded-full uppercase">新着メッセージ</span>
              <p className="text-[10px] font-black mt-0.5">送信者: {activeMessageAlert.userName}</p>
            </div>
          </div>
          <p className="text-xs font-black tracking-tight leading-normal break-all">{activeMessageAlert.text}</p>
          <button
            type="button"
            onClick={() => setActiveMessageAlert(null)}
            className="w-full mt-2.5 py-1 bg-black/60 hover:bg-black active:scale-95 text-[10px] font-black rounded-lg transition-all border border-gray-800"
          >
            確認して閉じる
          </button>
        </div>
      )}
      
      {/* モバイル用タブヘッダー (PCでは非表示) */}
      <div className="md:hidden flex items-center bg-gray-900 border-b border-gray-800 z-30 px-2 w-full">
        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="p-3 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-xl text-gray-400 mr-1"
            title="選択画面に戻る"
          >
            <LogOut size={16} className="rotate-180 text-rescue-500" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-4 text-sm font-black tracking-wider transition-all border-b-2 ${activeTab === 'map' ? 'text-rescue-500 border-rescue-500 bg-gray-950' : 'text-gray-300 border-transparent'}`}
        >
          地図モニター
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('control')}
          className={`flex-1 py-4 text-sm font-black tracking-wider transition-all border-b-2 ${activeTab === 'control' ? 'text-rescue-500 border-rescue-500 bg-gray-950' : 'text-gray-300 border-transparent'}`}
        >
          団員・指示 ({Object.values(membersInfo).filter(m => m.statusCode !== 'ST06' && (Date.now() - m.lastSync) <= 30 * 60 * 1000).length}名)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`flex-1 py-4 text-sm font-black tracking-wider transition-all border-b-2 ${activeTab === 'logs' ? 'text-rescue-500 border-rescue-500 bg-gray-950' : 'text-gray-300 border-transparent'}`}
        >
          生ログ履歴
        </button>
      </div>

      {/* サイドバー（ステータス＆コントロール） */}
      <aside className={`${activeTab === 'control' ? 'flex' : 'hidden'} md:flex md:w-80 w-full bg-gray-900 border-r border-gray-800 flex-col z-20 shadow-2xl flex-1 md:h-full overflow-hidden`}>
        {/* ヘッダー */}
        <div className="hidden md:block p-6 border-b border-gray-800">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rescue-500 rounded-xl flex items-center justify-center shadow-lg shadow-rescue-500/20">
                <LayoutDashboard size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tighter text-white">本部指令システム</h1>
                <p className="text-xs text-rescue-500 font-mono tracking-widest uppercase font-bold">Search Control Center</p>
              </div>
            </div>
            {onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="p-2.5 bg-gray-800 hover:bg-gray-700 active:scale-95 rounded-xl transition-all text-gray-400 hover:text-white"
                title="選択画面に戻る"
              >
                <LogOut size={16} className="rotate-180 text-rescue-500" />
              </button>
            )}
          </div>
        </div>

        {/* 団員一覧ステータス */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-sm font-black text-gray-200 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={14} /> 捜索中の班(分団)
            </h2>
            <span className="bg-rescue-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
              {Object.values(membersInfo).filter(m => m.statusCode !== 'ST06' && (Date.now() - m.lastSync) <= 30 * 60 * 1000).length}班
            </span>
          </div>

          <div className="space-y-2">
            {Object.values(membersInfo).filter(member => {
              // 1. 「下山開始 (ST06)」を押した団員は除外
              if (member.statusCode === 'ST06') return false;
              // 2. 最終同期から30分以上経過している団員も非アクティブとして除外
              const isTimeout = (Date.now() - member.lastSync) > 30 * 60 * 1000;
              if (isTimeout) return false;
              return true;
            }).length === 0 ? (
              <p className="text-center py-8 text-gray-600 text-xs font-bold">捜索中の班(分団)はありません</p>
            ) : (
              Object.values(membersInfo)
                .filter(member => {
                  if (member.statusCode === 'ST06') return false;
                  return (Date.now() - member.lastSync) <= 30 * 60 * 1000;
                })
                .map(member => {
                  const status = STATUS_MAP[member.statusCode] || { text: '不明', color: 'text-gray-400 bg-gray-500/10' };
                  return (
                    <div key={member.userId} className="bg-gray-950/70 border border-gray-800 p-4 rounded-xl space-y-3 shadow-lg">
                      <div className="flex justify-between items-center border-b-2 border-gray-800 pb-2.5">
                        <p className="text-lg font-black text-white">{member.userName}</p>
                        <span className={`text-sm font-black px-3.5 py-1.5 rounded-xl shadow-md border-2 ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      
                      {/* メッセージ表示 */}
                      {member.message && (
                        <div className="bg-orange-950/20 border border-orange-900/50 p-2.5 rounded-lg flex items-start gap-2 text-xs">
                          <MessageSquare size={14} className="text-orange-400 shrink-0 mt-0.5 animate-bounce" />
                          <div>
                            <span className="text-[9px] font-black text-orange-400 block mb-0.5">現場伝達:</span>
                            <p className="text-white font-black leading-relaxed">{member.message}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* 高視認性の位置情報＆時間データ */}
                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-bold">緯度経度:</span>
                          <span className="text-yellow-400 font-black tracking-wider text-sm">{member.lat.toFixed(5)}, {member.lng.toFixed(5)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-bold">受信時刻:</span>
                          <span className="text-white font-black text-sm">{new Date(member.lastSync).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-[10px] text-gray-500 text-right font-bold mt-1">
                          ID: {member.userId}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* 指令送信フォーム */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/40">
          <h2 className="text-sm font-black text-rescue-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <MessageSquare size={14} /> 指示・警告の送信
          </h2>
          
          <form onSubmit={handleSendInstruction} className="space-y-3">
            <div>
              <label className="text-xs font-black text-gray-200 block mb-1">宛先</label>
              <select 
                value={targetMember}
                onChange={(e) => setTargetMember(e.target.value)}
                className="w-full bg-gray-900 border-2 border-gray-800 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-rescue-500 text-white font-black"
              >
                <option value="all">全員 (全体指示)</option>
                {Object.values(membersInfo)
                  .filter(m => {
                    if (m.statusCode === 'ST06') return false;
                    const isTimeout = (Date.now() - m.lastSync) > 30 * 60 * 1000;
                    if (isTimeout) return false;
                    return true;
                  })
                  .map(m => (
                    <option key={m.userId} value={m.userId}>{m.userName} ({m.userId})</option>
                  ))
                }
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-black text-gray-200 block">指示内容 (テキスト)</label>
                <span className={`text-[9px] font-mono font-bold ${Math.floor((90 - getByteLength(instructionText)) / 3) <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                  残り {Math.floor((90 - getByteLength(instructionText)) / 3)}文字
                </span>
              </div>
              <textarea
                value={instructionText}
                onChange={(e) => {
                  const val = e.target.value;
                  if (getByteLength(val) <= 90) {
                    setInstructionText(val);
                  }
                }}
                placeholder="その場で待機せよ、等"
                className="w-full h-16 bg-gray-900 border-2 border-gray-800 rounded-lg p-2 text-sm focus:outline-none focus:border-rescue-500 text-white font-black resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rescue-500 hover:bg-rescue-600 active:scale-95 text-white text-sm font-black rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg"
            >
              <Send size={14} /> 指令を送信
            </button>
            {statusMessage && (
              <p className="text-xs text-center font-black text-yellow-400">{statusMessage}</p>
            )}
          </form>

          <button
            type="button"
            onClick={handleClearInstructions}
            className="w-full py-2 bg-gray-950 hover:bg-red-950/40 text-gray-400 hover:text-red-400 text-xs font-bold rounded-lg transition-all border border-gray-800 hover:border-red-900/50 flex items-center justify-center gap-1 mt-2.5"
            title="すべての本部送信指令を削除"
          >
            <Trash2 size={12} /> 本部指令履歴を一括削除
          </button>
        </div>

      </aside>

      {/* 地図エリア：モバイルでは地図タブ選択時のみ表示 */}
      <main className={`${activeTab === 'map' ? 'block' : 'hidden'} md:block flex-1 relative bg-gray-950 h-full`}>
        <OfflineMap memberTracks={memberTracks} reportMarkers={reportMarkers} />
      </main>

      {/* 受信ログオーバーレイ：モバイルではログタブ選択時にスクロール表示、PCでは右上に絶対配置 */}
      <div className={`${activeTab === 'logs' ? 'flex' : 'hidden'} md:flex md:absolute md:top-6 md:right-6 md:w-80 w-full bg-gray-900/95 md:bg-gray-900/90 border-2 border-gray-800 rounded-2xl p-4 shadow-2xl z-10 overflow-hidden flex-col transition-all duration-300 ${isLogsMinimized ? 'h-[52px] md:h-[52px] max-h-[52px]' : 'max-h-[350px] h-full md:h-auto'}`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
            <Radio size={14} className="text-red-500 animate-pulse" /> 受信CSV生ログ履歴
          </h2>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleClearSearchLogs}
              className="p-1.5 bg-red-950/40 text-red-400 hover:text-red-300 rounded border border-red-900/50 hover:bg-red-900/20 transition-all cursor-pointer"
              title="受信生ログを一括削除"
            >
              <Trash2 size={12} />
            </button>
            <button
              type="button"
              onClick={() => setIsLogsMinimized(!isLogsMinimized)}
              className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-750 hover:border-gray-600 transition-all cursor-pointer flex items-center justify-center"
              title={isLogsMinimized ? "生ログ履歴を展開" : "生ログ履歴を最小化"}
            >
              {isLogsMinimized ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>
            <RefreshCw size={12} className="text-gray-400 hover:text-white cursor-pointer ml-1.5" />
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto space-y-1.5 pr-1 ${isLogsMinimized ? 'hidden' : 'block'}`}>
          {logs.slice(0, 30).map((log) => (
            <div key={log.id} className="p-2.5 bg-black/50 rounded-lg border border-gray-800 font-mono text-xs text-yellow-300">
              <div className="flex justify-between text-[10px] text-gray-200 font-black mb-1 border-b border-gray-900 pb-1">
                <span>{log.userName} ({log.userId})</span>
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="font-bold tracking-tight">
                {`${log.userId},${log.userName},${log.statusCode},${log.lat.toFixed(5)},${log.lng.toFixed(5)}${log.message ? `,${log.message}` : ''}`}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center text-gray-500 py-12 text-xs font-black">受信データなし</p>
          )}
        </div>
      </div>

    </div>
  );
}
