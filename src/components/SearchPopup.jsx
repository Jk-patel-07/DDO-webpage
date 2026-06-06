import { useState, useEffect } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { SearchConfirmDialog } from './SearchConfirmDialog';
import { X, Play, Pause, Square, Eye, FolderOpen, ChevronDown } from 'lucide-react';

const SEARCH_ACTIVITIES = [
  'Searching DDO project...',
  'Checking files...',
  'Finding related code...',
  'Checking connections...',
  'Preparing results...',
  'Scanning imports...',
  'Analyzing dependencies...',
  'Indexing code...',
];

export function SearchPopup({ searchId }) {
  const { searches, hideSearch, pauseSearch, resumeSearch, stopSearch, updateSearch, addLog } = useSearch();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const search = searches[searchId];

  if (!search) return null;

  const statusColors = {
    running: 'text-emerald-400',
    paused: 'text-yellow-400',
    completed: 'text-emerald-400',
    failed: 'text-red-400',
  };

  const statusLabels = {
    running: 'Searching',
    paused: 'Paused',
    completed: 'Completed',
    failed: 'Stopped',
  };

  const handleClose = () => {
    setShowConfirm(true);
  };

  const simulateProgress = () => {
    if (search.status === 'running' && search.progress < 100) {
      const newProgress = Math.min(search.progress + Math.random() * 15, 100);
      updateSearch(searchId, { progress: Math.round(newProgress) });

      if (newProgress >= 100) {
        updateSearch(searchId, {
          status: 'completed',
          endTime: new Date(),
        });
        addLog(searchId, `Search completed. ${search.filesFound} related files and ${Math.floor(search.filesFound * 3.5)} code sections found.`);
      } else {
        // Update activity message periodically
        if (Math.random() > 0.7) {
          const randomActivity = SEARCH_ACTIVITIES[Math.floor(Math.random() * SEARCH_ACTIVITIES.length)];
          addLog(searchId, randomActivity);
        }
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(simulateProgress, 1000);
    return () => clearInterval(interval);
  }, [search.status, search.progress, searchId, search.filesFound]);

  return (
    <div className="fixed right-6 bottom-24 z-50 w-96 max-h-[600px] flex flex-col rounded-2xl border border-white/15 bg-[#0a1810] shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
            🔍
          </div>
          <div>
            <h3 className="font-bold text-white">Search Project</h3>
            <p className="text-xs text-white/50">for "{search.query}"</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-white/60 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="border-b border-white/10 p-4">
        <input
          type="text"
          value={search.query}
          readOnly
          placeholder="Search files, features, functions, or code..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:border-emerald-500/50 focus:outline-none"
        />
      </div>

      {/* Status Section */}
      <div className="border-b border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white/70">Status:</span>
          <span className={`font-bold text-sm ${statusColors[search.status]}`}>
            {statusLabels[search.status]}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/70">Progress:</span>
            <span className="font-bold text-emerald-300">{search.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-300"
              style={{ width: `${search.progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">Files Found:</span>
          <span className="font-bold text-emerald-300">{search.filesFound}</span>
        </div>

        <div className="text-sm text-white/60">
          <p>Current: {search.logs[search.logs.length - 1]?.substring(0, 40)}...</p>
        </div>
      </div>

      {/* Activity Log */}
      <div className="border-b border-white/10 flex-1 overflow-y-auto p-4 search-logs">
        <h4 className="text-xs font-bold text-white/70 mb-3 uppercase">Activity Log</h4>
        <div className="space-y-2 max-h-[200px]">
          {search.logs.map((log, idx) => (
            <div key={idx} className="text-xs text-white/60 flex items-start gap-2">
              <span className="text-emerald-400 flex-shrink-0 mt-0.5">→</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="border-t border-white/10 p-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => hideSearch(searchId)}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            Hide
          </button>

          {search.status === 'running' ? (
            <button
              onClick={() => pauseSearch(searchId)}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition text-sm font-medium"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          ) : search.status === 'paused' ? (
            <button
              onClick={() => resumeSearch(searchId)}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          ) : null}

          <button
            onClick={() => stopSearch(searchId)}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition text-sm font-medium"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>

          <button
            onClick={() => setShowResults(!showResults)}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition text-sm font-medium"
          >
            <FolderOpen className="w-4 h-4" />
            Results
          </button>
        </div>
      </div>

      {/* Results Section (if toggled) */}
      {showResults && search.results.length > 0 && (
        <div className="border-t border-white/10 p-4 max-h-64 overflow-y-auto bg-white/5">
          <h4 className="text-sm font-bold text-white mb-3">Search Results</h4>
          <div className="space-y-2">
            {search.results.slice(0, 5).map((result, idx) => (
              <div key={idx} className="text-xs text-white/70 p-2 rounded bg-white/5">
                {result}
              </div>
            ))}
            {search.results.length > 5 && (
              <p className="text-xs text-white/50 italic">
                +{search.results.length - 5} more results
              </p>
            )}
          </div>
        </div>
      )}

      {showConfirm && <SearchConfirmDialog searchId={searchId} onClose={() => setShowConfirm(false)} />}
    </div>
  );
}
