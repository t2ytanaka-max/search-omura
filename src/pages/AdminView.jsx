import React, { useState, useEffect } from 'react';
import { Users, Send, LayoutDashboard, MessageSquare, RefreshCw, Radio, LogOut } from 'lucide-react';
import OfflineMap from '../components/OfflineMap';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
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

  // 1. Firebaseのログ受信監視 (リアルタイムデコード)
  useEffect(() => {
    const q = query(collection(db, 'search_logs'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const parsedLogs = [];
      const tracksMap = {};
      const latestMembers = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!data.payload) return;

        // CSV形式をデコード (例: userId,userName,statusCode,lat,lng,timestamp)
        const parts = data.payload.split(',');
        if (parts.length < 5) return;

        const [userId, userName, statusCode, latStr, lngStr, tsStr] = parts;
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        const timestamp = parseInt(tsStr) || Date.now();

        const logEntry = {
          id: doc.id,
          userId,
          userName,
          statusCode,
          lat,
          lng,
          timestamp
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
          lastSync: timestamp
        };
      });

      setLogs(parsedLogs.reverse()); // 画面表示用は最新が上
      
      // 軌跡および赤い名前ラベルも、現在アクティブな隊員（下山開始「ST06」や30分以上通信途絶していない人）のみに絞り込む
      const activeTracks = Object.values(tracksMap).filter(track => {
        const info = latestMembers[track.userId];
        if (!info) return false;
        if (info.statusCode === 'ST06') return false;
        const isTimeout = (Date.now() - info.lastSync) > 30 * 60 * 1000;
        if (isTimeout) return false;
        return true;
      });

      setMemberTracks(activeTracks);
      setMembersInfo(latestMembers);
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
      setStatusMessage('指示を送信しました（隊員の端末で強アラームが作動します）');
      setTimeout(() => setStatusMessage(''), 4000);
    } catch (error) {
      console.error("Failed to send instruction:", error);
      setStatusMessage('送信失敗。ネットワーク環境を確認してください。');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-gray-950 text-white overflow-hidden">
      
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
          隊員・指示 ({Object.values(membersInfo).filter(m => m.statusCode !== 'ST06' && (Date.now() - m.lastSync) <= 30 * 60 * 1000).length}名)
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

        {/* 隊員一覧ステータス */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-sm font-black text-gray-200 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={14} /> 稼働中の隊員
            </h2>
            <span className="bg-rescue-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
              {Object.values(membersInfo).filter(m => m.statusCode !== 'ST06' && (Date.now() - m.lastSync) <= 30 * 60 * 1000).length}名
            </span>
          </div>

          <div className="space-y-2">
            {Object.values(membersInfo).filter(member => {
              // 1. 「下山開始 (ST06)」を押した隊員は除外
              if (member.statusCode === 'ST06') return false;
              // 2. 最終同期から30分以上経過している隊員も非アクティブとして除外
              const isTimeout = (Date.now() - member.lastSync) > 30 * 60 * 1000;
              if (isTimeout) return false;
              return true;
            }).length === 0 ? (
              <p className="text-center py-8 text-gray-600 text-xs font-bold">稼働中の隊員はいません</p>
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
                {Object.values(membersInfo).map(m => (
                  <option key={m.userId} value={m.userId}>{m.userName} ({m.userId})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-black text-gray-200 block mb-1">指示内容 (テキスト)</label>
              <textarea
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
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
        </div>

      </aside>

      {/* 地図エリア：モバイルでは地図タブ選択時のみ表示 */}
      <main className={`${activeTab === 'map' ? 'block' : 'hidden'} md:block flex-1 relative bg-gray-950 h-full`}>
        <OfflineMap memberTracks={memberTracks} />
      </main>

      {/* 受信ログオーバーレイ：モバイルではログタブ選択時にスクロール表示、PCでは右上に絶対配置 */}
      <div className={`${activeTab === 'logs' ? 'flex' : 'hidden'} md:flex md:absolute md:top-6 md:right-6 md:w-80 w-full bg-gray-900/95 md:bg-gray-900/90 border-2 border-gray-800 rounded-2xl p-4 shadow-2xl z-10 max-h-[350px] md:max-h-[350px] h-full md:h-auto overflow-hidden flex-col`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5">
            <Radio size={14} className="text-red-500 animate-pulse" /> 受信CSV生ログ履歴
          </h2>
          <RefreshCw size={12} className="text-gray-400 hover:text-white cursor-pointer" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {logs.slice(0, 30).map((log) => (
            <div key={log.id} className="p-2.5 bg-black/50 rounded-lg border border-gray-800 font-mono text-xs text-yellow-300">
              <div className="flex justify-between text-[10px] text-gray-200 font-black mb-1 border-b border-gray-900 pb-1">
                <span>{log.userName} ({log.userId})</span>
                <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <div className="font-bold tracking-tight">{`${log.userId},${log.userName},${log.statusCode},${log.lat.toFixed(5)},${log.lng.toFixed(5)}`}</div>
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
