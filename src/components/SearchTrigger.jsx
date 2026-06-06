import { useState } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { Search, X } from 'lucide-react';

export function SearchTrigger() {
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [query, setQuery] = useState('');
  const { createSearch } = useSearch();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      createSearch(query);
      setQuery('');
      setShowSearchInput(false);
    }
  };

  return (
    <>
      {!showSearchInput ? (
        <button
          onClick={() => setShowSearchInput(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/75 hover:text-white transition border border-white/15 hover:border-emerald-500/50 hover:bg-emerald-500/10"
          title="Search code (Ctrl+Shift+F)"
        >
          <Search className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">Search</span>
        </button>
      ) : (
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, features, functions, or code..."
            autoFocus
            className="px-3 py-2 rounded-lg bg-white/10 border border-emerald-500/50 text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 w-48"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition disabled:opacity-50"
          >
            Go
          </button>
          <button
            type="button"
            onClick={() => {
              setShowSearchInput(false);
              setQuery('');
            }}
            className="text-white/60 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </form>
      )}
    </>
  );
}
