import React, { useState } from 'react';
import { RAGExecutionResult, RAGEvaluationMetrics } from '../types';
import {
  ChevronDown, ChevronUp, FileText, Activity,
  Database, Layers
} from 'lucide-react';

interface ArchitectureDetailsProps {
  results: Record<string, RAGExecutionResult>;
  evaluations: Record<string, RAGEvaluationMetrics>;
}

export const ArchitectureDetails: React.FC<ArchitectureDetailsProps> = ({ results, evaluations }) => {
  const architectures = Object.keys(results);
  const [expandedArch, setExpandedArch] = useState<string | null>(architectures[0] || null);

  const toggleExpand = (arch: string) => {
    setExpandedArch(expandedArch === arch ? null : arch);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
      <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center space-x-2">
        <Layers className="h-5 w-5 text-indigo-500" />
        <span>Architecture Execution Details &amp; Traces</span>
      </h3>

      <div className="space-y-3">
        {architectures.map((arch) => {
          const res = results[arch];
          const ev = evaluations[arch];
          const isExpanded = expandedArch === arch;

          let badgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
          if (arch === 'Self-RAG') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          if (arch === 'Adaptive RAG') badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
          if (arch === 'Agentic RAG') badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';

          return (
            <div
              key={arch}
              className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all shadow-xs"
            >
              {/* Card Header */}
              <button
                onClick={() => toggleExpand(arch)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-100/70 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className={`h-8 w-8 rounded-lg border ${badgeColor} flex items-center justify-center font-bold text-xs`}>
                    {arch.split(' ')[0][0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                      <span>{arch}</span>
                      <span className="text-xs font-normal text-slate-500">
                        ({res?.retrieved_context?.length || 0} passages retrieved)
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Latency: {res?.total_time?.toFixed(2)}s | Aggregate Score: {ev?.overall_score?.toFixed(3)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="hidden sm:flex items-center space-x-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 font-medium shadow-xs">
                      Faithfulness: {ev ? (ev.faithfulness * 100).toFixed(0) : 0}%
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200 font-medium shadow-xs">
                      Context Rel: {ev ? (ev.context_relevance * 100).toFixed(0) : 0}%
                    </span>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded Body */}
              {isExpanded && res && (
                <div className="p-5 border-t border-slate-200 bg-white space-y-6">
                  {/* Section 1: Generated Answer */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-indigo-500" />
                      <span>Generated Answer</span>
                    </h5>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-slate-800 text-sm leading-relaxed whitespace-pre-line">
                      {res.answer}
                    </div>
                  </div>

                  {/* Section 2: Source Citations & Retrieved Chunks */}
                  <div>
                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center space-x-2">
                      <Database className="h-4 w-4 text-emerald-600" />
                      <span>Retrieved Context ({res.retrieved_context?.length || 0} passages)</span>
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {res.retrieved_context && res.retrieved_context.map((chunk, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="font-semibold text-slate-800 flex items-center space-x-1">
                              <span className="text-indigo-600">[{chunk.citation_index || idx + 1}]</span>
                              <span className="truncate max-w-[180px]">{chunk.filename}</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 font-medium">
                              Page {chunk.page_number || 1} • Sim: {(chunk.score || 0).toFixed(3)}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed italic line-clamp-3">
                            "{chunk.text}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Execution Trace & Intermediate States */}
                  {res.execution_trace && res.execution_trace.length > 0 && (
                    <div>
                      <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center space-x-2">
                        <Activity className="h-4 w-4 text-amber-600" />
                        <span>Execution Trace</span>
                      </h5>

                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 text-xs">
                        {res.execution_trace.map((step: any, sIdx: number) => (
                          <div key={sIdx} className="flex items-start space-x-3 border-b border-slate-200 pb-2.5 last:border-b-0 last:pb-0">
                            <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                              #{step.step}
                            </span>
                            <div className="space-y-1">
                              <div className="font-semibold text-slate-800">{step.action}</div>
                              {step.decision && (
                                <div className="text-emerald-700 font-mono text-[11px] font-medium">
                                  Verdict: {step.decision}
                                </div>
                              )}
                              {step.reasoning && (
                                <div className="text-slate-600 text-[11px]">{step.reasoning}</div>
                              )}
                              {step.plan && (
                                <div className="space-y-0.5 text-slate-600 font-mono text-[10px] pt-1">
                                  {step.plan.map((pItem: string, pIdx: number) => (
                                    <div key={pIdx}>{pItem}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
