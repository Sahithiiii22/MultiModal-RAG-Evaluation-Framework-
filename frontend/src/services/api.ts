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

  async uploadDocument(file: File): Promise<{ status: string; message: string; metadata: DocumentMetadata; chunks_created: number }> {
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

  async uploadRawText(title: string, content: string): Promise<{ status: string; message: string; metadata: DocumentMetadata; chunks_created: number }> {
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
    const res = await fetch(`${API_BASE}/documents/${docId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
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
        top_k: 4,
        metric_weights: metricWeights,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Query execution failed');
    }
    return res.json();
  },

  async getHistory(): Promise<PipelineExecutionResponse[]> {
    const res = await fetch(`${API_BASE}/history`);
    if (!res.ok) throw new Error('Failed to load history');
    return res.json();
  },

  async runBenchmark(metricWeights?: MetricWeights): Promise<BenchmarkResponse> {
    const res = await fetch(`${API_BASE}/benchmark`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric_weights: metricWeights,
      }),
    });
    if (!res.ok) throw new Error('Benchmark execution failed');
    return res.json();
  }
};
