import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import ThreatEstimator from './pages/ThreatEstimator';
import PostBlastMap from './pages/PostBlastMap';
import Configure from './pages/Configure';
import Results from './pages/Results';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="relative min-h-screen w-screen overflow-x-hidden bg-slate-950">
      
      {/* Back to Home button on all feature pages */}
{location.pathname !== '/' && (
  <button
    onClick={() => navigate('/')}
    className="fixed top-5 right-5 z-[2000] flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-5 py-2.5 text-xs font-mono font-semibold text-slate-200 shadow-xl backdrop-blur-md transition-all duration-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white cursor-pointer"
  >
    <span className="text-base">←</span>
    <span>Back to Home</span>
  </button>
)}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pre-blast" element={<ThreatEstimator />} />
        <Route path="/current-blast" element={<Configure />} />
        <Route path="/post-blast" element={<PostBlastMap />} />
        <Route path="/results" element={<Results />} />
      </Routes>

    </div>
  );
}