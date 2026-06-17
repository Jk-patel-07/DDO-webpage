import { useState, useEffect, useRef } from 'react';
import { Search, Mic, X, Loader2, FileCode2, CornerDownLeft, AlertCircle } from 'lucide-react';

const MOCK_FILES = [
  {
    path: 'src/components/NatureBackground.jsx',
    matches: [
      { line: 12, code: 'export default function NatureBackground() {' },
      { line: 34, code: 'const [mousePos, setMousePos] = useState({ x: 0, y: 0 });' },
      { line: 78, code: 'className="absolute inset-0 z-0 overflow-hidden pointer-events-none"' }
    ],
    tags: ['nature', 'background', '3d', 'parallax', 'animation', 'layer', 'svg']
  },
  {
    path: 'src/ddo_company_3_d_nature_website.jsx',
    matches: [
      { line: 8, code: 'import NatureBackground from "./components/NatureBackground";' },
      { line: 38, code: '<NatureBackground />' },
      { line: 47, code: '<img src={horseLogo} alt="DDO Logo" className="h-6 w-6 object-contain invert" />' }
    ],
    tags: ['nature', 'background', 'website', 'ddo', 'logo', 'horse', 'header']
  },
  {
    path: 'CFM/company-login-page/frontend/company-login.html',
    matches: [
      { line: 15, code: '<title>CFM Company Portal - Login</title>' },
      { line: 45, code: '<input type="password" id="companyPassword" placeholder="Enter company password"...' }
    ],
    tags: ['login', 'cfm', 'company', 'password', 'auth', 'portal']
  },
  {
    path: 'CFM/company-login-page/frontend/cfm-dashboard.html',
    matches: [
      { line: 20, code: '<div id="cfmSettingsPopup" className="hidden">' },
      { line: 95, code: '<h3>Employee Management</h3>' }
    ],
    tags: ['dashboard', 'cfm', 'settings', 'employee', 'popup', 'management']
  },
  {
    path: 'DDO/backend/server.js',
    matches: [
      { line: 45, code: 'app.use(\'/CFM\', express.static(path.join(__dirname, \'../../CFM/company-login-page/frontend\')));' },
      { line: 120, code: 'app.listen(8080, () => console.log(\'DDO backend running on port 8080\'));' }
    ],
    tags: ['backend', 'server', 'port', '8080', 'express', 'mongodb', 'auth']
  },
  {
    path: 'src/App.jsx',
    matches: [
      { line: 7, code: '<SearchProvider>' },
      { line: 8, code: '  <DDOCompanyWebsite />' }
    ],
    tags: ['app', 'search', 'provider', 'react', 'router']
  },
  {
    path: 'src/index.css',
    matches: [
      { line: 4, code: '@theme {' },
      { line: 12, code: '  --color-emerald-500: #10b981;' }
    ],
    tags: ['css', 'tailwind', 'theme', 'styles', 'font']
  }
];

export function SearchTrigger() {
  const [query, setQuery] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsActive(false);
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key closes dropdown
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsActive(false);
        setShowResults(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (searchQuery) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    setShowResults(false);

    // Simulate quick search time
    setTimeout(() => {
      const filtered = MOCK_FILES.filter(file => {
        const matchesPath = file.path.toLowerCase().includes(q);
        const matchesTags = file.tags.some(tag => tag.includes(q));
        const matchesCode = file.matches.some(m => m.code.toLowerCase().includes(q));
        return matchesPath || matchesTags || matchesCode;
      });

      setResults(filtered);
      setIsLoading(false);
      setShowResults(true);
    }, 600);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    handleSearch(query);
  };

  const triggerVoiceSearch = () => {
    if (isListening) return;
    setIsListening(true);
    setQuery('');
    
    // Simulate speech-to-text typing
    setTimeout(() => {
      setQuery('nature background');
      setIsListening(false);
      handleSearch('nature background');
    }, 1800);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const handleCopy = (code, key) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div ref={containerRef} className="relative w-64 sm:w-72 md:w-96 text-left">
      {/* Search Input Bar */}
      <form onSubmit={onSubmit} className="relative">
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#0a1810]/75 border shadow-lg backdrop-blur-md transition-all duration-300 ${
          isActive 
            ? 'border-emerald-500 bg-[#0a1810] shadow-emerald-950/20' 
            : 'border-white/10 hover:border-emerald-500/40 hover:bg-[#0a1810]/90'
        }`}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          )}
          
          <input
            type="text"
            value={query}
            onFocus={() => setIsActive(true)}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isListening ? "Listening..." : "Search files, features, functions, or code..."}
            disabled={isListening}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 focus:outline-none disabled:opacity-50"
          />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="text-white/40 hover:text-white transition-colors p-0.5 rounded-full hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={triggerVoiceSearch}
            className={`p-1 rounded-full transition-all duration-300 ${
              isListening 
                ? 'bg-red-500/20 text-red-400 animate-pulse scale-110' 
                : 'text-white/60 hover:text-emerald-400 hover:bg-white/5'
            }`}
            title="Voice Search"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Results Dropdown */}
      {showResults && isActive && (
        <div className="absolute right-0 left-0 mt-2 max-h-96 rounded-2xl border border-white/15 bg-[#0a1810]/95 shadow-2xl backdrop-blur-xl overflow-hidden z-50 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
            <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
              {results.length > 0 ? `Matches (${results.length})` : 'No results found'}
            </span>
            <span className="text-[10px] text-white/40 flex items-center gap-1 font-mono">
              esc to close
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {results.length > 0 ? (
              results.map((file, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-950/20 transition-all duration-200">
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-300/95 truncate">
                    <FileCode2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>{file.path}</span>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    {file.matches.map((match, mIdx) => {
                      const key = `${idx}-${mIdx}`;
                      return (
                        <div 
                          key={mIdx} 
                          onClick={() => handleCopy(match.code, key)}
                          className="group flex items-start gap-2 text-[11px] font-mono leading-relaxed p-1.5 rounded bg-black/40 text-white/70 hover:text-emerald-200 border border-transparent hover:border-emerald-500/10 cursor-pointer transition-colors"
                        >
                          <span className="text-emerald-500/70 select-none font-semibold w-5 text-right">{match.line}</span>
                          <span className="flex-1 select-all break-all overflow-hidden whitespace-nowrap text-ellipsis">{match.code}</span>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-emerald-400 flex items-center gap-0.5">
                            {copiedKey === key ? 'Copied!' : 'Copy'} <CornerDownLeft className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 px-4 text-center flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-6 h-6 text-white/30" />
                <p className="text-xs text-white/60 font-medium">No files matched "{query}"</p>
                <p className="text-[10px] text-white/40">Try searching for tags like: nature, login, cfm, backend</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
