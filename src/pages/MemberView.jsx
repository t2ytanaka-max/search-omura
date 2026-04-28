import React, { useState, useEffect } from 'react';
import { Play, Square, MapPin, Radio, Video } from 'lucide-react';
import Map from '../components/Map';
import { useTracking } from '../hooks/useTracking';
import { useSync } from '../hooks/useSync';
import LiveView from '../components/LiveView';

export default function MemberView() {
  const [isTracking, setIsTracking] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [userId] = useState(() => {
    let id = localStorage.getItem('userId');
    if (!id) {
      id = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('userId', id);
    }
    return id;
  });
  const [trackId, setTrackId] = useState(null);
  const [showLive, setShowLive] = useState(false);

  const currentPosition = useTracking(isTracking, trackId);
  useSync(isTracking, userId, userName, trackId);

  useEffect(() => {
    localStorage.setItem('userName', userName);
  }, [userName]);

  const handleToggleTracking = () => {
    if (!userName) {
      alert("名前を入力してください。");
      return;
    }

    if (!isTracking) {
      setTrackId('track_' + Date.now());
      setIsTracking(true);
    } else {
      if (window.confirm("捜索を終了し、データを送信しますか？")) {
        setIsTracking(false);
        setTrackId(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Header */}
      <header className="p-4 bg-primary-600 text-white shadow-lg z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black italic tracking-tighter">SEARCH 大村市消防団</h1>
            <p className="text-[10px] opacity-80 font-bold uppercase tracking-widest">Missing Person Search Support</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 ${isTracking ? 'bg-red-500 animate-pulse' : 'bg-primary-800'}`}>
            <Radio size={12} /> {isTracking ? '捜索中' : '待機中'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        <Map currentPosition={currentPosition} />
        
        {/* User Info & Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 space-y-4 pointer-events-none">
          <div className="glass p-4 rounded-2xl shadow-xl pointer-events-auto">
            {!isTracking && (
              <input 
                type="text" 
                placeholder="氏名を入力してください" 
                className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 font-bold text-gray-900 focus:border-primary-500 outline-none transition-all mb-4"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase">現在位置</p>
                <p className="text-sm font-black text-gray-900">
                  {currentPosition ? `${currentPosition.lat.toFixed(5)}, ${currentPosition.lng.toFixed(5)}` : '位置情報取得中...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live View Overlay */}
        {showLive && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm p-4 flex flex-col justify-end">
            <div className="bg-white rounded-3xl p-4 shadow-2xl animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-black flex items-center gap-2"><Video size={20} className="text-blue-600" /> 疑似ライブ配信</h2>
                <button onClick={() => setShowLive(false)} className="text-gray-400 hover:text-gray-600 font-bold">閉じる</button>
              </div>
              <LiveView />
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <footer className="p-6 bg-white border-t border-gray-200 grid grid-cols-2 gap-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <button 
          onClick={handleToggleTracking}
          className={`h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
            isTracking 
            ? 'bg-gray-900 text-white hover:bg-black' 
            : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-500/20'
          }`}
        >
          {isTracking ? <><Square size={24} /> 捜索終了</> : <><Play size={24} /> 捜索開始</>}
        </button>
        
        <button 
          onClick={() => setShowLive(true)}
          className="h-16 bg-blue-600 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20 hover:bg-blue-700"
        >
          <Video size={24} /> ライブ配信
        </button>
      </footer>
    </div>
  );
}
