import React from 'react';
import { RAGExecutionResult, RAGEvaluationMetrics, PipelineExecutionResponse } from '../types';
import { CheckCircle2, XCircle, Clock, Award, Download, FileText } from 'lucide-react';
import { exportComparisonToCSV, exportComparisonToMarkdown } from '../services/exportUtils';

interface ComparisonTableProps {
  results: Record<string, RAGExecutionResult>;
  evaluations: Record<string, RAGEvaluationMetrics>;
  recommendedArch: string;
  fullResponse?: PipelineExecutionResponse;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({
  results,
  evaluations,
  recommendedArch,
  fullResponse,
}) => {
  const architectures = Object.keys(results);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
          <Award className="h-5 w-5 text-sky-600" />
          <span>Architecture Performance Evaluation Matrix</span>
        </h3>

        {fullResponse && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => exportComparisonToCSV(fullResponse)}
              className="flex items-center space-x-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium shadow-xs"
              title="Export Evaluation Matrix as CSV"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => exportComparisonToMarkdown(fullResponse)}
              className="flex items-center space-x-1 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors font-medium shadow-xs"
              title="Export Evaluation Report as Markdown"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              <span>Export Markdown</span>
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-50">
              <th className="py-3 px-4 rounded-l-xl">Architecture</th>
              <th className="py-3 px-4">Faithfulness</th>
              <th className="py-3 px-4">Answer Relevance</th>
              <th className="py-3 px-4">Context Relevance</th>
              <th className="py-3 px-4">Latency</th>
              <th className="py-3 px-4">Overall Score</th>
              <th className="py-3 px-4 rounded-r-xl">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {architectures.map((arch) => {
              const res = results[arch];
              const ev = evaluations[arch];
              const isRecommended = arch === recommendedArch;

              return (
                <tr
                  key={arch}
                  className={`transition-colors ${
                    isRecommended
                      ? 'bg-sky-50/80 font-medium'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center space-x-2">
                    <span>{arch}</span>
                    {isRecommended && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold border border-sky-200">
                        RECOMMENDED ⭐
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium">
                    {ev ? (
                      <span className={ev.faithfulness >= 0.85 ? 'text-emerald-700 font-bold' : 'text-slate-700'}>
                        {(ev.faithfulness * 100).toFixed(0)}%
                      </span>
                    ) : 'N/A'}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium">
                    {ev ? (
                      <span className={ev.answer_relevance >= 0.85 ? 'text-emerald-700 font-bold' : 'text-slate-700'}>
                        {(ev.answer_relevance * 100).toFixed(0)}%
                      </span>
                    ) : 'N/A'}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium">
                    {ev ? (
                      <span className={ev.context_relevance >= 0.85 ? 'text-emerald-700 font-bold' : 'text-slate-700'}>
                        {(ev.context_relevance * 100).toFixed(0)}%
                      </span>
                    ) : 'N/A'}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{res?.total_time.toFixed(2)}s</span>
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-sm">
                    {ev ? (
                      <span className={isRecommended ? 'text-sky-700' : 'text-slate-800'}>
                        {ev.overall_score.toFixed(3)}
                      </span>
                    ) : 'N/A'}
                  </td>

                  <td className="py-3.5 px-4">
                    {res?.status === 'success' ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 text-xs font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Success</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-rose-700 text-xs font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

