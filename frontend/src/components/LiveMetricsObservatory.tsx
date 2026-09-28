import React, { useState } from 'react';
import {
  Award, BarChart3, Zap, ShieldCheck, CheckCircle2, ChevronDown,
  ChevronUp, Sparkles, Layers, Activity, Clock, FileText, ArrowRight
} from 'lucide-react';
import { PipelineExecutionResponse, DocumentChunk } from '../types';

interface LiveMetricsObservatoryProps {
  result: PipelineExecutionResponse | null;
  onInspectCitation?: (chunk: DocumentChunk, query: string) => void;
}

export const LiveMetricsObservatory: React.FC<LiveMetricsObservatoryProps> = ({
  result,
  onInspectCitation,
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'tradeoffs' | 'trace'>('matrix');

  const formatPct = (val?: number | null) => {
    if (val === undefined || val === null) return 'N/A';
    return `${(val * 100).toFixed(0)}%`;
  };

  if (!result) {
    return (
      <div className="glass rounded-2xl p-8 text-center flex flex-col items-center justify-center h-full min-h-[500px] border border-slate-200/80 bg-white/70 shadow-sm">
        <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 mb-4 shadow-sm">
          <Activity className="h-7 w-7 animate-pulse" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Architecture &amp; Metrics Observatory</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-2 leading-relaxed">
          Ask any question in the chat. As soon as your query runs, all 4 RAG architectures will be evaluated across 6 standardized metrics and the finalized winner will populate here live.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-2.5 w-full max-w-xs text-left">
          {["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"].map((arch) => (
            <div key={arch} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs font-medium text-slate-600 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-300" />
              <span>{arch}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const winner = result.final_judge.recommended_architecture;
  const winnerEval = result.evaluations[winner];
  const winnerResult = result.rag_results[winner];

  return (
    <div className="glass rounded-2xl p-5 border border-slate-200/90 bg-white/90 shadow-md flex flex-col space-y-4 text-left animate-slideUp">
      {/* ── TOP SECTION: FINAL JUDGE DECISION BANNER ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100/80 pb-2.5 mb-2.5">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-700">
                Finalized Architecture Winner
              </span>
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <span>{winner}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold font-mono">
                  {(result.final_judge.confidence * 100).toFixed(0)}% Confidence
                </span>
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-white/90 border border-indigo-100 font-semibold text-indigo-700 shadow-2xs">
              Query: {result.query_classification.query_type.replace('_', ' ')}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200 text-slate-600 font-mono">
              ⚡ {result.total_pipeline_time.toFixed(2)}s
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-700 leading-relaxed font-normal bg-white/70 p-2.5 rounded-xl border border-indigo-50">
          <strong className="text-indigo-900">Why {winner} Won: </strong>
          {result.final_judge.reason}
        </p>
      </div>

      {/* ── 4-ARCHITECTURE SCORE CARDS ROW ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
            <span>Overall Score Comparison</span>
          </span>
          <span className="text-[11px] text-slate-400 font-medium">Weighted Score (0 to 1.0)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"].map((arch) => {
            const ev = result.evaluations[arch];
            const resObj = result.rag_results[arch];
            const isWinner = arch === winner;

            return (
              <div
                key={arch}
                className={`p-3 rounded-xl border transition-all ${isWinner
                    ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/30 shadow-md shadow-indigo-100/80 text-slate-900'
                    : 'bg-slate-50/70 border-slate-200/80 text-slate-600 hover:bg-slate-100/70'
                  }`}
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="truncate">{arch}</span>
                  {isWinner && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                      ★ WINNER
                    </span>
                  )}
                </div>
                <div className="text-base font-bold font-mono text-indigo-600">
                  {ev ? ev.overall_score.toFixed(3) : '0.000'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {resObj ? `${resObj.total_time.toFixed(2)}s latency` : '0.00s'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── TAB SELECTOR ── */}
      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex-1 py-1.5 rounded-lg transition-all text-center ${activeTab === 'matrix'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Metrics Matrix (6 Dimensions)
        </button>
        <button
          onClick={() => setActiveTab('tradeoffs')}
          className={`flex-1 py-1.5 rounded-lg transition-all text-center ${activeTab === 'tradeoffs'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Comparative Trade-Offs
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`flex-1 py-1.5 rounded-lg transition-all text-center ${activeTab === 'trace'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200 font-bold'
              : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Execution Trace
        </button>
      </div>

      {/* ── TAB 1: METRICS MATRIX TABLE ── */}
      {activeTab === 'matrix' && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                <th className="py-2 px-3">Architecture</th>
                <th className="py-2 px-2 text-center">Faithfulness</th>
                <th className="py-2 px-2 text-center">Answer Rel</th>
                <th className="py-2 px-2 text-center">Context Rel</th>
                <th className="py-2 px-2 text-center">Correctness</th>
                <th className="py-2 px-2 text-center">Recall</th>
                <th className="py-2 px-2 text-center">Latency</th>
                <th className="py-2 px-3 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"].map((arch) => {
                const ev = result.evaluations[arch];
                const resObj = result.rag_results[arch];
                const isWinner = arch === winner;

                return (
                  <tr
                    key={arch}
                    className={isWinner ? 'bg-indigo-50/50 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-50/60'}
                  >
                    <td className="py-2 px-3 font-bold flex items-center space-x-1.5 whitespace-nowrap">
                      <span>{arch}</span>
                      {isWinner && <span className="text-[10px] text-indigo-600 font-bold">★ Winner</span>}
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-semibold text-emerald-600">{formatPct(ev?.faithfulness)}</td>
                    <td className="py-2 px-2 text-center font-mono text-indigo-600">{formatPct(ev?.answer_relevance)}</td>
                    <td className="py-2 px-2 text-center font-mono text-sky-600">{formatPct(ev?.context_relevance)}</td>
                    <td className="py-2 px-2 text-center font-mono text-amber-600">{formatPct(ev?.correctness)}</td>
                    <td className="py-2 px-2 text-center font-mono text-purple-600">{formatPct(ev?.context_recall)}</td>
                    <td className="py-2 px-2 text-center font-mono text-slate-500 whitespace-nowrap">{resObj ? `${resObj.total_time.toFixed(2)}s` : '0.00s'}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-indigo-700">
                      {ev ? ev.overall_score.toFixed(3) : '0.000'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TAB 2: TRADE-OFF ANALYSIS ── */}
      {activeTab === 'tradeoffs' && (
        <div className="space-y-2.5">
          {result.final_judge.tradeoff_analysis && Object.entries(result.final_judge.tradeoff_analysis).map(([tKey, tVal]) => (
            <div key={tKey} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200 text-xs">
              <div className="font-bold text-indigo-900 mb-1 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>{tKey}</span>
              </div>
              <p className="text-slate-600 leading-relaxed font-normal">{tVal}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 3: EXECUTION TRACE ── */}
      {activeTab === 'trace' && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {winnerResult?.execution_trace && winnerResult.execution_trace.map((step, idx) => (
            <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="text-indigo-600">Step {step.step || idx + 1}: {step.action}</span>
                {step.decision && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
                    {step.decision}
                  </span>
                )}
              </div>
              {step.details && <p className="text-slate-600 font-mono text-[11px]">{step.details}</p>}
              {step.reasoning && <p className="text-slate-600 italic">{step.reasoning}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
