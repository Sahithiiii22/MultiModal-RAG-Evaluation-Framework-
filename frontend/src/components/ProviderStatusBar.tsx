import React, { useEffect, useState } from 'react';
import {
  Wifi, WifiOff, Loader2, Cpu, ChevronRight, AlertTriangle,
  CheckCircle, Zap, Database, FileStack, BookOpen
} from 'lucide-react';
import { api } from '../services/api';

interface ProviderStatus {
  provider: string;
  model: string;
  api_key_configured: boolean;
  reachable: boolean;
  latency_ms: number | null;
  error: string | null;
  available_models?: string[];
}

interface KnowledgeStats {
  total_documents: number;
  total_chunks: number;
  total_words_indexed: number;
  avg_chunk_size_words: number;
  file_type_distribution: Record<string, number>;
}

interface ProviderStatusBarProps {
  refreshTrigger?: number; // increment to force refresh
}

const PROVIDER_COLORS: Record<string, string> = {
  groq: 'from-orange-500 to-amber-500',
  gemini: 'from-blue-500 to-cyan-500',
  openai: 'from-emerald-500 to-teal-500',
  ollama: 'from-purple-500 to-violet-500',
  demo: 'from-slate-400 to-slate-500',
};

export const ProviderStatusBar: React.FC<ProviderStatusBarProps> = ({ refreshTrigger = 0 }) => {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [kbStats, setKbStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [s, kb] = await Promise.all([
        api.getProviderStatus(),
        api.getKnowledgeStats(),
      ]);
      setStatus(s);
      setKbStats(kb);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [refreshTrigger]);

  const provider = status?.provider || 'unknown';
  const gradientClass = PROVIDER_COLORS[provider] || PROVIDER_COLORS.demo;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-4">
      {/* Main status row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center space-x-3">
          {/* Provider gradient dot */}
          <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
            <Cpu className="h-4 w-4" />
          </div>
          <div>
            {loading ? (
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Checking LLM provider...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {status?.reachable ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                )}
                <span className="text-sm font-bold text-slate-800 capitalize">
                  {provider}
                </span>
                <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  {status?.model || 'unknown model'}
                </span>
                {status?.reachable && status?.latency_ms && (
                  <span className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-0.5">
                    <Zap className="h-3 w-3" />
                    <span>{status.latency_ms}ms</span>
                  </span>
                )}
                {!status?.reachable && (
                  <span className="text-[11px] text-rose-500 font-semibold">Offline — Demo Mode Active</span>
                )}
              </div>
            )}
            {!loading && status && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {status.api_key_configured ? '✓ API key configured' : '✗ No API key — set GROQ_API_KEY in .env'}
                {kbStats && ` • ${kbStats.total_documents} docs, ${kbStats.total_chunks} chunks, ${kbStats.total_words_indexed.toLocaleString()} words indexed`}
              </p>
            )}
          </div>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expanded details */}
      {expanded && !loading && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50/50">
          {status?.error && (
            <div className="flex items-start space-x-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-700">LLM Connection Error</p>
                <p className="text-xs text-rose-600 font-mono mt-0.5">{status.error}</p>
                <p className="text-xs text-rose-500 mt-1">
                  Fix: Update <code className="bg-rose-100 px-1 rounded">.env</code> with a valid <code className="bg-rose-100 px-1 rounded">GROQ_API_KEY</code> and restart the backend.
                </p>
              </div>
            </div>
          )}

          {/* Available Groq Models */}
          {status?.available_models && status.available_models.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                Available Models ({status.available_models.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {status.available_models.slice(0, 8).map(m => (
                  <span
                    key={m}
                    className={`text-[11px] px-2 py-0.5 rounded-md border font-mono ${
                      m === status.model
                        ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {m === status.model ? '✓ ' : ''}{m}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Knowledge Base Stats */}
          {kbStats && (
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-2 uppercase tracking-wide flex items-center space-x-1">
                <Database className="h-3 w-3" />
                <span>Knowledge Base</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <FileStack className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-[11px] font-bold text-slate-600">Documents</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{kbStats.total_documents}</p>
                  <p className="text-[10px] text-slate-400">{kbStats.total_chunks} chunks indexed</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <BookOpen className="h-3.5 w-3.5 text-violet-500" />
                    <span className="text-[11px] font-bold text-slate-600">Content</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900">{kbStats.total_words_indexed.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400">words • avg {kbStats.avg_chunk_size_words}w/chunk</p>
                </div>
              </div>

              {/* File type distribution */}
              {Object.keys(kbStats.file_type_distribution).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.entries(kbStats.file_type_distribution).map(([type, count]) => (
                    <span key={type} className="text-[11px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                      .{type}: {count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={fetchStatus}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <Loader2 className="h-3 w-3" />
            <span>Refresh Status</span>
          </button>
        </div>
      )}
    </div>
  );
};
