import React, { useState, useEffect, useRef } from 'react';
import { Navbar }           from './components/Navbar';
import { SignIn }           from './components/SignIn';
import { QuerySection }     from './components/QuerySection';
import { ProgressIndicator} from './components/ProgressIndicator';
import { RecommendationPanel } from './components/RecommendationPanel';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ArchitectureDetails } from './components/ArchitectureDetails';
import { DocumentManager }  from './components/DocumentManager';
import { BenchmarkMode }    from './components/BenchmarkMode';
import { HistoryView }      from './components/HistoryView';
import { Chatbot }          from './components/Chatbot';
import { LiveMetricsObservatory } from './components/LiveMetricsObservatory';
import { AnswerPanel }      from './components/AnswerPanel';
import { WeightPrioritizer, DEFAULT_WEIGHTS } from './components/WeightPrioritizer';
import { PipelineExecutionResponse, DocumentMetadata, MetricWeights } from './types';
import { api }              from './services/api';
import { AlertTriangle, Layers, BarChart2, ArrowRight, Sliders, ChevronDown, ChevronUp } from 'lucide-react';

const STORAGE_KEY = 'rag_user';

type Tab = 'chat' | 'dashboard' | 'documents' | 'benchmark' | 'history';

export function App() {
  const [user, setUser]             = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [activeTab, setActiveTab]   = useState<Tab>('chat');
  const [isLoading, setIsLoading]   = useState(false);
  const [currentResult, setCurrentResult] = useState<PipelineExecutionResponse | null>(null);
  const [chatResult, setChatResult] = useState<PipelineExecutionResponse | null>(null);
  const [documents, setDocuments]   = useState<DocumentMetadata[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [metricWeights, setMetricWeights] = useState<MetricWeights>(DEFAULT_WEIGHTS);
  const [showWeightSliders, setShowWeightSliders] = useState(false);
  const dashboardRef                = useRef<HTMLDivElement>(null);

  useEffect(() => { if (user) loadHealthAndDocs(); }, [user]);

  const loadHealthAndDocs = async () => {
    try {
      const health = await api.getHealth();
      setIsDemoMode(health.llm_provider === 'demo');
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error(err);
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
    setChatResult(null);
  };

  const handleRunQuery = async (query: string, selectedArchitectures: string[], customWeights?: any) => {
    setIsLoading(true);
    setError(null);
    setCurrentResult(null);
    const weightsToUse = customWeights || metricWeights;
    try {
      const res = await api.executeQuery(query, selectedArchitectures, weightsToUse);
      setCurrentResult(res);
      setChatResult(res);
      setIsDemoMode(res.is_demo_mode);
    } catch (err: any) {
      setError(err.message || 'Execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatResultUpdated = (res: PipelineExecutionResponse) => {
    setChatResult(res);
    setCurrentResult(res);
  };

  const handleSelectHistoryItem = (res: PipelineExecutionResponse) => {
    setCurrentResult(res);
    setChatResult(res);
    setActiveTab('dashboard');
  };

  // ── Not signed in: show sign-in page ──
  if (!user) return <SignIn onSignIn={handleSignIn} />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDemoMode={isDemoMode}
        documentCount={documents.length}
        userName={user}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Error banner */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm
                          flex items-center space-x-2 shadow-xs">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* ── PRIORITY WEIGHTS BAR (SHARED IN CHAT & DASHBOARD) ── */}
        {(activeTab === 'chat' || activeTab === 'dashboard') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Query-Adaptive Evaluation &amp; Benchmarking Platform
                </span>
                <p className="text-xs text-slate-500 font-normal">
                  All 4 architectures execute in parallel. Metrics are displayed outside the chat in real time.
                </p>
              </div>

              <button
                onClick={() => setShowWeightSliders(!showWeightSliders)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                  showWeightSliders
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Sliders className="h-3.5 w-3.5 text-indigo-600" />
                <span>Custom Priority Weights</span>
                {showWeightSliders ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {showWeightSliders && (
              <div className="animate-slideUp">
                <WeightPrioritizer weights={metricWeights} onChange={setMetricWeights} />
              </div>
            )}
          </div>
        )}

        {/* ── CHAT TAB (SPLIT-SCREEN: CHAT ON LEFT, OBSERVATORY OUTSIDE ON RIGHT) ── */}
        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Chatbot Interface */}
            <div className="lg:col-span-7">
              <Chatbot
                onDocumentUploaded={loadHealthAndDocs}
                documentCount={documents.length}
                onResultUpdated={handleChatResultUpdated}
                metricWeights={metricWeights}
              />
            </div>

            {/* Right: Architecture & Metrics Observatory (Populated Outside Chatbot) */}
            <div className="lg:col-span-5 space-y-4">
              <LiveMetricsObservatory
                result={chatResult}
              />
            </div>
          </div>
        )}

        {/* ── DASHBOARD / RAG BENCHMARK TAB ── */}
        {activeTab === 'dashboard' && (
          <>
            <QuerySection onRunQuery={handleRunQuery} isLoading={isLoading} />
            <ProgressIndicator isLoading={isLoading} />

            {currentResult && !isLoading && (
              <>
                {/* Answer panel */}
                <AnswerPanel result={currentResult} />

                {/* "View Dashboard" CTA after answer */}
                <div className="flex justify-center">
                  <button
                    onClick={() => dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                               bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                               text-white shadow-md shadow-indigo-200 transition-all cursor-pointer"
                  >
                    <BarChart2 className="h-4 w-4" />
                    <span>View Full Metrics Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Judge recommendation */}
                <RecommendationPanel
                  judge={currentResult.final_judge}
                  classification={currentResult.query_classification}
                />

                {/* Metrics Dashboard */}
                <div ref={dashboardRef}>
                  <MetricsDashboard
                    results={currentResult.rag_results}
                    evaluations={currentResult.evaluations}
                    judge={currentResult.final_judge}
                    fullResponse={currentResult}
                  />
                </div>

                {/* Architecture execution details & traces */}
                <ArchitectureDetails
                  results={currentResult.rag_results}
                  evaluations={currentResult.evaluations}
                />
              </>
            )}

            {/* Empty state */}
            {!currentResult && !isLoading && (
              <div className="glass rounded-2xl p-12 text-center space-y-4 border border-slate-200 bg-white/80 shadow-sm">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100
                                flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
                  <Layers className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Select Architectures &amp; Submit a Query</h3>
                <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                  Your query executes across Basic RAG, Self-RAG, Adaptive RAG, and Agentic RAG concurrently.
                  The Final Judge selects the optimal architecture based on verified grounding and latency metrics.
                </p>
              </div>
            )}
          </>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {activeTab === 'documents' && (
          <DocumentManager documents={documents} onRefresh={loadHealthAndDocs} />
        )}

        {/* ── BENCHMARK TAB ── */}
        {activeTab === 'benchmark' && <BenchmarkMode />}

        {/* ── HISTORY TAB ── */}
        {activeTab === 'history' && (
          <HistoryView onSelectResult={handleSelectHistoryItem} />
        )}
      </main>

      <footer className="border-t border-slate-200/80 py-4 text-center text-xs text-slate-500 font-medium bg-white/80">
        Multimodal RAG Evaluation &amp; Selection Framework &bull; Query-Adaptive Architecture Recommendation &bull; Zero Hallucination
      </footer>
    </div>
  );
}

export default App;
