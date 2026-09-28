from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class DocumentChunk(BaseModel):
    chunk_id: str
    doc_id: str
    filename: str
    page_number: Optional[int] = 1
    source_type: str = "document"  # pdf, txt, docx, csv, image
    content_type: str = "text"      # text, image_ocr, table
    text: str
    embedding: Optional[List[float]] = None
    score: Optional[float] = 0.0

class DocumentMetadata(BaseModel):
    doc_id: str
    filename: str
    file_type: str
    file_size_bytes: int
    upload_timestamp: str
    chunk_count: int
    page_count: int = 1
    summary: Optional[str] = None

class QueryClassification(BaseModel):
    query_type: str  # simple_factual, multi_document, comparative, summarization, analytical, multi_step_reasoning, ambiguous, retrieval_heavy
    complexity: str  # low, medium, high
    requires_multiple_sources: bool
    requires_reasoning: bool
    ambiguity_level: str  # low, medium, high
    recommended_strategy: str

class ExecutionStep(BaseModel):
    step_number: int
    step_type: str  # routing, retrieval, reflection, tool_call, generation
    title: str
    details: Dict[str, Any]
    timestamp: float

class RAGExecutionResult(BaseModel):
    architecture: str  # Basic RAG, Self-RAG, Adaptive RAG, Agentic RAG
    query: str
    answer: str
    retrieved_context: List[Dict[str, Any]] = Field(default_factory=list)
    retrieval_time: float = 0.0
    generation_time: float = 0.0
    total_time: float = 0.0
    status: str = "success"  # success, failed
    error: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    execution_trace: List[Dict[str, Any]] = Field(default_factory=list)

class RAGEvaluationMetrics(BaseModel):
    architecture: str
    context_relevance: float = 0.0
    context_precision: float = 0.0
    context_recall: Optional[float] = None
    answer_relevance: float = 0.0
    faithfulness: float = 0.0
    correctness: Optional[float] = None
    retrieval_latency: float = 0.0
    generation_latency: float = 0.0
    total_response_time: float = 0.0
    efficiency: Optional[float] = 1.0
    num_retrieved_chunks: int = 0
    num_llm_calls: int = 1
    token_usage: Dict[str, int] = Field(default_factory=lambda: {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0})
    overall_score: float = 0.0

class RankedArchitecture(BaseModel):
    architecture: str
    rank: int
    reason: str

class FinalJudgeDecision(BaseModel):
    recommended_architecture: str
    confidence: float
    reason: str
    query_type: str
    ranking: List[RankedArchitecture]
    tradeoff_analysis: Dict[str, str] = Field(default_factory=dict)

class PipelineExecutionResponse(BaseModel):
    query_id: str
    query: str
    answer: str
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    selected_rag: str
    rag_reason: str
    evaluation: Optional[RAGEvaluationMetrics] = None
    confidence: float = 0.0
    timestamp: str
    query_classification: QueryClassification
    rag_results: Dict[str, RAGExecutionResult]
    evaluations: Dict[str, RAGEvaluationMetrics]
    final_judge: FinalJudgeDecision
    total_pipeline_time: float
    is_demo_mode: bool = False

class MetricWeights(BaseModel):
    faithfulness: float = 0.25
    answer_relevance: float = 0.20
    context_relevance: float = 0.20
    correctness: float = 0.15
    context_recall: float = 0.10
    efficiency: float = 0.10

class BenchmarkQueryItem(BaseModel):
    id: str
    query: str
    ground_truth: Optional[str] = None
    category: Optional[str] = "general"

class BenchmarkRequest(BaseModel):
    queries: List[BenchmarkQueryItem] = []
    architectures_to_run: List[str] = []
    metric_weights: Optional[MetricWeights] = None

class BenchmarkMetricsSummary(BaseModel):
    architecture: str
    win_rate_percent: float
    win_count: int
    avg_faithfulness: float
    avg_answer_relevance: float
    avg_context_relevance: float
    avg_correctness: Optional[float]
    avg_latency_sec: float
    avg_overall_score: float

class BenchmarkResponse(BaseModel):
    benchmark_id: str
    timestamp: str
    total_queries: int
    summaries: List[BenchmarkMetricsSummary]
    query_results: List[PipelineExecutionResponse]

class QueryRequest(BaseModel):
    query: str
    selected_architectures: Optional[List[str]] = Field(default_factory=lambda: ["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"])
    top_k: Optional[int] = 4
    chunk_size: Optional[int] = 500
    chunk_overlap: Optional[int] = 50
    metric_weights: Optional[MetricWeights] = None
    image_data: Optional[str] = None
    media_filename: Optional[str] = None

class TextInputRequest(BaseModel):
    title: str
    content: str

