import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy, limit, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getQueue, removeFromQueue, addMessage, getMessages, clearOldMessages } from '../lib/db';

export const useSyncQueue = (userId, onNewInstruction) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // 3段階通信ステータス: 'online' (モバデータ/Wi-Fi) | 'satellite' (衛星通信のみ) | 'offline' (完全圏外)
  const [networkStatus, setNetworkStatus] = useState(() => {
    return navigator.onLine ? 'online' : 'offline';
  });
  const [queueCount, setQueueCount] = useState(0);
  const [messagesList, setMessagesList] = useState([]);
  const isSyncingRef = useRef(false);

  // 1. ネットワーク状況の監視
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('online');
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => {
      setNetworkStatus(prev => (prev === 'satellite' ? 'satellite' : 'offline'));
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初回読み込み時にキュー件数を確認
    updateQueueCount();
    loadLocalMessages();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateQueueCount = async () => {
    const q = await getQueue();
    setQueueCount(q.length);
  };

  const loadLocalMessages = async () => {
    try {
      await clearOldMessages(); // 12時間経過した古い履歴を自動消去
    } catch (e) {
      console.warn("Failed to clear old messages:", e);
    }
    const msgs = await getMessages();
    setMessagesList(msgs);
  };

  // 2. 衛星通信・実効パケット疎通のアクティブ探知 (Probe)
  const checkRealConnectivity = async () => {
    if (navigator.onLine) {
      setNetworkStatus('online');
      setIsOnline(true);
      return true;
    }

    // navigator.onLine が false (地上波圏外) でも、実際には衛星通信等でデータが通じるか超軽量Probe
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      // 超軽量な無応答ヘルスチェック (HTTP GET No Content)
      await fetch('https://www.google.com/generate_204', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // 地上波圏外だが実際にはHTTPパケットが疎通している = 衛星接続中！
      setNetworkStatus('satellite');
      setIsOnline(true);
      return true;
    } catch (e) {
      // 実際に通信が応答しない = 完全圏外
      setNetworkStatus('offline');
      setIsOnline(false);
      return false;
    }
  };

  // 3. キューの送信ロジック (force = true の場合は navigator.onLine を無視して強制試行)
  const triggerSync = async (force = false) => {
    if (isSyncingRef.current) return { success: false, count: 0, reason: 'already_syncing' };
    
    // 事前に実効疎通テストを実施してステータスバッジを更新
    const hasConnectivity = await checkRealConnectivity();
    if (!force && !hasConnectivity) return { success: false, count: 0, reason: 'offline_skipped' };
    
    isSyncingRef.current = true;
    let sentCount = 0;
    let lastError = null;

    try {
      let queue = await getQueue();
      if (queue.length === 0) {
        return { success: true, count: 0 };
      }

      while (queue.length > 0) {
        const item = queue[0];
        
        // 衛星通信の高レイテンシ(遅延200-800ms)に配慮した8秒タイムアウト付きで試行
        // 重複送信を100%防ぐため、キュー固有ID (item.id) をFirestoreドキュメントIDとして等価処理 (setDoc)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("衛星/通信応答タイムアウト (8秒経過)")), 8000)
        );

        // item.idが未定義の場合はフォールバックIDを生成
        const docId = item.id ? String(item.id) : `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        await Promise.race([
          setDoc(doc(db, 'search_logs', docId), {
            payload: item.data,
            timestamp: serverTimestamp()
          }),
          timeoutPromise
        ]);

        // 送信成功したらキューから削除
        await removeFromQueue(item.id);
        sentCount++;
        
        // 送信成功時の状態判定: ブラウザがonLineなら'online'、圏外誤判定なのに送信成功なら'satellite'
        if (navigator.onLine) {
          setNetworkStatus('online');
        } else {
          setNetworkStatus('satellite');
        }
        setIsOnline(true);
        
        // キュー情報を更新して次へ
        queue = await getQueue();
        setQueueCount(queue.length);
      }
      return { success: true, count: sentCount };
    } catch (error) {
      console.warn("Queue sync failed (likely offline or weak signal):", error);
      lastError = error?.message || "通信疎通エラー";
      setNetworkStatus('offline');
      setIsOnline(false);
      return { success: false, count: sentCount, error: lastError };
    } finally {
      isSyncingRef.current = false;
      updateQueueCount();
    }
  };

  // 定期的な送信確認及びネットワーク疎通監視 (地上波圏外時は5秒おきに実効疎通探知)
  useEffect(() => {
    let timerId = null;

    const checkAndSync = async () => {
      try {
        // 実効パケット疎通チェックを実行 (必要に応じてステータスバッジを'satellite'へ昇格)
        const isConnected = await checkRealConnectivity();
        
        const queue = await getQueue();
        if (queue.length > 0) {
          await triggerSync(true);
          scheduleNextCheck(3000);
        } else {
          if (isConnected) {
            await triggerSync(false);
          }
          scheduleNextCheck(isConnected ? 15000 : 5000);
        }
      } catch (e) {
        scheduleNextCheck(5000);
      }
    };

    const scheduleNextCheck = (delayMs) => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(checkAndSync, delayMs);
    };

    // 初期実行
    checkAndSync();

    // OSやブラウザのオンライン/オフライン変化イベント
    const handleOnline = () => checkAndSync();
    const handleOffline = () => checkAndSync();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (timerId) clearTimeout(timerId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. 本部からのメッセージ指示をリアルタイム監視 (オンライン時のみ)
  const isFirstLoadRef = useRef(true);
  const appStartTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'instructions'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      let hasNew = false;
      let shouldAlert = false;
      const localMsgs = await getMessages();
      const localIds = new Set(localMsgs.map(m => m.id));

      const docChanges = snapshot.docChanges();
      
      for (const change of docChanges) {
        if (change.type === 'added') {
          const data = change.doc.data();
          const docId = change.doc.id;
          const msgTimestamp = data.timestamp?.toMillis() || Date.now();

          // 特定のメンバー宛て、または全体（all）宛て
          if (data.target === 'all' || data.target === userId) {
            if (!localIds.has(docId)) {
              // 初回ロード時、またはアプリ起動時間より古い過去の指示は「既読」としてローカルに保存し、アラームは鳴らさない
              const isPastMessage = isFirstLoadRef.current || msgTimestamp < appStartTimeRef.current;
              
              const newMsg = {
                id: docId,
                text: data.text,
                timestamp: msgTimestamp,
                read: isPastMessage ? true : false // 過去のものは既読にする
              };
              await addMessage(newMsg);
              hasNew = true;

              if (!isPastMessage) {
                shouldAlert = true; // 本当の新着メッセージのみアラームをトリガー
              }
            }
          }
        }
      }

      // 初回スナップショット処理が終わったらロード完了とする
      isFirstLoadRef.current = false;

      if (hasNew) {
        loadLocalMessages();
        if (shouldAlert && onNewInstruction) {
          onNewInstruction();
        }
      }
    }, (error) => {
      console.error("Instructions subscription error:", error);
    });

    return () => unsubscribe();
  }, [userId, onNewInstruction]);

  return {
    isOnline,
    networkStatus,
    queueCount,
    messagesList,
    updateQueueCount,
    loadLocalMessages,
    triggerSync
  };
};
