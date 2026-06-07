import { useState, useRef } from 'react';
import { X, Copy, Eye, Send } from 'lucide-react';

export function CodeExplainer({ code, filePath, lineNumbers, onClose }) {
  const [activeLevel, setActiveLevel] = useState('simple');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const messageInputRef = useRef(null);

  // Generate explanations based on code
  const generateExplanation = (level) => {
    const explanations = {
      simple: `This code controls styling and appearance. The key values are: colors, sizes, and properties that affect how things look on screen. If you change the color values (like #ffffff), the appearance will change. Some changes might affect multiple parts of the interface.`,
      detailed: `This CSS/styling code defines the visual appearance of components. It includes background colors, text colors, borders, and spacing. The code is used throughout the interface. Changing color values will affect visibility and contrast. Be careful when changing values that are referenced in other files.`,
      lineByLine: `Line 1: background - sets the background color\nLine 2: color - sets the text color\nLine 3: border - adds a border around the element\nLine 4: Properties control size and spacing\nEach property can be modified to change appearance.`,
    };
    return explanations[level] || explanations.simple;
  };

  const handleAsk = async () => {
    if (!question.trim()) return;

    setIsAsking(true);
    // Simulate API call
    setTimeout(() => {
      const answers = {
        default: `Based on this code at ${filePath}, I can help you understand. The code is responsible for styling. Be careful when making changes - they might affect other parts of the interface that depend on this styling.`,
      };
      setAnswer(answers.default);
      setQuestion('');
      setIsAsking(false);
    }, 1000);
  };

  const handleCopyExplanation = () => {
    const text = generateExplanation(activeLevel);
    navigator.clipboard.writeText(text);
  };

  const explanationLevels = [
    { id: 'simple', label: 'Simple', icon: '📝' },
    { id: 'detailed', label: 'Detailed', icon: '📚' },
    { id: 'lineByLine', label: 'Line by Line', icon: '🔍' },
  ];

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[700px] max-h-[750px] rounded-2xl border border-white/15 bg-[#0a1810] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6 bg-gradient-to-r from-emerald-500/10 to-lime-500/10">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2">
              <span>💬✦</span>
              Explain Simply
            </h3>
            <p className="text-xs text-white/50">{filePath} • Lines {lineNumbers}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explanation Tabs */}
        <div className="border-b border-white/10 p-4 flex gap-2">
          {explanationLevels.map((level) => (
            <button
              key={level.id}
              onClick={() => setActiveLevel(level.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeLevel === level.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-white/70 hover:text-white border border-white/10'
              }`}
            >
              {level.icon} {level.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Code Display */}
          <div>
            <h4 className="text-xs font-bold text-white/70 mb-2 uppercase">Code Section</h4>
            <div className="bg-black/30 border border-white/10 rounded-lg p-4 font-mono text-xs text-white/80 max-h-32 overflow-y-auto">
              {code}
            </div>
          </div>

          {/* Explanation */}
          <div>
            <h4 className="text-xs font-bold text-white/70 mb-2 uppercase">Explanation ({explanationLevels.find(l => l.id === activeLevel)?.label})</h4>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white/80 leading-relaxed whitespace-pre-line">
              {generateExplanation(activeLevel)}
            </div>
          </div>

          {/* Safety Section */}
          <div>
            <h4 className="text-xs font-bold text-yellow-400 mb-2 uppercase">⚠️ Safety Notes</h4>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-200">
              <ul className="space-y-1 list-disc list-inside">
                <li>Changing color values might affect visibility</li>
                <li>This code is used in multiple places</li>
                <li>Always preview changes before applying</li>
                <li>Check for dependencies in other files</li>
              </ul>
            </div>
          </div>

          {/* Q&A Section */}
          {answer && (
            <div>
              <h4 className="text-xs font-bold text-emerald-400 mb-2">Answer</h4>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-sm text-white/80">
                {answer}
              </div>
            </div>
          )}
        </div>

        {/* Ask Question Input */}
        <div className="border-t border-white/10 p-4 bg-white/5 space-y-3">
          <div className="flex gap-2">
            <input
              ref={messageInputRef}
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ask about this code..."
              className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-emerald-500/50 outline-none text-sm"
            />
            <button
              onClick={handleAsk}
              disabled={!question.trim() || isAsking}
              className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-white/50">Example: "What happens if I delete this?", "How do I make this black?"</p>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-white/10 p-4 bg-white/5 flex gap-2 justify-end">
          <button
            onClick={handleCopyExplanation}
            className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/5 transition text-sm font-medium"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          <button
            className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:bg-white/5 transition text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            Show Code
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
