import React, { useState, useEffect } from 'react';
import { Users, Send, LayoutDashboard, MessageSquare, RefreshCw, Radio } from 'lucide-react';
import OfflineMap from '../components/OfflineMap';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STATUS_MAP = {
  'ST01': { text: '捜索中', color: 'text-blue-400 bg-blue-500/10' },
  'ST02': { text: '異状なし', color: 'text-emerald-400 bg-emerald-500/10' },
  'ST03': { text: '要救助者発見', color: 'text-yellow-400 bg-yellow-500/10' },
  'ST04': { text: '救助要請', color: 'text-red-400 bg-red-500/10 animate-pulse' },
  'ST05': { text: '危険箇所', color: 'text-purple-400 bg-purple-500/10' },
  'ST06': { text: '下山開始', color: 'text-gray-400 bg-gray-500/10' }
};

export default function AdminView() {
  const [logs, setLogs] = useState([]);
  const [memberTracks, setMemberTracks] = useState([]);
  const [membersInfo, setMembersInfo] = useState({});
  const [instructionText, setInstructionText] = useState('');
  const [targetMember, setTargetMember] = useState('all'); // 'all' or userId
  const [statusMessage, setStatusMessage] = useState('');

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
      setMemberTracks(Object.values(tracksMap));
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
    <div className="flex h-full bg-gray-950 text-white overflow-hidden">
      
      {/* サイドバー（ステータス＆コントロール） */}
      <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col z-20 shadow-2xl">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rescue-500 rounded-xl flex items-center justify-center shadow-lg shadow-rescue-500/20">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter">本部指令システム</h1>
              <p className="text-[9px] text-gray-500 font-mono tracking-widest uppercase">Search Control Center</p>
            </div>
          </div>
        </div>

        {/* 隊員一覧ステータス */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={12} /> 稼働中の隊員
            </h2>
            <span className="bg-rescue-500/20 text-rescue-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-rescue-500/30">
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
                    <div key={member.userId} className="bg-gray-950/50 border border-gray-800 p-3 rounded-xl space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-black text-gray-200">{member.userName} ({member.userId})</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${status.color}`}>
                          {status.text}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                        <span>{member.lat.toFixed(5)}, {member.lng.toFixed(5)}</span>
                        <span>{new Date(member.lastSync).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* 指令送信フォーム */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/40">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
            <MessageSquare size={12} /> 指示・警告の送信
          </h2>
          
          <form onSubmit={handleSendInstruction} className="space-y-3">
            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-1">宛先</label>
              <select 
                value={targetMember}
                onChange={(e) => setTargetMember(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-rescue-500 text-white font-bold"
              >
                <option value="all">全員 (全体指示)</option>
                {Object.values(membersInfo).map(m => (
                  <option key={m.userId} value={m.userId}>{m.userName} ({m.userId})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 font-bold block mb-1">指示内容 (テキスト)</label>
              <textarea
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                placeholder="その場で待機せよ、等"
                className="w-full h-16 bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs focus:outline-none focus:border-rescue-500 text-white font-bold resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-rescue-500 hover:bg-rescue-600 active:scale-95 text-white text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5"
            >
              <Send size={12} /> 指令を送信
            </button>
            {statusMessage && (
              <p className="text-[9px] text-center font-bold text-yellow-400">{statusMessage}</p>
            )}
          </form>
        </div>

      </aside>

      {/* 地図エリア */}
      <main className="flex-1 relative bg-gray-950">
        <OfflineMap memberTracks={memberTracks} />

        {/* 最近の受信ログ一覧（右側オーバーレイ） */}
        <div className="absolute top-6 right-6 w-80 bg-gray-900/90 border border-gray-800 rounded-2xl p-4 shadow-2xl z-10 max-h-[320px] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <Radio size={12} className="text-red-500 animate-pulse" /> 受信CSV生ログ履歴
            </h2>
            <RefreshCw size={12} className="text-gray-500 hover:text-white cursor-pointer" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {logs.slice(0, 30).map((log) => (
              <div key={log.id} className="p-2 bg-black/40 rounded-lg border border-gray-800/50 font-mono text-[9px] text-gray-300">
                <div className="flex justify-between text-[8px] text-gray-500 mb-0.5">
                  <span>{log.userName} ({log.userId})</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <div>{`${log.userId},${log.userName},${log.statusCode},${log.lat.toFixed(5)},${log.lng.toFixed(5)}`}</div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="text-center text-gray-600 py-12 text-[10px]">受信データなし</p>
            )}
          </div>
        </div>

      </main>

    </div>
  );
}
