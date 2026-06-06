import { useState } from 'react';
import { useSearch } from '@/hooks/useSearch';
import { X, Eye, EyeOff } from 'lucide-react';

export function SearchConfirmDialog({ searchId, onClose }) {
  const { hideSearch, stopSearch, deleteSearch } = useSearch();

  const handleHideAndContinue = () => {
    hideSearch(searchId);
    onClose();
  };

  const handleStopSearch = () => {
    stopSearch(searchId);
    deleteSearch(searchId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0a1810] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Close Search?</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-white/70 mb-6">
          Do you want to hide the search or stop it completely?
        </p>

        <div className="space-y-3">
          <button
            onClick={handleHideAndContinue}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 transition font-medium"
          >
            <EyeOff className="w-4 h-4" />
            Hide and Continue
          </button>

          <button
            onClick={handleStopSearch}
            className="w-full px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20 transition font-medium"
          >
            Stop Search
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 transition font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
