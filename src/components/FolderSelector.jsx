import { useState } from 'react';
import { X, Folder, ChevronRight, Home } from 'lucide-react';

export function FolderSelector({ onSelect, onClose, mode = 'folder' }) {
  const [currentPath, setCurrentPath] = useState('/');
  const [selectedItems, setSelectedItems] = useState([]);

  // Mock folder structure for demo
  const folderStructure = {
    '/': [
      { name: 'src', type: 'folder', path: '/src' },
      { name: 'DDO', type: 'folder', path: '/DDO' },
      { name: 'public', type: 'folder', path: '/public' },
      { name: 'package.json', type: 'file', path: '/package.json' },
    ],
    '/src': [
      { name: 'components', type: 'folder', path: '/src/components' },
      { name: 'contexts', type: 'folder', path: '/src/contexts' },
      { name: 'hooks', type: 'folder', path: '/src/hooks' },
      { name: 'styles', type: 'folder', path: '/src/styles' },
      { name: 'App.jsx', type: 'file', path: '/src/App.jsx' },
    ],
    '/src/components': [
      { name: 'ChatStyleSearchPopup.jsx', type: 'file', path: '/src/components/ChatStyleSearchPopup.jsx' },
      { name: 'SearchPopup.jsx', type: 'file', path: '/src/components/SearchPopup.jsx' },
      { name: 'SearchTrigger.jsx', type: 'file', path: '/src/components/SearchTrigger.jsx' },
    ],
    '/DDO': [
      { name: 'frontend', type: 'folder', path: '/DDO/frontend' },
      { name: 'backend', type: 'folder', path: '/DDO/backend' },
      { name: 'styles', type: 'folder', path: '/DDO/styles' },
    ],
  };

  const items = folderStructure[currentPath] || [];

  const handleNavigate = (path) => {
    if (folderStructure[path]) {
      setCurrentPath(path);
    }
  };

  const handleSelect = (path, type) => {
    if (type === 'folder') {
      onSelect(path);
    } else if (mode === 'files') {
      if (selectedItems.includes(path)) {
        setSelectedItems(selectedItems.filter(p => p !== path));
      } else {
        setSelectedItems([...selectedItems, path]);
      }
    }
  };

  const handleConfirmSelection = () => {
    if (mode === 'files' && selectedItems.length > 0) {
      onSelect(selectedItems.join(', '));
    }
  };

  const breadcrumbs = currentPath === '/' ? ['Project'] : currentPath.split('/').filter(Boolean);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[600px] max-h-[600px] rounded-2xl border border-white/15 bg-[#0a1810] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div>
            <h3 className="font-bold text-white">
              {mode === 'files' ? 'Select Files' : 'Select Folder'}
            </h3>
            <p className="text-xs text-white/50">Choose files or folder to search</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="border-b border-white/10 px-6 py-3 flex items-center gap-2">
          <button
            onClick={() => setCurrentPath('/')}
            className="flex items-center gap-1 text-sm text-emerald-400 hover:text-emerald-300 transition"
          >
            <Home className="w-4 h-4" />
            Project
          </button>
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-white/30" />
              <span className="text-sm text-white/70">{crumb}</span>
            </div>
          ))}
        </div>

        {/* File/Folder List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {items.map((item, idx) => (
            <div key={idx}>
              {item.type === 'folder' ? (
                <button
                  onClick={() => mode === 'folder' ? onSelect(item.path) : handleNavigate(item.path)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-left"
                >
                  <Folder className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-white/80">{item.name}</span>
                  {mode !== 'folder' && <ChevronRight className="w-4 h-4 text-white/30 ml-auto" />}
                </button>
              ) : (
                <button
                  onClick={() => handleSelect(item.path, 'file')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition text-left ${
                    selectedItems.includes(item.path)
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30'
                      : 'hover:bg-white/5'
                  }`}
                >
                  {mode === 'files' && (
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.path)}
                      onChange={() => {}}
                      className="w-4 h-4"
                    />
                  )}
                  <span className="text-sm text-white/80">{item.name}</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 bg-white/5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/5 transition text-sm"
          >
            Cancel
          </button>
          {mode === 'files' && (
            <button
              onClick={handleConfirmSelection}
              disabled={selectedItems.length === 0}
              className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
            >
              Confirm ({selectedItems.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
