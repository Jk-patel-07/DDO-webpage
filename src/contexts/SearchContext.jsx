import { useCallback, useState } from 'react';
import { SearchContext } from './SearchContextValue';

export function SearchProvider({ children }) {
  const [searches, setSearches] = useState({});
  const [activeSearchId, setActiveSearchId] = useState(null);

  const createSearch = useCallback((query, name = `Search for "${query}"`) => {
    const searchId = Date.now().toString();
    const newSearch = {
      id: searchId,
      name,
      query,
      status: 'running',
      progress: 0,
      filesFound: 0,
      results: [],
      logs: [`Started searching for "${query}"...`],
      isVisible: true,
      isPaused: false,
      startTime: new Date(),
      endTime: null,
    };
    setSearches(prev => ({ ...prev, [searchId]: newSearch }));
    setActiveSearchId(searchId);
    return searchId;
  }, []);

  const updateSearch = useCallback((searchId, updates) => {
    setSearches(prev => {
      if (!prev[searchId]) return prev;
      return {
        ...prev,
        [searchId]: { ...prev[searchId], ...updates },
      };
    });
  }, []);

  const addLog = useCallback((searchId, message) => {
    setSearches(prev => {
      if (!prev[searchId]) return prev;
      return {
        ...prev,
        [searchId]: {
          ...prev[searchId],
          logs: [...prev[searchId].logs, message],
        },
      };
    });
  }, []);

  const hideSearch = useCallback((searchId) => {
    updateSearch(searchId, { isVisible: false });
  }, [updateSearch]);

  const showSearch = useCallback((searchId) => {
    updateSearch(searchId, { isVisible: true });
    setActiveSearchId(searchId);
  }, [updateSearch]);

  const pauseSearch = useCallback((searchId) => {
    updateSearch(searchId, { isPaused: true, status: 'paused' });
    addLog(searchId, 'Search paused by user');
  }, [updateSearch, addLog]);

  const resumeSearch = useCallback((searchId) => {
    updateSearch(searchId, { isPaused: false, status: 'running' });
    addLog(searchId, 'Search resumed');
  }, [updateSearch, addLog]);

  const stopSearch = useCallback((searchId) => {
    updateSearch(searchId, { status: 'failed', isPaused: false });
    addLog(searchId, 'Search stopped by user');
  }, [updateSearch, addLog]);

  const completeSearch = useCallback((searchId, results = []) => {
    updateSearch(searchId, {
      status: 'completed',
      endTime: new Date(),
      results,
      isPaused: false,
    });
    addLog(searchId, `Search completed. Found ${results.length} results.`);
  }, [updateSearch, addLog]);

  const deleteSearch = useCallback((searchId) => {
    setSearches(prev => {
      const newSearches = { ...prev };
      delete newSearches[searchId];
      return newSearches;
    });
    if (activeSearchId === searchId) {
      const remainingIds = Object.keys(searches).filter(id => id !== searchId);
      setActiveSearchId(remainingIds[0] || null);
    }
  }, [searches, activeSearchId]);

  const value = {
    searches,
    activeSearchId,
    setActiveSearchId,
    createSearch,
    updateSearch,
    addLog,
    hideSearch,
    showSearch,
    pauseSearch,
    resumeSearch,
    stopSearch,
    completeSearch,
    deleteSearch,
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
}
