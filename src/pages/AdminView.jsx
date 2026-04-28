import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Map as MapIcon, Video, RefreshCw } from 'lucide-react';
import Map from '../components/Map';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import LiveView from '../components/LiveView';

export default function AdminView() {
  const [activeMembers, setActiveMembers] = useState([]);
  const [showLive, setShowLive] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('lastSync', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActiveMembers(members);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex h-full bg-gray-900 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col shadow-2xl z-20">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <LayoutDashboard size={20} />
            </div>
            <h1 className="text-xl font-black italic tracking-tighter">本部管理画面</h1>
          </div>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Search Control Center</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} /> 団員ステータス
            </h2>
            <span className="bg-primary-600/20 text-primary-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-primary-500/30">
              {activeMembers.length}名
            </span>
          </div>

          <div className="space-y-2">
            {activeMembers.length === 0 ? (
              <p className="text-center py-8 text-gray-600 text-xs font-bold">アクティブな団員はいません</p>
            ) : (
              activeMembers.map(member => (
                <div key={member.id} className="bg-gray-800/50 border border-gray-700/50 p-3 rounded-2xl flex items-center gap-3 hover:bg-gray-800 transition-all cursor-pointer">
                  <div className={`w-3 h-3 rounded-full ${member.isTracking ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-gray-600'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-black text-gray-200">{member.name || '名前なし'}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">
                      {member.lastSync ? new Date(member.lastSync.toDate()).toLocaleTimeString() : '同期待ち'}
                    </p>
                  </div>
                  <button className="text-gray-500 hover:text-white transition-all">
                    <RefreshCw size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={() => setShowLive(!showLive)}
            className={`w-full h-12 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
              showLive ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Video size={16} /> ライブ配信モニター {showLive ? 'ON' : 'OFF'}
          </button>
        </div>
      </aside>

      {/* Map Area */}
      <main className="flex-1 relative bg-gray-800">
        <Map showAllTracks={true} />

        {/* Live Monitors Overlay */}
        {showLive && (
          <div className="absolute top-6 right-6 bottom-6 w-96 z-10 pointer-events-none">
            <div className="glass-dark rounded-3xl p-6 shadow-2xl h-full flex flex-col pointer-events-auto overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-sm font-black flex items-center gap-2"><Video size={18} className="text-blue-500" /> 現場ライブモニター</h2>
                <button onClick={() => setShowLive(false)} className="text-gray-500 hover:text-white transition-all">
                  <RefreshCw size={14} />
                </button>
              </div>
              <LiveView />
            </div>
          </div>
        )}

        {/* Search Progress Stats */}
        <div className="absolute bottom-6 left-6 right-6 pointer-events-none flex justify-center">
          <div className="glass-dark px-8 py-4 rounded-3xl shadow-2xl border border-white/5 pointer-events-auto flex gap-12">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">捜索済みエリア</p>
              <p className="text-2xl font-black text-white italic">-- <span className="text-xs not-italic text-gray-500 font-bold ml-1">km²</span></p>
            </div>
            <div className="w-px h-10 bg-gray-700 my-auto" />
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">稼働中の班</p>
              <p className="text-2xl font-black text-primary-500 italic">{activeMembers.filter(m => m.isTracking).length} <span className="text-xs not-italic text-gray-500 font-bold ml-1">UNITS</span></p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
