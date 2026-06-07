import { useState, useEffect, useRef } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { SearchConfirmDialog } from './SearchConfirmDialog';
import { X, Play, Pause, Square, Eye, Folder, FileText, Search, Mic, XCircle } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { FolderSelector } from './FolderSelector';
import { ThinkingAnimation } from './ThinkingAnimation';

const SEARCH_ACTIVITIES = [
  'Searching selected files...',
  'Checking components...',
  'Checking styles...',
  'Checking related imports...',
  'Finding connected files...',
  'Preparing results...',
  'Scanning imports...',
  'Analyzing dependencies...',
];

export function ChatStyleSearchPopup({ searchId }) {
  const { searches, hideSearch, pauseSearch, resumeSearch, stopSearch, updateSearch, addLog } = useSearch();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [selectorMode, setSelectorMode] = useState('folder');
  const [selectedPath, setSelectedPath] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [isNewSearch, setIsNewSearch] = useState(false);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const search = searches[searchId];
  const searchStatus = search?.status;
  const searchProgress = search?.progress;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [search?.logs, search?.progress]);

  useEffect(() => {
    if (!searchStatus) return;
    
    const simulateProgress = () => {
      if (searchStatus === 'running' && searchProgress < 100) {
        const newProgress = Math.min(searchProgress + Math.random() * 15, 100);
        updateSearch(searchId, { progress: Math.round(newProgress) });

        if (newProgress >= 100) {
          const filesFound = Math.floor(Math.random() * 12) + 3;
          updateSearch(searchId, {
            status: 'completed',
            endTime: new Date(),
            filesFound,
          });
          addLog(searchId, `Search completed. ${filesFound} related files and ${Math.floor(filesFound * 3.5)} code sections found.`);
        } else {
          if (Math.random() > 0.7) {
            const randomActivity = SEARCH_ACTIVITIES[Math.floor(Math.random() * SEARCH_ACTIVITIES.length)];
            addLog(searchId, randomActivity);
          }
        }
      }
    };

    const interval = setInterval(simulateProgress, 1000);
    return () => clearInterval(interval);
  }, [searchStatus, searchProgress, searchId, updateSearch, addLog]);

  if (!search) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && inputValue.trim()) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSearch = () => {
    if (inputValue.trim()) {
      updateSearch(searchId, {
        query: inputValue,
        status: 'running',
        progress: 0,
        filesFound: 0,
        logs: [`Started searching for "${inputValue}"...`],
        results: [],
      });
      setIsNewSearch(true);
      setInputValue('');
    }
  };

  const handleClearInput = () => {
    setInputValue('');
    inputRef.current?.focus();
  };

  return (
    <div className="fixed right-6 bottom-24 z-50 w-[500px] max-h-[700px] flex flex-col rounded-2xl border border-white/15 bg-[#0a1810] shadow-2xl backdrop-blur-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-6 bg-gradient-to-r from-emerald-500/10 to-lime-500/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
            🔍
          </div>
          <div>
            <h3 className="font-bold text-white">Search Project</h3>
            {selectedPath && <p className="text-xs text-emerald-400">{selectedPath}</p>}
          </div>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="text-white/60 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Selected Path Preview */}
      {selectedPath && (
        <div className="border-b border-white/10 px-6 py-3 bg-white/5">
          <div className="flex items-center gap-2 text-sm">
            <Folder className="w-4 h-4 text-emerald-400" />
            <span className="text-white/80">{selectedPath}</span>
          </div>
        </div>
      )}

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 chat-messages">
        {/* Initial search query message */}
        {isNewSearch && search.query && (
          <MessageBubble type="user" message={search.query} />
        )}

        {/* Thinking state */}
        {search.status === 'running' && search.progress < 20 && (
          <ThinkingAnimation />
        )}

        {/* Progress messages - show as system messages */}
        {search.status === 'running' && search.progress >= 20 && (
          <MessageBubble
            type="system"
            message={`Searching... ${search.progress}% complete`}
            progress={search.progress}
          />
        )}

        {/* Results message */}
        {search.status === 'completed' && (
          <MessageBubble
            type="result"
            message={`Found ${search.filesFound} related files and ${Math.floor(search.filesFound * 3.5)} code sections`}
            filesFound={search.filesFound}
            query={search.query}
          />
        )}

        {/* Error/Stopped message */}
        {search.status === 'failed' && (
          <MessageBubble
            type="error"
            message="Search was stopped."
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Search Input Box (Chat Style) */}
      <div className="border-t border-white/10 p-4 bg-white/5">
        <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/10 border border-white/20 hover:border-emerald-500/50 focus-within:border-emerald-500/50 transition">
          <Search className="w-5 h-5 text-emerald-400" />
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files, features, functions, or code..."
            className="flex-1 bg-transparent text-white placeholder-white/40 outline-none text-sm"
          />
          {inputValue && (
            <button
              onClick={handleClearInput}
              className="text-white/60 hover:text-white transition"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
          <button className="text-white/60 hover:text-white transition">
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="border-t border-white/10 p-4 bg-white/5 space-y-2">
        <div className="grid grid-cols-3 gap-2 mb-2">
          {search.status === 'running' ? (
            <button
              onClick={() => pauseSearch(searchId)}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition text-xs font-medium"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          ) : search.status === 'paused' ? (
            <button
              onClick={() => resumeSearch(searchId)}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-green-500/20 text-green-300 hover:bg-green-500/30 transition text-xs font-medium"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          ) : (
            <button
              onClick={handleSearch}
              disabled={!inputValue.trim()}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition text-xs font-medium"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          )}

          <button
            onClick={() => stopSearch(searchId)}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 transition text-xs font-medium"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>

          <button
            onClick={() => hideSearch(searchId)}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition text-xs font-medium"
          >
            <Eye className="w-4 h-4" />
            Hide
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setSelectorMode('folder');
              setShowFolderSelector(true);
            }}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition text-xs font-medium"
          >
            <Folder className="w-4 h-4" />
            Select Folder
          </button>

          <button
            onClick={() => {
              setSelectorMode('files');
              setShowFolderSelector(true);
            }}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition text-xs font-medium"
          >
            <FileText className="w-4 h-4" />
            Select Files
          </button>
        </div>
      </div>

      {/* Modals */}
      {showFolderSelector && (
        <FolderSelector
          mode={selectorMode}
          onSelect={(path) => {
            setSelectedPath(path);
            setShowFolderSelector(false);
          }}
          onClose={() => setShowFolderSelector(false)}
        />
      )}

      {showConfirm && <SearchConfirmDialog searchId={searchId} onClose={() => setShowConfirm(false)} />}
    </div>
  );
}
