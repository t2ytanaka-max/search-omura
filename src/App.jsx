import React, { useState, useEffect } from 'react';
import MemberView from './pages/MemberView';
import AdminView from './pages/AdminView';

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    // 定期的な変更チェック（簡易ルータ用）
    const interval = setInterval(handleLocationChange, 500);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      clearInterval(interval);
    };
  }, []);

  // シンプルなURL切り替え: /admin なら本部画面、それ以外は隊員画面
  if (currentPath === '/admin') {
    return <AdminView />;
  }

  return <MemberView />;
}
