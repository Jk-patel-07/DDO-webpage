export function MessageBubble({ type = 'system', message, progress, filesFound, query }) {
  const baseClasses = 'px-4 py-3 rounded-xl text-sm max-w-xs';

  const typeStyles = {
    user: 'ml-auto bg-emerald-500/20 text-emerald-100 border border-emerald-500/30',
    system: 'mr-auto bg-white/10 text-white/80 border border-white/10',
    result: 'mr-auto bg-white/5 text-white border border-white/15 max-w-sm',
    error: 'mr-auto bg-red-500/20 text-red-200 border border-red-500/30',
  };

  if (type === 'result') {
    return (
      <div className="mr-auto">
        <div className={`${baseClasses} ${typeStyles.result}`}>
          <div className="font-semibold text-white mb-3">Found {filesFound} related files</div>
          <div className="text-white/70 space-y-2 text-xs">
            <div>✓ {filesFound} files with related code</div>
            <div>✓ {Math.floor(filesFound * 3.5)} code sections matched</div>
            {query && <div>✓ Search: <span className="text-emerald-300">"{query}"</span></div>}
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-white/90">View results →</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'system' && progress !== undefined) {
    return (
      <div className="mr-auto w-full">
        <div className={`${baseClasses} ${typeStyles.system} w-full`}>
          <div className="text-white/80 font-medium">{message}</div>
          <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-white/50 mt-1">{progress}% complete</div>
        </div>
      </div>
    );
  }

  return (
    <div className={type === 'user' ? 'flex justify-end' : 'flex justify-start'}>
      <div className={`${baseClasses} ${typeStyles[type]}`}>
        {message}
      </div>
    </div>
  );
}
