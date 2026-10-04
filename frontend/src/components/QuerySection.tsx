import React, { useState, useRef } from 'react';
import { 
  Search, Sparkles, CheckSquare, Square, Play, Sliders, ChevronDown, ChevronUp, 
  Shield, Zap, BookOpen, Scale, Paperclip, FileText, Image as ImageIcon, X, CheckCircle2, Loader2 
} from 'lucide-react';
import { MetricWeights } from '../types';
import { api } from '../services/api';

interface QuerySectionProps {
  onRunQuery: (query: string, selectedArchitectures: string[], metricWeights?: MetricWeights, mode?: 'routed' | 'benchmark') => void;
  isLoading: boolean;
  onDocumentUploaded?: () => void;
}

const PRESET_QUERIES = [
  "Summarize the key information from the uploaded document.",
  "Compare Self-RAG and Adaptive RAG in terms of latency, faithfulness, and context filtering.",
  "Explain step-by-step how Agentic RAG plans and executes multi-tool searches.",
  "What metrics are used to measure context relevance, context precision, and faithfulness?"
];

const ALL_ARCHITECTURES = ["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"];

export const DEFAULT_WEIGHTS: MetricWeights = {
  faithfulness: 0.25,
  answer_relevance: 0.20,
  context_relevance: 0.20,
  correctness: 0.15,
  context_recall: 0.10,
  efficiency: 0.10
};

const PRESET_WEIGHTS_MAP = {
  balanced: {
    name: "Balanced Standard",
    icon: Scale,
    color: "bg-indigo-50 text-indigo-900 border-indigo-300",
    weights: { faithfulness: 0.25, answer_relevance: 0.20, context_relevance: 0.20, correctness: 0.15, context_recall: 0.10, efficiency: 0.10 }
  },
  hallucination_zero: {
    name: "Zero Hallucination",
    icon: Shield,
    color: "bg-emerald-50 text-emerald-900 border-emerald-300",
    weights: { faithfulness: 0.50, answer_relevance: 0.15, context_relevance: 0.20, correctness: 0.10, context_recall: 0.05, efficiency: 0.00 }
  },
  speed: {
    name: "Ultra-Fast Speed",
    icon: Zap,
    color: "bg-amber-50 text-amber-900 border-amber-300",
    weights: { faithfulness: 0.20, answer_relevance: 0.20, context_relevance: 0.10, correctness: 0.10, context_recall: 0.00, efficiency: 0.40 }
  },
  deep_research: {
    name: "Deep Multi-Hop",
    icon: BookOpen,
    color: "bg-purple-50 text-purple-900 border-purple-300",
    weights: { faithfulness: 0.20, answer_relevance: 0.20, context_relevance: 0.15, correctness: 0.25, context_recall: 0.20, efficiency: 0.00 }
  }
};

