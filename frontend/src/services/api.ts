import {
  PipelineExecutionResponse, DocumentMetadata, BenchmarkResponse, MetricWeights
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getProviderStatus(): Promise<{
    provider: string; model: string; api_key_configured: boolean;
    reachable: boolean; latency_ms: number | null; error: string | null;
    available_models?: string[];
  }> {
    const res = await fetch(`${API_BASE}/provider/status`);
    if (!res.ok) throw new Error('Provider status check failed');
    return res.json();
  },

  async uploadDocument(file: File): Promise<{
    status: string; message: string; metadata: DocumentMetadata;
    chunks_created: number; pages_parsed: number; auto_summary?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async uploadRawText(title: string, content: string): Promise<{
    status: string; message: string; metadata: DocumentMetadata; chunks_created: number;
  }> {
    const res = await fetch(`${API_BASE}/documents/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Text upload failed');
    }
    return res.json();
  },

  async getDocuments(): Promise<DocumentMetadata[]> {
    const res = await fetch(`${API_BASE}/documents`);
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
  },

  async deleteDocument(docId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  async summarizeDocument(docId: string): Promise<{
    doc_id: string; filename: string; chunk_count: number; summary: string;
  }> {
    const res = await fetch(`${API_BASE}/documents/${docId}/summarize`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Summarization failed');
    }
    return res.json();
  },

  async executeQuery(
    query: string,
    selectedArchitectures: string[],
    metricWeights?: MetricWeights
  ): Promise<PipelineExecutionResponse> {
    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        selected_architectures: selectedArchitectures,
        top_k: 6,
        metric_weights: metricWeights,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Query execution failed');
    }
    return res.json();
  },

  /**
   * Streaming query using Server-Sent Events.
   * Calls onToken for each streamed token, onContext when sources are ready,
   * onDone when the full answer is complete, and onError on failure.
   */
  streamQuery(
    query: string,
    metricWeights?: MetricWeights,
    callbacks?: {
      onStatus?: (msg: string) => void;
      onToken?: (token: string) => void;
      onContext?: (sources: any[]) => void;
      onDone?: (data: any) => void;
      onError?: (msg: string) => void;
    }
  ): () => void {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/query/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, top_k: 6, metric_weights: metricWeights }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          callbacks?.onError?.('Stream request failed');
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const { type, data } = parsed;
              if (type === 'status') callbacks?.onStatus?.(data.message);
              else if (type === 'token') callbacks?.onToken?.(data.text);
              else if (type === 'context') callbacks?.onContext?.(data.sources || []);
              else if (type === 'done') callbacks?.onDone?.(data);
              else if (type === 'error') callbacks?.onError?.(data.message);
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          callbacks?.onError?.(e.message || 'Stream failed');
        }
      }
    })();

    return () => controller.abort();
  },

  async getHistory(): Promise<PipelineExecutionResponse[]> {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) throw new Error('Failed to load history');
    return res.json();
  },

  async searchHistory(query: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/history/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('History search failed');
    return res.json();
  },

  async getKnowledgeStats(): Promise<{
    total_documents: number; total_chunks: number;
    total_words_indexed: number; avg_chunk_size_words: number;
    file_type_distribution: Record<string, number>;
    documents: any[];
  }> {
    const res = await fetch(`${API_BASE}/knowledge/stats`);
    if (!res.ok) throw new Error('Failed to get knowledge stats');
    return res.json();
  },

  async runBenchmark(metricWeights?: MetricWeights): Promise<BenchmarkResponse> {
    const res = await fetch(`${API_BASE}/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric_weights: metricWeights }),
    });
    if (!res.ok) throw new Error('Benchmark execution failed');
    return res.json();
  }
};
