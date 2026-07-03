import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Volume2 } from 'lucide-react';
import { markMessageAsRead } from '../lib/db';

export default function NotificationManager({ activeAlert, onClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const vibrateIntervalRef = useRef(null);

  useEffect(() => {
    if (activeAlert) {
      setIsOpen(true);
      startAlarm();
    }
  }, [activeAlert]);

  const startAlarm = () => {
    // 1. 強力なバイブレーション（1秒振動、0.5秒停止の繰り返し）
    if ('vibrate' in navigator) {
      navigator.vibrate([1000, 500, 1000]);
      vibrateIntervalRef.current = setInterval(() => {
        navigator.vibrate([1000, 500, 1000]);
      }, 3000);
    }

    // 2. Web Audio API を使ったサイレン警告音
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth'; // 騒音下で通りやすい鋸歯状波
      gain.gain.setValueAtTime(1.0, ctx.currentTime); // 最大音量

      // サイレンのうねり音を作るためのLFO風の周波数制御
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscillatorRef.current = osc;
      gainNodeRef.current = gain;

      // 0.25秒ごとに周波数を切り替えてサイレンを模倣
      let high = true;
      const interval = setInterval(() => {
        if (!oscillatorRef.current) {
          clearInterval(interval);
          return;
        }
        oscillatorRef.current.frequency.setValueAtTime(high ? 1200 : 800, ctx.currentTime);
        high = !high;
      }, 250);

    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  };

  const stopAlarm = async () => {
    // バイブレーション停止
    if (vibrateIntervalRef.current) {
      clearInterval(vibrateIntervalRef.current);
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }

    // 音声停止
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {}
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // 既読処理
    if (activeAlert) {
      await markMessageAsRead(activeAlert.id);
    }

    setIsOpen(false);
    onClear();
  };

  if (!isOpen || !activeAlert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-red-900 border-4 border-red-500 rounded-3xl p-6 text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.4)]">
        
        {/* アラートアイコン・アニメーション */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center animate-bounce shadow-lg shadow-red-500/50">
            <ShieldAlert size={56} className="text-white animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-white animate-pulse">
            本部からの指示
          </h2>
          <p className="text-xs text-red-300 font-bold uppercase tracking-widest flex items-center justify-center gap-1">
            <Volume2 size={14} /> 最大音量・バイブ警告中
          </p>
        </div>

        {/* 巨大なメッセージ枠 */}
        <div className="bg-black/40 border border-red-700 p-6 rounded-2xl min-h-[120px] flex items-center justify-center">
          <p className="text-2xl font-black text-yellow-300 leading-snug break-all">
            {activeAlert.text}
          </p>
        </div>

        {/* 巨大な停止ボタン（誤操作のないよう、押しやすいサイズ） */}
        <button
          onClick={stopAlarm}
          className="w-full py-6 bg-yellow-400 hover:bg-yellow-500 text-black text-2xl font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all uppercase tracking-wider"
        >
          了解しました (音声を停止)
        </button>

      </div>
    </div>
  );
}
