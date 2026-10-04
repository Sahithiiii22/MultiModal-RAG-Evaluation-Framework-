import React, { useState, useEffect, useRef } from 'react';
import { Navbar, NavTab }     from './components/Navbar';
import { SignIn }             from './components/SignIn';
import { QuerySection }       from './components/QuerySection';
import { ProgressIndicator }  from './components/ProgressIndicator';
import { RecommendationPanel } from './components/RecommendationPanel';
import { MetricsDashboard }   from './components/MetricsDashboard';
import { DocumentManager }    from './components/DocumentManager';
import { BenchmarkMode }      from './components/BenchmarkMode';
import { HistoryView }        from './components/HistoryView';
import { AnswerPanel }        from './components/AnswerPanel';
import { DEFAULT_WEIGHTS }    from './components/WeightPrioritizer';
import { PipelineExecutionResponse, RoutedQueryResponse, RouterStats, DocumentMetadata, MetricWeights, DocumentChunk } from './types';
import { api }                from './services/api';
import { AlertTriangle, Layers, BarChart2, ArrowRight, Sparkles, CheckCircle2, Clock, ShieldCheck, Zap, BrainCircuit, Check, Copy, ExternalLink, Cpu } from 'lucide-react';
import { CitationInspectorModal } from './components/CitationInspectorModal';

const STORAGE_KEY = 'rag_user';

