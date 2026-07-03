import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, onSnapshot, orderBy, limit, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getQueue, removeFromQueue, addMessage, getMessages } from '../lib/db';

export const useSyncQueue = (userId, onNewInstruction) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [messagesList, setMessagesList] = useState([]);
  const isSyncingRef = useRef(false);

  // 1. ネットワーク状況の監視
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

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
    const msgs = await getMessages();
    setMessagesList(msgs);
  };

  // 2. キューの自動送信ロジック
  const triggerSync = async () => {
    if (isSyncingRef.current || !navigator.onLine) return;
    isSyncingRef.current = true;

    try {
      let queue = await getQueue();
      while (queue.length > 0 && navigator.onLine) {
        const item = queue[0];
        
        // 衛星通信を想定した極小データ送信（CSV 1行テキスト）
        // ドキュメントIDを自動生成して保存
        await addDoc(collection(db, 'search_logs'), {
          payload: item.data,
          timestamp: serverTimestamp()
        });

        // 送信成功したらキューから削除
        await removeFromQueue(item.id);
        
        // キュー情報を更新して次へ
        queue = await getQueue();
        setQueueCount(queue.length);
      }
    } catch (error) {
      console.error("Queue sync error:", error);
    } finally {
      isSyncingRef.current = false;
      updateQueueCount();
    }
  };

  // 定期的な送信確認 (30秒おき)
  useEffect(() => {
    const timer = setInterval(() => {
      triggerSync();
    }, 15000);
    return () => clearInterval(timer);
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
    queueCount,
    messagesList,
    updateQueueCount,
    loadLocalMessages,
    triggerSync
  };
};
