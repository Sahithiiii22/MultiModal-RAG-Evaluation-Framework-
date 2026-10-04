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
import { PipelineExecutionResponse, DocumentMetadata, MetricWeights } from './types';
import { api }                from './services/api';
import { AlertTriangle, Layers, BarChart2, ArrowRight, Sparkles, CheckCircle2, Clock, ShieldCheck, Zap } from 'lucide-react';

const STORAGE_KEY = 'rag_user';

export function App() {
  const [user, setUser]                   = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [activeTab, setActiveTab]         = useState<NavTab>('workspace');
  const [isLoading, setIsLoading]         = useState(false);
  const [currentResult, setCurrentResult] = useState<PipelineExecutionResponse | null>(null);
  const [documents, setDocuments]         = useState<DocumentMetadata[]>([]);
  const [isDemoMode, setIsDemoMode]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [metricWeights]                   = useState<MetricWeights>(DEFAULT_WEIGHTS);

  useEffect(() => { 
    if (user) loadHealthAndDocs(); 
  }, [user]);

  const loadHealthAndDocs = async () => {
    try {
      const health = await api.getHealth();
      setIsDemoMode(health.llm_provider === 'demo');
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load health and docs:', err);
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
  };

  const handleRunQuery = async (query: string, selectedArchitectures: string[], customWeights?: MetricWeights) => {
    setIsLoading(true);
    setError(null);
    setCurrentResult(null);
    const weightsToUse = customWeights || metricWeights;
    try {
      const res = await api.executeQuery(query, selectedArchitectures, weightsToUse);
      setCurrentResult(res);
      setIsDemoMode(res.is_demo_mode);
    } catch (err: any) {
      setError(err.message || 'Pipeline execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryItem = (res: PipelineExecutionResponse) => {
    setCurrentResult(res);
    setActiveTab('workspace');
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

            {/* Results Section */}
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
                        All 4 pipelines executed in parallel. Complete metric breakdowns and charts are available on the Metrics page.
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
            {!currentResult && !isLoading && (
              <div className="glass rounded-2xl p-12 text-center space-y-4 border border-slate-200 bg-white shadow-sm">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
                  <Layers className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Ready to Evaluate RAG Pipelines</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Type a question or attach your PDF, DOCX, TXT, or Image above. All 4 RAG architectures will execute concurrently and the Final Judge will determine the best answer and optimal pipeline.
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-left">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                      Evaluation Analytics &amp; Radar Observatory
                    </span>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5 truncate max-w-2xl">
                      Query: &ldquo;{currentResult.query}&rdquo;
                    </h2>
                  </div>

                  <button
                    onClick={() => setActiveTab('workspace')}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <span>&larr; Back to Query Workspace</span>
                  </button>
                </div>

                <MetricsDashboard
                  results={currentResult.rag_results}
                  evaluations={currentResult.evaluations}
                  judge={currentResult.final_judge}
                  fullResponse={currentResult}
                />
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center space-y-4 border border-slate-200 bg-white shadow-sm">
                <div className="h-14 w-14 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto text-purple-600 shadow-sm">
                  <BarChart2 className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No Query Metrics to Display</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Submit a query or attach a document in the Query tab to generate live multi-architecture radar charts and metric comparison tables.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('workspace')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm cursor-pointer"
                >
                  Go to Query &amp; Answers
                </button>
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

      {/* Clean Pastel Footer */}
      <footer className="border-t border-slate-200/80 py-4 text-center text-xs text-slate-500 font-medium bg-white/80">
        Multimodal RAG Evaluation &amp; Selection Framework &bull; Query-Adaptive Intelligence &bull; Groq LPU Powered
      </footer>
    </div>
  );
}

export default App;
