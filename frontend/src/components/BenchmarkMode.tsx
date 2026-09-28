import React, { useState } from 'react';
import { Award, Play, Trophy, BarChart2, Loader2, Download, FileText, FileCode } from 'lucide-react';
import { BenchmarkResponse, MetricWeights } from '../types';
import { api } from '../services/api';
import { exportBenchmarkToCSV, exportBenchmarkToMarkdown, exportToJSON } from '../services/exportUtils';

export const BenchmarkMode: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBenchmark = async (weights?: MetricWeights) => {
    setIsRunning(true);
    setError(null);
    try {
      const res = await api.runBenchmark(weights);
      setBenchmarkResult(res);
    } catch (err: any) {
      setError(err.message || 'Benchmark execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600">
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Automated Architecture Benchmark Suite</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluates standardized query batches to calculate empirical Win Rates and multi-metric averages.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {benchmarkResult && (
            <>
              <button
                type="button"
                onClick={() => exportBenchmarkToCSV(benchmarkResult)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-xs"
                title="Export Benchmark Summary as CSV"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => exportBenchmarkToMarkdown(benchmarkResult)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-xs"
                title="Export Benchmark Report as Markdown"
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span>Export Markdown</span>
              </button>
              <button
                type="button"
                onClick={() => exportToJSON(benchmarkResult, 'benchmark_suite')}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-xs"
                title="Export Raw JSON"
              >
                <FileCode className="h-3.5 w-3.5 text-slate-500" />
                <span>JSON</span>
              </button>
            </>
          )}

          <button
            onClick={() => handleRunBenchmark()}
            disabled={isRunning}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Evaluating Benchmark Suite...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Run Automated Benchmark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {/* Results View */}
      {benchmarkResult && (
        <div className="space-y-6">
          {/* Win Rate Cards */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center space-x-2">
              <Award className="h-5 w-5 text-amber-500" />
              <span>Win Rate Summary ({benchmarkResult.total_queries} Test Queries Evaluated)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {benchmarkResult.summaries.map((s, idx) => (
                <div
                  key={s.architecture}
                  className={`bg-slate-50 border rounded-xl p-4 space-y-3 shadow-xs ${
                    idx === 0 ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{s.architecture}</span>
                    {idx === 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        LEADER 👑
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-500">Win Rate</span>
                      <span className="text-2xl font-bold font-mono text-amber-600">
                        {s.win_rate_percent.toFixed(0)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${s.win_rate_percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-500 border-t border-slate-200 pt-2">
                    <div>Faithfulness: <span className="text-slate-800 font-semibold">{(s.avg_faithfulness * 100).toFixed(0)}%</span></div>
                    <div>Latency: <span className="text-slate-800 font-semibold">{s.avg_latency_sec.toFixed(2)}s</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Benchmark Summary Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
            <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center space-x-2">
              <BarChart2 className="h-5 w-5 text-indigo-500" />
              <span>Aggregate Performance Metrics</span>
            </h3>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase font-semibold bg-slate-50">
                  <th className="py-3 px-4 rounded-l-lg">Architecture</th>
                  <th className="py-3 px-4">Win Rate</th>
                  <th className="py-3 px-4">Wins</th>
                  <th className="py-3 px-4">Avg Faithfulness</th>
                  <th className="py-3 px-4">Avg Answer Relevance</th>
                  <th className="py-3 px-4">Avg Context Relevance</th>
                  <th className="py-3 px-4">Avg Latency</th>
                  <th className="py-3 px-4 rounded-r-lg">Avg Overall Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {benchmarkResult.summaries.map((s) => (
                  <tr key={s.architecture} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 font-sans">{s.architecture}</td>
                    <td className="py-3.5 px-4 font-bold text-amber-600">{s.win_rate_percent.toFixed(1)}%</td>
                    <td className="py-3.5 px-4 text-slate-600">{s.win_count} / {benchmarkResult.total_queries}</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold">{(s.avg_faithfulness * 100).toFixed(0)}%</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold">{(s.avg_answer_relevance * 100).toFixed(0)}%</td>
                    <td className="py-3.5 px-4 text-emerald-700 font-semibold">{(s.avg_context_relevance * 100).toFixed(0)}%</td>
                    <td className="py-3.5 px-4 text-slate-600">{s.avg_latency_sec.toFixed(2)}s</td>
                    <td className="py-3.5 px-4 font-bold text-indigo-600">{s.avg_overall_score.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
