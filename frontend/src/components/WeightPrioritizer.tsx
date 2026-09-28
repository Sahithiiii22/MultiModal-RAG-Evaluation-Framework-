import React from 'react';
import { Sliders, ShieldCheck, Zap, BookOpen, Scale, RotateCcw } from 'lucide-react';
import { MetricWeights } from '../types';

export const DEFAULT_WEIGHTS: MetricWeights = {
  faithfulness: 0.25,
  answer_relevance: 0.20,
  context_relevance: 0.20,
  correctness: 0.15,
  context_recall: 0.10,
  efficiency: 0.10,
};

export const WEIGHT_PRESETS = [
  {
    id: 'balanced',
    name: 'Balanced Standard',
    desc: 'Equal priority for accuracy, relevance & speed',
    icon: Scale,
    activeColor: 'bg-indigo-50 border-indigo-300 text-indigo-900',
    weights: {
      faithfulness: 0.25,
      answer_relevance: 0.20,
      context_relevance: 0.20,
      correctness: 0.15,
      context_recall: 0.10,
      efficiency: 0.10,
    },
  },
  {
    id: 'zero_hallucination',
    name: 'Strict Anti-Hallucination',
    desc: 'Favors Self-RAG for strict fact-checking & verified context',
    icon: ShieldCheck,
    activeColor: 'bg-emerald-50 border-emerald-300 text-emerald-900',
    weights: {
      faithfulness: 0.50,
      answer_relevance: 0.15,
      context_relevance: 0.20,
      correctness: 0.10,
      context_recall: 0.05,
      efficiency: 0.00,
    },
  },
  {
    id: 'high_speed',
    name: 'Ultra-Fast Latency',
    desc: 'Favors Basic RAG for instant single-pass response',
    icon: Zap,
    activeColor: 'bg-amber-50 border-amber-300 text-amber-900',
    weights: {
      faithfulness: 0.20,
      answer_relevance: 0.20,
      context_relevance: 0.10,
      correctness: 0.10,
      context_recall: 0.00,
      efficiency: 0.40,
    },
  },
  {
    id: 'deep_research',
    name: 'Deep Multi-Hop Synthesis',
    desc: 'Favors Agentic & Adaptive RAG for complex multi-source reasoning',
    icon: BookOpen,
    activeColor: 'bg-purple-50 border-purple-300 text-purple-900',
    weights: {
      faithfulness: 0.20,
      answer_relevance: 0.20,
      context_relevance: 0.15,
      correctness: 0.25,
      context_recall: 0.20,
      efficiency: 0.00,
    },
  },
];

interface WeightPrioritizerProps {
  weights: MetricWeights;
  onChange: (weights: MetricWeights) => void;
  compact?: boolean;
}

export const WeightPrioritizer: React.FC<WeightPrioritizerProps> = ({
  weights,
  onChange,
  compact = false,
}) => {
  const [activePreset, setActivePreset] = React.useState<string>('balanced');
  const [showSliders, setShowSliders] = React.useState<boolean>(!compact);

  const applyPreset = (presetId: string) => {
    const preset = WEIGHT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setActivePreset(presetId);
      onChange(preset.weights);
    }
  };

  const handleSliderChange = (key: keyof MetricWeights, val: number) => {
    setActivePreset('custom');
    onChange({
      ...weights,
      [key]: val,
    });
  };

  const handleReset = () => {
    applyPreset('balanced');
  };

  return (
    <div className="glass rounded-2xl p-4 border border-slate-200/90 bg-white/95 shadow-sm space-y-3.5 text-left">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Sliders className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 tracking-tight uppercase">
            Multi-Attribute Priority Weights (Controls Winner Selection)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowSliders(!showSliders)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold transition-colors cursor-pointer"
          >
            {showSliders ? 'Hide Sliders' : 'Customize Sliders'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title="Reset to Balanced Standard"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {WEIGHT_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isSelected = activePreset === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? `${preset.activeColor} ring-1 ring-indigo-400/40 shadow-xs font-semibold`
                  : 'bg-slate-50/80 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center space-x-1.5 mb-0.5">
                <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-xs font-bold truncate">{preset.name}</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{preset.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Interactive Sliders */}
      {showSliders && (
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* Faithfulness */}
          <div className="bg-slate-50/80 border border-slate-200 p-2.5 rounded-xl space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Faithfulness (Zero-Hallucination)</span>
              <span className="font-mono text-emerald-700 font-bold">{(weights.faithfulness * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.faithfulness}
              onChange={(e) => handleSliderChange('faithfulness', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Efficiency / Latency */}
          <div className="bg-slate-50/80 border border-slate-200 p-2.5 rounded-xl space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Efficiency (Speed &amp; Latency)</span>
              <span className="font-mono text-cyan-700 font-bold">{(weights.efficiency * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.efficiency}
              onChange={(e) => handleSliderChange('efficiency', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Answer Relevance */}
          <div className="bg-slate-50/80 border border-slate-200 p-2.5 rounded-xl space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Answer Relevance</span>
              <span className="font-mono text-indigo-700 font-bold">{(weights.answer_relevance * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.answer_relevance}
              onChange={(e) => handleSliderChange('answer_relevance', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Context Relevance */}
          <div className="bg-slate-50/80 border border-slate-200 p-2.5 rounded-xl space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Context Precision &amp; Relevance</span>
              <span className="font-mono text-purple-700 font-bold">{(weights.context_relevance * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.context_relevance}
              onChange={(e) => handleSliderChange('context_relevance', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Correctness */}
          <div className="bg-slate-50/80 border border-slate-200 p-2.5 rounded-xl space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Synthesis Correctness</span>
              <span className="font-mono text-amber-700 font-bold">{(weights.correctness * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.correctness}
              onChange={(e) => handleSliderChange('correctness', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Context Recall */}
          <div className="bg-slate-50/80 border border-slate-200 p-2.5 rounded-xl space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Context Recall (Multi-doc)</span>
              <span className="font-mono text-blue-700 font-bold">{(weights.context_recall * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={weights.context_recall}
              onChange={(e) => handleSliderChange('context_recall', parseFloat(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
