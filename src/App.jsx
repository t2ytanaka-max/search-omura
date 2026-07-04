import React, { useState, useEffect } from 'react';
import MemberView from './pages/MemberView';
import AdminView from './pages/AdminView';
import { Shield, Users, Compass } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState(() => {
    // 起動時の初期モード判定 (直接URLから入った場合はポータルをスキップ)
    if (window.location.pathname === '/admin') return 'admin';
    if (window.location.pathname === '/member') return 'member';
    return 'portal';
  });

  // URL遷移を監視 (ブラウザの「戻る」などに対応)
  useEffect(() => {
    const handleLocationChange = () => {
      if (window.location.pathname === '/admin') {
        setViewMode('admin');
      } else if (window.location.pathname === '/member') {
        setViewMode('member');
      } else if (window.location.pathname === '/') {
        setViewMode('portal');
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const selectMode = (mode) => {
    setViewMode(mode);
    const newPath = mode === 'admin' ? '/admin' : '/member';
    window.history.pushState({}, '', newPath);
  };

  // 1. ポータル（起動時選択）画面
  if (viewMode === 'portal') {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] w-full bg-gray-950 text-white p-6 overflow-hidden select-none">
        
        {/* アプリロゴ */}
        <div className="text-center space-y-4 mb-10 px-4">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-rescue-500 rounded-3xl shadow-xl shadow-rescue-500/30 animate-pulse">
            <Compass size={52} className="text-white" />
          </div>
          <p className="text-lg font-black text-rescue-500 tracking-widest uppercase">
            山岳捜索サポーター
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight uppercase">
            SEARCH <br className="sm:hidden" />大村市消防団
          </h1>
        </div>

        {/* 選択ボタンパネル */}
        <div className="w-full max-w-md space-y-4">
          <button
            onClick={() => selectMode('member')}
            className="w-full py-8 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all rounded-3xl flex flex-col items-center justify-center gap-3 shadow-lg border-2 border-blue-400"
          >
            <Users size={40} className="text-white" />
            <div className="text-center">
              <span className="text-xl font-black block">活動隊員 画面</span>
              <span className="text-[9px] opacity-60 font-mono tracking-wider">MEMBER VIEW (GPS / REPORT)</span>
            </div>
          </button>

          <button
            onClick={() => selectMode('admin')}
            className="w-full py-8 bg-gray-900 hover:bg-gray-850 active:scale-95 transition-all rounded-3xl flex flex-col items-center justify-center gap-3 shadow-lg border-2 border-gray-800"
          >
            <Shield size={40} className="text-rescue-500" />
            <div className="text-center">
              <span className="text-xl font-black block text-gray-100">本部指令 画面</span>
              <span className="text-[9px] opacity-60 font-mono tracking-wider text-gray-500">ADMIN CONTROL PANEL</span>
            </div>
          </button>
        </div>

        <div className="absolute bottom-6 text-[10px] text-gray-600 font-black">
          ⛰️ 消防団専用救助支援システム v1.1.0
        </div>
      </div>
    );
  }

  // 2. 隊員画面 (ポータルに戻るための setViewMode を渡す)
  if (viewMode === 'member') {
    return <MemberView onGoBack={() => selectMode('portal')} />;
  }

  // 3. 本部画面 (ポータルに戻るための setViewMode を渡す)
  if (viewMode === 'admin') {
    return <AdminView onGoBack={() => selectMode('portal')} />;
  }

  return null;
}
