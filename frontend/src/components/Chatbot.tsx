import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Paperclip, Bot, User, FileText, CheckCircle2,
  Trash2, Loader2, AlertCircle, Sparkles, ExternalLink,
  ShieldCheck, Copy, Check, Zap, Radio, BookOpen, RotateCcw,
  Wifi, WifiOff, ChevronDown, ChevronUp
} from 'lucide-react';
import { PipelineExecutionResponse, DocumentChunk, MetricWeights } from '../types';
import { api } from '../services/api';
import { CitationInspectorModal } from './CitationInspectorModal';

interface StreamSource {
  filename: string;
  page: number;
  score: number;
  snippet: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  streamingText?: string;   // live token buffer for streaming
  isStreaming?: boolean;
  timestamp: string;
  result?: PipelineExecutionResponse;
  streamSources?: StreamSource[];
  queryType?: string;
  complexity?: string;
  mode?: 'stream' | 'full';
  autoSummary?: string;
}

interface ChatbotProps {
  onDocumentUploaded?: () => void;
  documentCount: number;
  onResultUpdated?: (result: PipelineExecutionResponse) => void;
  metricWeights?: MetricWeights;
}

type QueryMode = 'stream' | 'full';

const PRESET_QUESTIONS = [
  "Summarize what the uploaded documents are about.",
  "Compare Self-RAG and Adaptive RAG in terms of faithfulness and latency.",
  "What is machine learning and how does it work?",
  "What are the limitations of Naive RAG architectures?"
];

const COMPLEXITY_COLOR: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-rose-100 text-rose-800 border-rose-200',
};

// ── Typing cursor ──────────────────────────────────────────────────────────────
const TypingCursor = () => (
  <span className="inline-block w-0.5 h-3.5 bg-indigo-500 animate-pulse ml-0.5 align-middle" />
);

// ── Markdown-lite renderer (bold, bullet, newlines) ────────────────────────────
const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
    // Bullet points
    if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
      return (
        <div key={i} className="flex items-start space-x-1.5 my-0.5">
          <span className="text-indigo-400 mt-1 flex-shrink-0">•</span>
          <span>{parts.map((p, j) => React.cloneElement(p as React.ReactElement, { key: j }))}</span>
        </div>
      );
    }
    return <div key={i} className={i > 0 ? 'mt-1' : ''}>{parts}</div>;
  });
};

