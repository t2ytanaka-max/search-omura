import React, { useState, useEffect } from 'react';
import MemberView from './pages/MemberView';
import AdminView from './pages/AdminView';
import GuideView from './pages/GuideView';
import { Shield, Users, Compass, BookOpen } from 'lucide-react';

export default function App() {
  const [viewMode, setViewMode] = useState(() => {
    // 起動時の初期モード判定 (直接URLから入った場合はポータルをスキップ)
    if (window.location.pathname === '/admin') return 'admin';
    if (window.location.pathname === '/member') return 'member';
    if (window.location.pathname === '/guide') return 'guide';
    return 'portal';
  });

  // URL遷移を監視 (ブラウザの「戻る」などに対応)
  useEffect(() => {
    const handleLocationChange = () => {
      if (window.location.pathname === '/admin') {
        setViewMode('admin');
      } else if (window.location.pathname === '/member') {
        setViewMode('member');
      } else if (window.location.pathname === '/guide') {
        setViewMode('guide');
      } else if (window.location.pathname === '/') {
        setViewMode('portal');
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const selectMode = (mode) => {
    setViewMode(mode);
    let newPath = '/';
    if (mode === 'admin') newPath = '/admin';
    if (mode === 'member') newPath = '/member';
    if (mode === 'guide') newPath = '/guide';
    window.history.pushState({}, '', newPath);
  };

  // 1. ポータル（起動時選択）画面
  if (viewMode === 'portal') {
    return (
      <div className="flex flex-col items-center justify-start h-[100dvh] w-full bg-gray-950 text-white p-6 overflow-y-auto select-none py-12">
        
        {/* アプリロゴ */}
        <div className="text-center space-y-4 mb-10 px-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl overflow-hidden shadow-xl shadow-rescue-500/30 animate-pulse border-2 border-gray-800">
            <img src="/icon.png" alt="Search大村市消防団" className="w-full h-full object-cover" />
          </div>
          <p className="text-sm font-black text-rescue-500 tracking-widest uppercase">
            山岳捜索サポーター
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
            Search大村市消防団
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
              <span className="text-xl font-black block">活動団員 画面</span>
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

        {/* 利用者ガイドへのリンク */}
        <div className="w-full max-w-md pt-6 border-t border-gray-900 mt-6 text-center">
          <button
            onClick={() => selectMode('guide')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900/60 hover:bg-gray-900 active:scale-95 text-xs font-black text-rescue-500 hover:text-rescue-600 rounded-full border border-gray-800 transition-all shadow-md"
          >
            <BookOpen size={12} />
            📖 公式利用者ガイド・技術解説
          </button>
        </div>

        {/* 著作権表示 (重なり防止のためマージンをとって通常フロー配置) */}
        <div className="w-full max-w-sm px-4 space-y-1 text-black font-bold select-text mt-12 text-center pb-6">
          <div className="text-[10px]">Copyright&copy;2026 大村市消防団 田中哲也. All rights reserved</div>
          <div className="text-[8px] leading-tight opacity-90">
            本アプリおよび本マニュアルに関する一切の権利（著作権を含む）は、開発者（大村市消防団 田中哲也）に帰属します。無断での複製、転載、再配布を禁じます。
          </div>
        </div>
      </div>
    );
  }

  // 2. 団員画面 (ポータルに戻るための setViewMode を渡す)
  if (viewMode === 'member') {
    return <MemberView onGoBack={() => selectMode('portal')} />;
  }

  // 3. 本部画面 (ポータルに戻るための setViewMode を渡す)
  if (viewMode === 'admin') {
    return <AdminView onGoBack={() => selectMode('portal')} />;
  }

  // 4. 利用者ガイド画面 (ポータルに戻るための setViewMode を渡す)
  if (viewMode === 'guide') {
    return <GuideView onGoBack={() => selectMode('portal')} />;
  }

  return null;
}