export const QuerySection: React.FC<QuerySectionProps> = ({ onRunQuery, isLoading, onDocumentUploaded }) => {
  const [query, setQuery] = useState('');
  const [selectedArchs, setSelectedArchs] = useState<string[]>(ALL_ARCHITECTURES);
  const [executionMode, setExecutionMode] = useState<'routed' | 'benchmark'>('benchmark');
  const [showWeightSliders, setShowWeightSliders] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('balanced');
  const [weights, setWeights] = useState<MetricWeights>(DEFAULT_WEIGHTS);
  
  // Multimodal Attachment State
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleArch = (arch: string) => {
    if (selectedArchs.includes(arch)) {
      if (selectedArchs.length > 1) {
        setSelectedArchs(selectedArchs.filter((a) => a !== arch));
      }
    } else {
      setSelectedArchs([...selectedArchs, arch]);
    }
  };

  const selectAll = () => setSelectedArchs(ALL_ARCHITECTURES);

  const applyPreset = (presetKey: string) => {
    setActivePreset(presetKey);
    const preset = PRESET_WEIGHTS_MAP[presetKey as keyof typeof PRESET_WEIGHTS_MAP];
    if (preset) {
      setWeights(preset.weights);
    }
  };

  const updateWeight = (key: keyof MetricWeights, val: number) => {
    setActivePreset('custom');
    setWeights(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFile(file);
    setIsUploadingFile(true);
    setUploadError(null);
    setUploadSuccessMsg(null);

    try {
      const res = await api.uploadDocument(file);
      setUploadSuccessMsg(`Indexed "${file.name}" (${res.chunks_created} chunks extracted)`);
      if (onDocumentUploaded) onDocumentUploaded();
      if (!query.trim()) {
        setQuery(`Summarize the main details and key insights from ${file.name}`);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setUploadSuccessMsg(null);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading && !isUploadingFile) {
      onRunQuery(query.trim(), selectedArchs, weights, executionMode);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 shadow-sm border border-slate-200/90 bg-white mb-6 text-left">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
          <div>
            <label htmlFor="rag-query-input" className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Search className="h-4 w-4 text-indigo-600" />
              <span>Multimodal Query &amp; Architecture Evaluator</span>
            </label>
            <span className="text-xs text-slate-500 font-medium">
              Execute with Learned ML Router or Full Parallel Benchmark
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setExecutionMode('routed')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                executionMode === 'routed'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Smart Auto-Routed (Fast &amp; 75% Savings)</span>
            </button>
            <button
              type="button"
              onClick={() => setExecutionMode('benchmark')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                executionMode === 'benchmark'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="h-3.5 w-3.5 text-indigo-600" />
              <span>Full 4-RAG Benchmark</span>
            </button>
          </div>
        </div>

        {/* Attachment Pill if present */}
        {attachedFile && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs">
            <div className="flex items-center space-x-2">
              {isUploadingFile ? (
                <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 text-indigo-600" />
              )}
              <span className="font-semibold text-slate-800 truncate max-w-sm">{attachedFile.name}</span>
              <span className="text-[11px] text-slate-500">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
              {uploadSuccessMsg && (
                <span className="text-emerald-700 font-medium flex items-center space-x-1 pl-2 border-l border-indigo-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{uploadSuccessMsg}</span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={clearAttachment}
              className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
              title="Remove attachment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {uploadError && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {uploadError}
          </div>
        )}

        {/* Large Text Area with Integrated File Attachment button */}
        <div className="relative">
          <textarea
            id="rag-query-input"
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your question (e.g. text query, multi-hop question, or attach PDF/DOCX/TXT/Image below)..."
            className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 rounded-xl p-4 pr-32 pb-12 text-sm border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all resize-none shadow-inner"
            disabled={isLoading || isUploadingFile}
          />

          {/* Bottom actions inside textarea bar */}
          <div className="absolute left-3 bottom-3 flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.docx,.doc,.txt,.csv,.png,.jpg,.jpeg,.webp,.mp4,.mov,.mp3,.wav"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploadingFile}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer shadow-2xs"
              title="Attach PDF, Word document, TXT, CSV, or Image"
            >
              <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
              <span>Attach File (PDF/Doc/Image)</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !query.trim() || isUploadingFile}
            className="absolute right-3 bottom-3 flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-200 transition-all cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Run Evaluation</span>
              </>
            )}
          </button>
        </div>

        {/* Architecture Toggles & Metric Presets Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-bold mr-1">RAG Architectures:</span>
            {ALL_ARCHITECTURES.map((arch) => {
              const isSelected = selectedArchs.includes(arch);
              let activeColor = 'bg-sky-50 border-sky-300 text-sky-900';
              if (arch === 'Self-RAG') activeColor = 'bg-emerald-50 border-emerald-300 text-emerald-900';
              if (arch === 'Adaptive RAG') activeColor = 'bg-indigo-50 border-indigo-300 text-indigo-900';
              if (arch === 'Agentic RAG') activeColor = 'bg-purple-50 border-purple-300 text-purple-900';

              return (
                <button
                  key={arch}
                  type="button"
                  onClick={() => toggleArch(arch)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? activeColor + ' shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-3.5 w-3.5 text-indigo-600" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>{arch}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-bold ml-2 cursor-pointer"
            >
              Select All (4)
            </button>
          </div>

          {/* Metric Weights Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowWeightSliders(!showWeightSliders)}
            className="flex items-center space-x-1.5 text-xs text-slate-700 hover:text-indigo-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors font-semibold cursor-pointer"
          >
            <Sliders className="h-3.5 w-3.5 text-indigo-600" />
            <span>Judge Weights ({activePreset === 'custom' ? 'Custom' : PRESET_WEIGHTS_MAP[activePreset as keyof typeof PRESET_WEIGHTS_MAP]?.name})</span>
            {showWeightSliders ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Priority Presets & Sliders Panel */}
        {showWeightSliders && (
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3.5 animate-slideUp">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <span className="text-xs font-bold text-slate-800">Select Evaluation Priority Preset:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {Object.entries(PRESET_WEIGHTS_MAP).map(([key, config]) => {
                  const Icon = config.icon;
                  const isCur = activePreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => applyPreset(key)}
                      className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                        isCur ? `${config.color} shadow-2xs` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{config.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metric Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              <div>
                <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Faithfulness:</span>
                  <span className="font-mono font-bold text-emerald-700">{(weights.faithfulness * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.faithfulness}
                  onChange={(e) => updateWeight('faithfulness', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Answer Relevance:</span>
                  <span className="font-mono font-bold text-indigo-700">{(weights.answer_relevance * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.answer_relevance}
                  onChange={(e) => updateWeight('answer_relevance', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Context Relevance:</span>
                  <span className="font-mono font-bold text-purple-700">{(weights.context_relevance * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.context_relevance}
                  onChange={(e) => updateWeight('context_relevance', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Synthesis Correctness:</span>
                  <span className="font-mono font-bold text-amber-700">{(weights.correctness * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.correctness}
                  onChange={(e) => updateWeight('correctness', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Context Recall:</span>
                  <span className="font-mono font-bold text-blue-700">{(weights.context_recall * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.context_recall}
                  onChange={(e) => updateWeight('context_recall', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Efficiency / Latency:</span>
                  <span className="font-mono font-bold text-cyan-700">{(weights.efficiency * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.efficiency}
                  onChange={(e) => updateWeight('efficiency', parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Suggested Queries */}
        <div className="pt-2 flex items-center space-x-2 overflow-x-auto">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Suggested:</span>
          <div className="flex items-center space-x-2">
            {PRESET_QUERIES.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuery(q)}
                className="text-xs bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-900 px-3 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-2xs font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
};
