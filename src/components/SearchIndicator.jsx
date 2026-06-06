import { useSearch } from '@/hooks/useSearch';
import { X, ChevronUp } from 'lucide-react';

export function SearchIndicator() {
  const { searches, showSearch, stopSearch, deleteSearch } = useSearch();

  const hiddenSearches = Object.values(searches).filter(s => !s.isVisible);

  if (hiddenSearches.length === 0) return null;

  const firstSearch = hiddenSearches[0];

  const statusEmojis = {
    running: '🔍',
    paused: '⏸️',
    completed: '✅',
    failed: '⛔',
  };

  // Format the search display name for the floating indicator
  const getSearchDisplayName = () => {
    if (firstSearch.status === 'completed') {
      return `${firstSearch.query} search completed`;
    }
    return `Searching ${firstSearch.query}`;
  };

  const getStatusMessage = () => {
    switch (firstSearch.status) {
      case 'running':
        return `${firstSearch.progress}% complete`;
      case 'paused':
        return 'Paused';
      case 'completed':
        return `${firstSearch.filesFound} files found`;
      case 'failed':
        return 'Stopped';
      default:
        return '';
    }
  };

  return (
    <div className="fixed right-6 bottom-6 z-40 max-w-xs">
      {/* Main Indicator */}
      <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-emerald-950/60 to-teal-950/40 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-xl flex-shrink-0">{statusEmojis[firstSearch.status]}</div>
            <div className="min-w-0">
              <h4 className="font-bold text-white text-sm truncate">{getSearchDisplayName()}</h4>
              <p className="text-xs text-white/60 truncate">
                {getStatusMessage()}
              </p>
            </div>
          </div>
          <button
            onClick={() => stopSearch(firstSearch.id)}
            className="text-white/60 hover:text-white transition flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/70">{firstSearch.filesFound} files</span>
            <span className="text-emerald-300 font-bold">{firstSearch.progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-300"
              style={{ width: `${firstSearch.progress}%` }}
            />
          </div>
        </div>

        {/* Status and Expand Button */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">
            {firstSearch.status === 'running' ? 'In progress' : firstSearch.status === 'paused' ? 'Paused' : firstSearch.status === 'completed' ? 'Completed' : 'Stopped'}
          </span>
          <button
            onClick={() => showSearch(firstSearch.id)}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition text-xs font-medium"
          >
            <span>Expand</span>
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Multiple Searches Badge */}
      {hiddenSearches.length > 1 && (
        <div className="text-center mt-2">
          <span className="text-xs text-white/50">
            +{hiddenSearches.length - 1} more search{hiddenSearches.length - 1 > 1 ? 'es' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
