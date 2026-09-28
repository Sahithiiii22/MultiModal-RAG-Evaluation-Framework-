export interface DocumentChunk {
  chunk_id: string;
  doc_id: string;
  filename: string;
  page_number?: number;
  source_type: string;
  content_type: string;
  text: string;
  score?: number;
  citation_index?: number;
}

export interface DocumentMetadata {
  doc_id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  upload_timestamp: string;
  chunk_count: number;
  page_count: number;
  summary?: string;
}

export interface QueryClassification {
  query_type: string;
  complexity: string;
  requires_multiple_sources: boolean;
  requires_reasoning: boolean;
  ambiguity_level: string;
  recommended_strategy: string;
}

export interface RAGExecutionResult {
  architecture: string;
  query: string;
  answer: string;
  retrieved_context: DocumentChunk[];
  retrieval_time: number;
  generation_time: number;
  total_time: number;
  status: 'success' | 'failed';
  error?: string;
  metadata: Record<string, any>;
  execution_trace: Array<{
    step: number;
    action: string;
    details?: any;
    decision?: string;
    reasoning?: string;
    input?: any;
    retrieved_count?: number;
    plan?: string[];
  }>;
}

export interface RAGEvaluationMetrics {
  architecture: string;
  context_relevance: number;
  context_precision: number;
  context_recall?: number | null;
  answer_relevance: number;
  faithfulness: number;
  correctness?: number | null;
  retrieval_latency: number;
  generation_latency: number;
  total_response_time: number;
  num_retrieved_chunks: number;
  num_llm_calls: number;
  token_usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  overall_score: number;
}

export interface RankedArchitecture {
  architecture: string;
  rank: number;
  reason: string;
}

export interface FinalJudgeDecision {
  recommended_architecture: string;
  confidence: number;
  reason: string;
  query_type: string;
  ranking: RankedArchitecture[];
  tradeoff_analysis: Record<string, string>;
}

export interface PipelineExecutionResponse {
  query_id: string;
  query: string;
  answer: string;
  sources: DocumentChunk[];
  selected_rag: string;
  rag_reason: string;
  evaluation?: RAGEvaluationMetrics | null;
  confidence: number;
  timestamp: string;
  query_classification: QueryClassification;
  rag_results: Record<string, RAGExecutionResult>;
  evaluations: Record<string, RAGEvaluationMetrics>;
  final_judge: FinalJudgeDecision;
  total_pipeline_time: number;
  is_demo_mode: boolean;
}

export interface BenchmarkMetricsSummary {
  architecture: string;
  win_rate_percent: number;
  win_count: number;
  avg_faithfulness: number;
  avg_answer_relevance: number;
  avg_context_relevance: number;
  avg_correctness?: number | null;
  avg_latency_sec: number;
  avg_overall_score: number;
}

export interface BenchmarkResponse {
  benchmark_id: string;
  timestamp: string;
  total_queries: number;
  summaries: BenchmarkMetricsSummary[];
  query_results: PipelineExecutionResponse[];
}

export interface MetricWeights {
  faithfulness: number;
  answer_relevance: number;
  context_relevance: number;
  correctness: number;
  context_recall: number;
  efficiency: number;
}

export interface QueryRequest {
  query: string;
  selected_architectures?: string[];
  top_k?: number;
  chunk_size?: number;
  chunk_overlap?: number;
  metric_weights?: MetricWeights;
}

export interface BenchmarkRequest {
  queries?: Array<{
    id: string;
    query: string;
    ground_truth?: string;
    category?: string;
  }>;
  architectures_to_run?: string[];
  metric_weights?: MetricWeights;
}
