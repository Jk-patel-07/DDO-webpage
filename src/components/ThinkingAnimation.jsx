export function ThinkingAnimation() {
  return (
    <div className="mr-auto">
      <div className="px-4 py-3 rounded-xl bg-white/10 text-white/80 border border-white/10 text-sm flex items-center gap-2">
        <span className="text-lg">🤔</span>
        <span>Searching code</span>
        <div className="flex gap-1 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}