export const Chatbot: React.FC<ChatbotProps> = ({
  onDocumentUploaded,
  documentCount,
  onResultUpdated,
  metricWeights
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      mode: 'full',
      text: '👋 Hello! I am your **Multimodal RAG Assistant**.\n\nAsk any question — with or without uploaded documents:\n- 📄 Upload PDFs, DOCX, CSV, TXT → I will search and cite them\n- 🌐 Ask general questions → I will answer from the Groq LLM knowledge base\n- ⚡ Toggle **Stream Mode** for live token-by-token answers\n\nThe full 4-architecture evaluation matrix updates live in the observatory panel.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('Executing RAG pipelines...');
  const [queryMode, setQueryMode] = useState<QueryMode>('stream');
  const [selectedInspectionChunk, setSelectedInspectionChunk] = useState<DocumentChunk | null>(null);
  const [currentInspectionQuery, setCurrentInspectionQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<{ text: string; summary?: string } | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Provider status
  const [providerOnline, setProviderOnline] = useState<boolean | null>(null);
  const [providerModel, setProviderModel] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamCancelRef = useRef<(() => void) | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isLoading]);

  // Check provider status on mount
  useEffect(() => {
    api.getProviderStatus().then(s => {
      setProviderOnline(s.reachable);
      setProviderModel(s.model || s.provider);
    }).catch(() => setProviderOnline(false));
  }, []);

  // ── File Upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadNotice({ text: `⏳ Uploading and indexing '${file.name}'...` });
    setErrorNotice(null);
    setShowSummary(false);

    try {
      const res = await api.uploadDocument(file);
      setUploadNotice({
        text: `✅ Indexed '${file.name}' — ${res.chunks_created} chunks, ${res.pages_parsed} page(s)`,
        summary: res.auto_summary || undefined,
      });
      if (onDocumentUploaded) onDocumentUploaded();
    } catch (err: any) {
      setErrorNotice(err.message || 'File upload failed');
      setUploadNotice(null);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Streaming Query ─────────────────────────────────────────────────────────
  const handleStreamSend = useCallback(async (queryText: string) => {
    const assistantId = `asst-stream-${Date.now()}`;

    // Add placeholder streaming message
    setMessages(prev => [...prev, {
      id: assistantId,
      sender: 'assistant',
      text: '',
      streamingText: '',
      isStreaming: true,
      mode: 'stream',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);

    let accumulated = '';

    const cancel = api.streamQuery(queryText, metricWeights, {
      onStatus: (msg) => {
        setLoadingStage(msg);
      },
      onContext: (sources) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, streamSources: sources } : m
        ));
      },
      onToken: (token) => {
        accumulated += token;
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, streamingText: accumulated } : m
        ));
      },
      onDone: (data) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                text: data.answer || accumulated,
                streamingText: undefined,
                isStreaming: false,
                queryType: data.query_type,
                complexity: data.complexity,
              }
            : m
        ));
        setIsLoading(false);
        setLoadingStage('');
        streamCancelRef.current = null;
      },
      onError: (msg) => {
        setMessages(prev => prev.map(m =>
          m.id === assistantId
            ? { ...m, text: `⚠️ ${msg}`, streamingText: undefined, isStreaming: false }
            : m
        ));
        setIsLoading(false);
        streamCancelRef.current = null;
      },
    });

    streamCancelRef.current = cancel;
  }, [metricWeights]);

  // ── Full (Multi-RAG) Query ──────────────────────────────────────────────────
  const handleFullSend = useCallback(async (queryText: string) => {
    setLoadingStage('Executing 4 RAG architectures concurrently...');
    const evalTimer = setTimeout(() => setLoadingStage('Evaluating 6 metrics & selecting Final Judge winner...'), 500);

    try {
      const res = await api.executeQuery(
        queryText,
        ['Basic RAG', 'Self-RAG', 'Adaptive RAG', 'Agentic RAG'],
        metricWeights
      );
      clearTimeout(evalTimer);

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: res,
        mode: 'full',
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (onResultUpdated) onResultUpdated(res);
    } catch (err: any) {
      clearTimeout(evalTimer);
      setErrorNotice(err.message || 'Failed to process query');
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ Error: ${err.message || 'Service unavailable. Check that the backend is running.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [metricWeights, onResultUpdated]);

  // ── Main Send Handler ───────────────────────────────────────────────────────
  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setIsLoading(true);
    setErrorNotice(null);

    if (queryMode === 'stream') {
      await handleStreamSend(textToSend.trim());
    } else {
      await handleFullSend(textToSend.trim());
    }
  };

  const cancelStream = () => {
    streamCancelRef.current?.();
    streamCancelRef.current = null;
    setIsLoading(false);
    // Mark the streaming message as done
    setMessages(prev => prev.map(m =>
      m.isStreaming ? { ...m, isStreaming: false, text: m.streamingText || '(Cancelled)' } : m
    ));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    cancelStream();
    setMessages([{
      id: 'welcome-reset',
      sender: 'assistant',
      text: '🔄 Conversation cleared. Ready for your next question or document upload.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  const inspectCitation = (chunk: DocumentChunk, query: string) => {
    setSelectedInspectionChunk(chunk);
    setCurrentInspectionQuery(query);
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="glass rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[800px] bg-white/95">

      {/* ── HEADER ── */}
      <div className="p-4 border-b border-slate-200/80 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
            <Bot className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>RAG Assistant &amp; Evaluator</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                Multi-RAG Active
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-normal flex items-center space-x-1.5">
              <span>{documentCount} document{documentCount !== 1 ? 's' : ''} indexed</span>
              <span>•</span>
              {providerOnline === null ? (
                <span className="flex items-center space-x-1"><Loader2 className="h-3 w-3 animate-spin" /><span>Checking LLM...</span></span>
              ) : providerOnline ? (
                <span className="flex items-center space-x-1 text-emerald-600"><Wifi className="h-3 w-3" /><span>{providerModel} Online</span></span>
              ) : (
                <span className="flex items-center space-x-1 text-rose-500"><WifiOff className="h-3 w-3" /><span>LLM Offline — Demo Mode</span></span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Mode Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setQueryMode('stream')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                queryMode === 'stream'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Stream Mode: Live token-by-token answer"
            >
              <Zap className="h-3 w-3" />
              <span>Stream</span>
            </button>
            <button
              onClick={() => setQueryMode('full')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                queryMode === 'full'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Full Mode: Complete multi-RAG pipeline evaluation"
            >
              <Radio className="h-3 w-3" />
              <span>Full RAG</span>
            </button>
          </div>

          <button
            type="button"
            onClick={clearChat}
            className="text-xs text-slate-500 hover:text-rose-600 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
            title="Clear Conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* ── UPLOAD SUCCESS BANNER ── */}
      {uploadNotice && (
        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span className="font-medium">{uploadNotice.text}</span>
            </div>
            <div className="flex items-center space-x-2">
              {uploadNotice.summary && (
                <button
                  onClick={() => setShowSummary(s => !s)}
                  className="flex items-center space-x-1 text-emerald-700 hover:text-emerald-900 font-semibold border border-emerald-300 rounded-md px-2 py-0.5 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  <BookOpen className="h-3 w-3" />
                  <span>AI Summary</span>
                  {showSummary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
              <button onClick={() => { setUploadNotice(null); setShowSummary(false); }} className="text-emerald-700 hover:underline">Dismiss</button>
            </div>
          </div>
          {/* Expandable AI Summary */}
          {showSummary && uploadNotice.summary && (
            <div className="mt-2 p-3 bg-white border border-emerald-200 rounded-lg text-slate-700 text-xs leading-relaxed whitespace-pre-line">
              <div className="flex items-center space-x-1 mb-1.5 font-bold text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI-Generated Summary</span>
              </div>
              {uploadNotice.summary}
            </div>
          )}
        </div>
      )}

      {errorNotice && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-rose-700 hover:underline">Dismiss</button>
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-slate-50/50">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const result = msg.result;
          const displayText = msg.isStreaming ? (msg.streamingText || '') : msg.text;
          const isStream = msg.mode === 'stream';

          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-indigo-600 shadow-sm'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end text-right' : 'text-left'}`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-none text-left'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none text-left shadow-sm'
                  }`}
                >
                  {/* Stream mode indicator badge */}
                  {!isUser && isStream && (
                    <div className="flex items-center space-x-1.5 mb-2">
                      {msg.isStreaming ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full animate-pulse">
                          <Zap className="h-2.5 w-2.5" />
                          <span>STREAMING LIVE</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                          <Zap className="h-2.5 w-2.5" />
                          <span>STREAMED</span>
                        </span>
                      )}
                      {msg.queryType && (
                        <span className="text-[10px] text-slate-400 font-mono">{msg.queryType}</span>
                      )}
                      {msg.complexity && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${COMPLEXITY_COLOR[msg.complexity] || COMPLEXITY_COLOR.medium}`}>
                          {msg.complexity}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 whitespace-pre-line">
                      {renderMarkdown(displayText)}
                      {msg.isStreaming && <TypingCursor />}
                    </div>
                    {!isUser && !msg.isStreaming && (
                      <button
                        onClick={() => copyMessage(msg.id, displayText)}
                        className="text-slate-400 hover:text-slate-600 p-1 transition-colors cursor-pointer flex-shrink-0"
                        title="Copy answer"
                      >
                        {copiedId === msg.id
                          ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                          : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Stream Sources */}
                  {!isUser && isStream && msg.streamSources && msg.streamSources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center space-x-1">
                        <FileText className="h-3 w-3 text-indigo-500" />
                        <span>Retrieved Sources ({msg.streamSources.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {msg.streamSources.map((s, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[11px] font-semibold text-indigo-700">{s.filename} (p.{s.page})</span>
                              <span className="text-[10px] text-slate-400 font-mono">score: {s.score}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2">{s.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full RAG Citation Badges */}
                  {result && result.sources && result.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center">
                        <FileText className="h-3 w-3 mr-1 text-indigo-500" /> Sources:
                      </span>
                      {result.sources.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => inspectCitation(s, result.query)}
                          className="text-[11px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 px-2.5 py-0.5 rounded-lg font-medium flex items-center space-x-1 transition-all cursor-pointer shadow-sm group"
                          title="Click to inspect exact passage"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span>{s.filename}{s.page_number ? ` (p.${s.page_number})` : ''}</span>
                          <ExternalLink className="h-2.5 w-2.5 text-indigo-400 group-hover:text-indigo-700" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Full RAG metadata badges */}
                  {result && !isUser && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-md font-semibold">
                        🏆 {result.selected_rag}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {result.total_pipeline_time?.toFixed(2)}s total
                      </span>
                      {result.confidence && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md font-semibold">
                          <ShieldCheck className="inline h-2.5 w-2.5 mr-0.5" />
                          {(result.confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 font-mono block px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Full RAG Loading Indicator */}
        {isLoading && queryMode === 'full' && (
          <div className="flex items-start space-x-3 text-left">
            <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-700 space-y-1.5 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span className="font-bold text-slate-900">{loadingStage}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Running Basic RAG, Self-RAG, Adaptive RAG &amp; Agentic RAG in parallel threads.
              </p>
            </div>
          </div>
        )}

        {/* Stream loading status */}
        {isLoading && queryMode === 'stream' && loadingStage && !messages.find(m => m.isStreaming && m.streamingText) && (
          <div className="flex items-start space-x-3 text-left">
            <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
              <Zap className="h-4 w-4 animate-pulse text-indigo-500" />
            </div>
            <div className="bg-white border border-indigo-200 rounded-2xl rounded-tl-none p-3 text-xs text-slate-700 shadow-sm">
              <span className="text-indigo-600 font-semibold">{loadingStage}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── SUGGESTED QUESTIONS ── */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center space-x-2 overflow-x-auto text-left">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">Try:</span>
          <div className="flex items-center space-x-1.5">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                className="text-[11px] bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-900 px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-sm font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── INPUT BAR ── */}
      <div className="p-3.5 border-t border-slate-200/80 bg-white">
        {/* Mode label */}
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
            {queryMode === 'stream'
              ? '⚡ Stream Mode — Live token-by-token answer from Groq'
              : '🔬 Full RAG Mode — 4 architectures evaluated in parallel'}
          </span>
          {isLoading && queryMode === 'stream' && (
            <button
              onClick={cancelStream}
              className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center space-x-1 cursor-pointer font-semibold"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Cancel Stream</span>
            </button>
          )}
        </div>

        <div className="flex items-end space-x-2">
          {/* File Upload */}
          <label
            htmlFor="chat-file-upload"
            className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 cursor-pointer transition-colors flex items-center justify-center shadow-sm"
            title="Upload PDF, DOCX, TXT, CSV"
          >
            {uploadingFile
              ? <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
              : <Paperclip className="h-5 w-5" />}
            <input
              id="chat-file-upload"
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.txt,.docx,.csv,.md,.json"
              className="hidden"
              disabled={uploadingFile || isLoading}
            />
          </label>

          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                queryMode === 'stream'
                  ? 'Ask anything — streamed live from Groq (Enter to send)...'
                  : 'Ask a question — all 4 RAG architectures will be evaluated (Enter to send)...'
              }
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 rounded-xl p-3 text-sm border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors resize-none shadow-inner"
              disabled={isLoading}
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium shadow-sm transition-all flex items-center justify-center cursor-pointer"
            title="Send Query"
          >
            {queryMode === 'stream'
              ? <Zap className="h-5 w-5" />
              : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Citation Inspector Modal */}
      <CitationInspectorModal
        chunk={selectedInspectionChunk}
        query={currentInspectionQuery}
        onClose={() => setSelectedInspectionChunk(null)}
      />
    </div>
  );
};
