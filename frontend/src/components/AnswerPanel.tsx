import React, { useState } from 'react';
import { CheckCircle2, FileText, Sparkles, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { PipelineExecutionResponse, DocumentChunk } from '../types';
import { CitationInspectorModal } from './CitationInspectorModal';

interface AnswerPanelProps {
  result: PipelineExecutionResponse;
}

export const AnswerPanel: React.FC<AnswerPanelProps> = ({ result }) => {
  const [copied, setCopied] = useState(false);
  const [selectedChunk, setSelectedChunk] = useState<DocumentChunk | null>(null);

  const copyAnswer = () => {
    navigator.clipboard.writeText(result.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="glass rounded-2xl p-6 shadow-sm border border-slate-200/90 bg-white mb-6 relative overflow-hidden text-left">
      {/* Top subtle pastel gradient bar */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />

      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-wider text-indigo-600 uppercase flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Grounded Final Answer • {result.selected_rag}
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5 max-w-2xl truncate">
              {result.query}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {result.is_demo_mode && (
            <span className="text-xs font-semibold text-amber-800 border border-amber-200 bg-amber-50 rounded-lg px-3 py-1">
              Offline Demo Mode
            </span>
          )}
          <button
            onClick={copyAnswer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-900 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>Copy Answer</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 text-slate-800 text-sm leading-relaxed whitespace-pre-line font-normal">
        {result.answer}
      </div>

      {result.sources && result.sources.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-500" />
              <span>Grounded Citations ({result.sources.length}) — Click to Inspect Evidence</span>
            </h3>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Zero Hallucination
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {result.sources.map((source, index) => (
              <button
                key={`${source.chunk_id || source.filename}-${index}`}
                onClick={() => setSelectedChunk(source)}
                className="text-xs text-slate-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg px-3 py-1.5 font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
                title="Click to inspect exact passage & similarity score"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform" />
                <span>{source.filename || 'Source'}{source.page_number ? ` (p.${source.page_number})` : ''}</span>
                {source.score !== undefined && (
                  <span className="text-[10px] font-mono font-bold text-emerald-700 ml-1">
                    {(source.score * 100).toFixed(0)}%
                  </span>
                )}
                <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 ml-0.5" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Citation Inspector Modal */}
      <CitationInspectorModal
        chunk={selectedChunk}
        query={result.query}
        onClose={() => setSelectedChunk(null)}
      />
    </section>
  );
};
