import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MemberView from './pages/MemberView';
import AdminView from './pages/AdminView';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        {/* Navigation for prototype switching */}
        <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl shadow-2xl border border-gray-100">
          <Link 
            to="/" 
            className="px-4 py-2 rounded-xl text-xs font-black transition-all hover:bg-gray-100 active:scale-95"
          >
            団員用
          </Link>
          <Link 
            to="/admin" 
            className="px-4 py-2 rounded-xl text-xs font-black transition-all hover:bg-gray-100 active:scale-95"
          >
            本部用
          </Link>
        </nav>

        <main className="h-screen w-screen overflow-hidden">
          <Routes>
            <Route path="/" element={<MemberView />} />
            <Route path="/admin" element={<AdminView />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