export function App() {
  const [user, setUser]                   = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [activeTab, setActiveTab]         = useState<NavTab>('workspace');
  const [isLoading, setIsLoading]         = useState(false);
  const [currentResult, setCurrentResult] = useState<PipelineExecutionResponse | null>(null);
  const [routedResult, setRoutedResult]   = useState<RoutedQueryResponse | null>(null);
  const [routerStats, setRouterStats]     = useState<RouterStats | null>(null);
  const [documents, setDocuments]         = useState<DocumentMetadata[]>([]);
  const [isDemoMode, setIsDemoMode]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [historyList, setHistoryList]     = useState<PipelineExecutionResponse[]>([]);
  const [metricWeights]                   = useState<MetricWeights>(DEFAULT_WEIGHTS);
  
  // State for citation inspector in routed mode
  const [selectedCitationChunk, setSelectedCitationChunk] = useState<DocumentChunk | null>(null);
  const [copiedRoutedAnswer, setCopiedRoutedAnswer] = useState(false);

  useEffect(() => { 
    if (user) {
      loadHealthAndDocs();
      loadRouterStats();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'metrics') {
      loadRouterStats();
      api.getHistory().then((list) => {
        if (list && list.length > 0) {
          setHistoryList(list);
          if (!currentResult) {
            setCurrentResult(list[0]);
          }
        }
      }).catch(console.error);
    }
  }, [activeTab]);

  const loadHealthAndDocs = async () => {
    try {
      const health = await api.getHealth();
      setIsDemoMode(health.llm_provider === 'demo');
      const docs = await api.getDocuments();
      setDocuments(docs);
      
      // Auto-load latest query result from history if available
      const historyList = await api.getHistory();
      if (historyList && historyList.length > 0 && !currentResult) {
        setCurrentResult(historyList[0]);
      }
    } catch (err) {
      console.error('Failed to load health and docs:', err);
    }
  };

  const loadRouterStats = async () => {
    try {
      const stats = await api.getRouterStats();
      setRouterStats(stats);
    } catch (err) {
      console.error('Failed to load router stats:', err);
    }
  };

  const handleSignIn = (name: string) => {
    localStorage.setItem(STORAGE_KEY, name);
    setUser(name);
  };

  const handleSignOut = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setCurrentResult(null);
    setRoutedResult(null);
  };

  const handleRunQuery = async (
    query: string, 
    selectedArchitectures: string[], 
    customWeights?: MetricWeights, 
    mode: 'routed' | 'benchmark' = 'benchmark'
  ) => {
    setIsLoading(true);
    setError(null);
    setCurrentResult(null);
    setRoutedResult(null);

    try {
      if (mode === 'routed') {
        const res = await api.executeRoutedQuery(query);
        setRoutedResult(res);
        setIsDemoMode(res.is_demo_mode);
        loadRouterStats(); // refresh agreement stats
      } else {
        const weightsToUse = customWeights || metricWeights;
        const res = await api.executeQuery(query, selectedArchitectures, weightsToUse);
        setCurrentResult(res);
        setIsDemoMode(res.is_demo_mode);
        loadRouterStats();
      }
    } catch (err: any) {
      setError(err.message || 'Pipeline execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = (res: PipelineExecutionResponse) => {
    setCurrentResult(res);
    setRoutedResult(null);
    setActiveTab('workspace');
  };

  const copyRoutedText = () => {
    if (routedResult) {
      navigator.clipboard.writeText(routedResult.answer);
      setCopiedRoutedAnswer(true);
      setTimeout(() => setCopiedRoutedAnswer(false), 2000);
    }
  };

  // ── Unauthenticated State: Show Pastel Sign-In ──
  if (!user) {
    return <SignIn onSignIn={handleSignIn} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6fb]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDemoMode={isDemoMode}
        documentCount={documents.length}
        userName={user}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Error notification banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-sm flex items-center space-x-2 shadow-xs animate-slideUp">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-500" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* ── 1. QUERY & ANSWERS TAB ── */}
        {activeTab === 'workspace' && (
          <div className="space-y-6">
            {/* Multimodal Query Input Card */}
            <QuerySection 
              onRunQuery={handleRunQuery} 
              isLoading={isLoading} 
              onDocumentUploaded={loadHealthAndDocs}
            />

            {/* Live Parallel Progress Bar */}
            <ProgressIndicator isLoading={isLoading} />

            {/* ── ROUTED SINGLE PIPELINE EXECUTION RESULT ── */}
            {routedResult && !isLoading && (
              <div className="space-y-6 animate-slideUp text-left">
                {/* Router Badge Bar */}
                <div className="glass rounded-2xl p-5 bg-gradient-to-r from-indigo-50/80 via-white to-amber-50/80 border border-indigo-200 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-amber-500 text-white shadow-xs">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                          <span>⚡ Learned ML Router Prediction</span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 rounded-full font-bold">
                            {(routedResult.router_prediction.confidence * 100).toFixed(0)}% Confidence
                          </span>
                        </div>
                        <h2 className="text-base font-bold text-slate-900 mt-0.5">
                          Routed to <span className="text-indigo-600">{routedResult.selected_pipeline}</span> in {routedResult.router_prediction.routing_time_ms}ms
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs">
                        💰 Saved ~{routedResult.router_prediction.estimated_token_savings_pct}% Tokens (~{routedResult.latency_saved_estimate_s}s Latency)
                      </span>
                      <button
                        onClick={() => setActiveTab('metrics')}
                        className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs cursor-pointer"
                      >
                        View Router Stats &rarr;
                      </button>
                    </div>
                  </div>

                  {/* Feature Breakdown Pill Row */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pt-1">
                    <span className="font-semibold text-slate-700">Inferred Signals:</span>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-mono">
                      Words: {routedResult.router_prediction.features.word_count}
                    </span>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-mono">
                      Factoid: {routedResult.router_prediction.features.is_factoid ? 'Yes' : 'No'}
                    </span>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-mono">
                      Reasoning: {routedResult.router_prediction.features.is_reasoning_multihop ? 'Yes' : 'No'}
                    </span>
                    <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-mono">
                      Score Spread: {routedResult.router_prediction.features.retrieval_score_spread.toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* Grounded Answer Card for Routed Mode */}
                <section className="glass rounded-2xl p-6 shadow-sm border border-slate-200/90 bg-white relative overflow-hidden text-left">
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500" />
                  
                  <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold tracking-wider text-indigo-600 uppercase flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Optimal Grounded Output &bull; {routedResult.selected_pipeline}
                        </div>
                        <h2 className="text-base font-bold text-slate-900 mt-0.5 max-w-2xl truncate">
                          {routedResult.query}
                        </h2>
                      </div>
                    </div>

                    <button
                      onClick={copyRoutedText}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-900 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
                    >
                      {copiedRoutedAnswer ? (
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

                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-5 text-slate-800 text-sm leading-relaxed whitespace-pre-line font-normal">
                    {routedResult.answer}
                  </div>

                  {routedResult.sources && routedResult.sources.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Grounded Evidence ({routedResult.sources.length}) &bull; Click to Inspect Source</span>
                        </h3>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {routedResult.sources.map((source, index) => (
                          <button
                            key={`${source.chunk_id || source.filename}-${index}`}
                            onClick={() => setSelectedCitationChunk(source)}
                            className="text-xs text-slate-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg px-3 py-1.5 font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
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
                </section>
              </div>
            )}

            {/* ── FULL 4-RAG BENCHMARK EXECUTION RESULT ── */}
            {currentResult && !isLoading && (
              <div className="space-y-6 animate-slideUp">
                {/* 1. Grounded Answer Panel (with citations & architecture tabs) */}
                <AnswerPanel result={currentResult} />

                {/* 2. Final Judge Recommendation Panel (which RAG architecture is suitable & why) */}
                <RecommendationPanel
                  judge={currentResult.final_judge}
                  classification={currentResult.query_classification}
                />

                {/* 3. Quick Architecture Summary Cards & Navigation CTA */}
                <div className="glass rounded-2xl p-6 bg-white border border-slate-200 shadow-sm space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        <span>Architectures Evaluated for This Query</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        All 4 pipelines executed in parallel. Results were fed into the Learned ML Router to continuously improve accuracy.
                      </p>
                    </div>

                    <button
                      onClick={() => setActiveTab('metrics')}
                      className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold
                                 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                                 text-white shadow-md shadow-indigo-100 transition-all cursor-pointer self-start sm:self-auto"
                    >
                      <BarChart2 className="h-3.5 w-3.5" />
                      <span>View Full Metrics &amp; Graphs</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* 4 Architecture Mini Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                    {Object.entries(currentResult.rag_results).map(([archName, res]) => {
                      const evalMetrics = currentResult.evaluations[archName];
                      const isWinner = currentResult.final_judge.recommended_architecture === archName;

                      let badgeColor = 'bg-sky-50 text-sky-800 border-sky-200';
                      if (archName === 'Self-RAG') badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                      if (archName === 'Adaptive RAG') badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
                      if (archName === 'Agentic RAG') badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';

                      return (
                        <div
                          key={archName}
                          className={`p-4 rounded-xl border text-left space-y-2.5 transition-all bg-slate-50/50 ${
                            isWinner ? 'border-indigo-300 ring-2 ring-indigo-400/20 bg-indigo-50/20 shadow-xs' : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${badgeColor}`}>
                              {archName}
                            </span>
                            {isWinner && (
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Winner
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Overall Quality:</span>
                              <span className="font-mono font-bold text-slate-900">
                                {evalMetrics ? (evalMetrics.overall_score * 100).toFixed(0) + '%' : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Faithfulness:</span>
                              <span className="font-mono font-bold text-emerald-700">
                                {evalMetrics ? (evalMetrics.faithfulness * 100).toFixed(0) + '%' : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Latency:</span>
                              <span className="font-mono text-slate-700">
                                {res.total_time ? `${res.total_time.toFixed(2)}s` : '0.00s'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Empty State when no query is executed yet */}
            {!currentResult && !routedResult && !isLoading && (
              <div className="glass rounded-2xl p-12 text-center space-y-4 border border-slate-200 bg-white shadow-sm">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
                  <Layers className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Ready to Evaluate RAG Pipelines</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Choose <strong>Smart Auto-Routed</strong> for instant single-pipeline execution with 75% token savings, or <strong>Full 4-RAG Benchmark</strong> to compare all pipelines in parallel.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 2. METRICS & INSIGHTS TAB (DEDICATED PAGE) ── */}
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {currentResult ? (
              <div className="space-y-6 animate-slideUp">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-left">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart2 className="h-3.5 w-3.5" />
                      <span>Evaluation Analytics &amp; Radar Observatory</span>
                    </span>
                    <h2 className="text-base font-bold text-slate-900 truncate max-w-2xl">
                      Query: &ldquo;{currentResult.query}&rdquo;
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {historyList.length > 1 && (
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-slate-500 font-medium whitespace-nowrap hidden sm:inline">Inspecting Run:</label>
                        <select
                          value={currentResult?.execution_id || ''}
                          onChange={(e) => {
                            const found = historyList.find(h => h.execution_id === e.target.value);
                            if (found) setCurrentResult(found);
                          }}
                          className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer max-w-xs truncate"
                        >
                          {historyList.map((item, i) => (
                            <option key={item.execution_id || i} value={item.execution_id}>
                              {item.query.length > 35 ? item.query.substring(0, 35) + '...' : item.query} ({item.final_judge.recommended_architecture})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      onClick={() => setActiveTab('workspace')}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      <span>&larr; Back to Query</span>
                    </button>
                  </div>
                </div>

                <MetricsDashboard
                  results={currentResult.rag_results}
                  evaluations={currentResult.evaluations}
                  judge={currentResult.final_judge}
                  fullResponse={currentResult}
                  routerStats={routerStats}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Always show Router Observatory even before a benchmark query */}
                {routerStats && (
                  <div className="glass rounded-2xl p-6 bg-white border border-slate-200 shadow-sm text-left space-y-4">
                    <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                      <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                        <BrainCircuit className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span>Learned ML RAG Router Observatory</span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            Online Self-Improving
                          </span>
                        </h2>
                        <p className="text-xs text-slate-500">
                          Flywheel learning engine trained on empirical multi-metric Final Judge decisions.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Judge Agreement Rate</div>
                        <div className="text-xl font-black text-indigo-700 font-mono">
                          {(routerStats.judge_agreement_rate * 100).toFixed(1)}%
                        </div>
                        <div className="text-[11px] text-slate-500">Matches Judge top choice</div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Avg Latency Saved</div>
                        <div className="text-xl font-black text-emerald-700 font-mono">
                          {(routerStats.avg_latency_saved_ms / 1000).toFixed(2)}s
                        </div>
                        <div className="text-[11px] text-slate-500">per auto-routed query</div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Token &amp; Cost Savings</div>
                        <div className="text-xl font-black text-amber-700 font-mono">
                          ~{routerStats.estimated_token_savings_pct.toFixed(0)}%
                        </div>
                        <div className="text-[11px] text-slate-500">1 pipeline instead of 4</div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase">Training Samples</div>
                        <div className="text-xl font-black text-slate-900 font-mono">
                          {routerStats.total_training_samples}
                        </div>
                        <div className="text-[11px] text-slate-500">{routerStats.feature_count} statistical features</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="glass rounded-2xl p-12 text-center space-y-4 border border-slate-200 bg-white shadow-sm">
                  <div className="h-14 w-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto text-purple-600 shadow-sm">
                    <BarChart2 className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">Run a Benchmark Query to Populate Radar Charts</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Select <strong>Full 4-RAG Benchmark</strong> in the Query tab to generate live multi-architecture radar comparisons and metric matrix breakdowns.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('workspace')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer"
                  >
                    Go to Query &amp; Answers
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 3. KNOWLEDGE BASE TAB ── */}
        {activeTab === 'documents' && (
          <DocumentManager documents={documents} onRefresh={loadHealthAndDocs} />
        )}

        {/* ── 4. SUITE BENCHMARK TAB ── */}
        {activeTab === 'benchmark' && <BenchmarkMode />}

        {/* ── 5. QUERY HISTORY TAB ── */}
        {activeTab === 'history' && (
          <HistoryView onSelectResult={handleSelectHistoryItem} />
        )}
      </main>

      {/* Citation Inspector Modal for Routed Citation Clicks */}
      {selectedCitationChunk && (
        <CitationInspectorModal
          chunk={selectedCitationChunk}
          onClose={() => setSelectedCitationChunk(null)}
        />
      )}

      {/* Clean Pastel Footer */}
      <footer className="border-t border-slate-200/80 py-4 text-center text-xs text-slate-500 font-medium bg-white/80">
        Multimodal RAG Evaluation &amp; Selection Framework &bull; Learned ML Router Active &bull; Groq LPU Powered
      </footer>
    </div>
  );
}

export default App;
