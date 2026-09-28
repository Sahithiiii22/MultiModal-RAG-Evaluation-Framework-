import os
from typing import List
from app.ingestion.document_loader import DocumentLoader
from app.ingestion.chunker import TextChunker
from app.retrieval.vector_store import vector_store
from app.models.schemas import DocumentMetadata

DEFAULT_DOCUMENTS = [
    {
        "filename": "RAG_Architectures_Comparative_Study.pdf",
        "content": """# Comparative Study of Retrieval-Augmented Generation (RAG) Architectures

## Abstract
Retrieval-Augmented Generation (RAG) combines dense text retrieval with generative language models. This study benchmarks Naive RAG, Self-RAG, Adaptive RAG, and Agentic RAG across factual recall, multi-step reasoning, and latency.

## 1. Naive / Basic RAG
Basic RAG performs a single-pass Top-K similarity search over a vector database and feeds retrieved context directly into the LLM. 
- Strengths: Low latency (~0.8s), simple implementation, high efficiency for straightforward factual lookup queries.
- Weaknesses: Vulnerable to noise, hallucination when context is irrelevant, and incapable of dynamic multi-hop query planning.

## 2. Self-RAG
Self-RAG introduces self-reflection mechanisms where the LLM dynamically decides:
1. Retrieval Necessity: Is retrieval needed for this query?
2. Context Relevance: Are retrieved passages relevant to the query prompt?
3. Faithfulness Verification: Is the generated response fully supported by the retrieved passages?
- Strengths: High faithfulness (0.92+), low hallucination rate, self-correcting generation.
- Weaknesses: Requires multiple internal reflection calls, increasing generation latency (~1.8s - 2.5s).

## 3. Adaptive RAG
Adaptive RAG uses lightweight query classification to dynamically adjust retrieval parameters:
- Simple Queries: Route to Basic single-pass retrieval (Top-K = 2).
- Complex / Comparative Queries: Route to multi-query expansion and iterative retrieval (Top-K = 6).
- Ambiguous Queries: Route to query clarification and reformulation.
- Strengths: Optimal trade-off between speed and output quality across diverse query workloads.
- Latency: ~1.2s - 1.6s average.

## 4. Agentic RAG
Agentic RAG models retrieval as an autonomous multi-tool agentic workflow. The agent constructs a decomposition plan, executes multiple targeted searches, evaluates step results, and synthesizes multi-document findings.
- Strengths: Exceptional multi-step reasoning, complete synthesis of heterogeneous multi-source evidence.
- Weaknesses: Higher latency (~2.8s - 4.5s) and token consumption. Ideal for deep analytical questions.
"""
    },
    {
        "filename": "Multimodal_RAG_Benchmarking_Guide.txt",
        "content": """Multimodal RAG Evaluation & Selection Guidelines:

1. Retrieval Evaluation Metrics:
- Context Relevance: Ratio of retrieved text chunks containing essential information for answering the query.
- Context Precision: Measure of signal-to-noise ratio in top retrieved results.
- Context Recall: Extent to which ground truth information is captured in top-k chunks.

2. Generation Evaluation Metrics:
- Answer Relevance: Alignment of the final response to the user query intent.
- Faithfulness: Measure of factual consistency against the provided context. High faithfulness prevents hallucinations.
- Correctness: Semantic similarity against ground-truth answers when available.

3. Final Judge Decision Logic:
- The Final Judge LLM should analyze query complexity, faithfulness requirement, and response time constraints.
- For simple factual queries, Basic RAG or Adaptive RAG is preferred due to low latency.
- For complex multi-document comparative queries, Adaptive RAG or Agentic RAG yields superior synthesis.
- For queries where hallucination must be strictly eliminated, Self-RAG provides highest verified context alignment.
"""
    },
    {
        "filename": "Enterprise_RAG_Benchmark_Metrics.csv",
        "content": """Architecture,Average_Latency_Sec,Faithfulness_Score,Answer_Relevance,Context_Relevance,Token_Cost_Index
Basic RAG,0.85,0.78,0.82,0.75,1.0
Self-RAG,2.10,0.94,0.88,0.91,2.4
Adaptive RAG,1.35,0.90,0.91,0.89,1.6
Agentic RAG,3.40,0.93,0.95,0.93,3.8
"""
    },
    {
        "filename": "Enterprise_RAG_Deployment_Guide.pdf",
        "content": """# Enterprise RAG Deployment & Production Considerations

## Scaling RAG in Production Environments
When deploying RAG systems at enterprise scale, organizations must consider infrastructure requirements, cost management, and reliability engineering.

### Vector Database Selection
Production RAG systems require persistent vector databases. Popular choices include:
- ChromaDB: Open-source, lightweight, suitable for small-to-medium corpora (under 1M vectors).
- Qdrant: High-performance Rust-based engine with HNSW indexing, supporting billions of vectors.
- Pinecone: Fully managed cloud service with automatic scaling and serverless deployments.
- Weaviate: GraphQL-native vector database with hybrid search capabilities.

### Embedding Model Selection
The choice of embedding model significantly impacts retrieval quality:
- all-MiniLM-L6-v2: 384-dimensional, fast inference, good for general-purpose text similarity.
- text-embedding-ada-002: OpenAI's production embedding model with 1536 dimensions.
- BAAI/bge-large-en-v1.5: State-of-the-art open-source embedding with high MTEB benchmark scores.

### Cost-Latency Trade-offs in Production
- Basic RAG costs approximately $0.02 per query with sub-second latency.
- Self-RAG costs approximately $0.06 per query due to multiple reflection LLM calls.
- Adaptive RAG costs approximately $0.04 per query, dynamically adjusting based on query complexity.
- Agentic RAG costs approximately $0.12 per query due to iterative multi-tool search execution.

### Monitoring and Observability
Production RAG deployments require comprehensive monitoring:
- Track retrieval latency percentiles (p50, p95, p99).
- Monitor context relevance drift over time as knowledge bases evolve.
- Set up alerting for faithfulness score degradation.
- Log all LLM API calls with token counts for cost attribution.

## Security and Access Control
Enterprise RAG systems must implement document-level access control:
- Role-based filtering ensures users only retrieve documents they are authorized to see.
- Encrypted vector storage protects sensitive corporate knowledge.
- Audit logging tracks all retrieval and generation operations for compliance.
"""
    },
    {
        "filename": "Multi_Hop_Reasoning_Research_Paper.pdf",
        "content": """# Multi-Hop Reasoning in Retrieval-Augmented Generation Systems

## Abstract
Multi-hop reasoning requires aggregating information from multiple distinct passages to answer complex questions. Standard single-pass RAG architectures fail at multi-hop queries because they retrieve only the most directly relevant passages, missing critical intermediate evidence.

## The Multi-Hop Challenge
Consider the question: "What is the capital of the country that produces the most coffee?"
- Step 1: Identify that Brazil produces the most coffee.
- Step 2: Look up that the capital of Brazil is Brasilia.
- A single retrieval pass may only find one of these facts, producing an incomplete or incorrect answer.

## How Different RAG Architectures Handle Multi-Hop Queries

### Basic RAG Failure Mode
Basic RAG retrieves Top-K chunks in one pass. For multi-hop questions, it often retrieves passages about one entity but misses the linking passage. This leads to partial answers or hallucinated bridging facts.

### Self-RAG Partial Solution
Self-RAG can detect when retrieved context is insufficient through its IS_CONTEXT_RELEVANT reflection token. However, it does not autonomously issue follow-up searches. It may flag low confidence but still attempt generation with incomplete evidence.

### Adaptive RAG Improvement
Adaptive RAG classifies multi-hop queries as high complexity and expands the retrieval to higher Top-K values and reformulated queries. This increases the probability of capturing both intermediate and final evidence passages, though it is not guaranteed.

### Agentic RAG Full Solution
Agentic RAG excels at multi-hop reasoning by decomposing the question into sub-queries. The agent first retrieves information about coffee production, then issues a targeted follow-up search for the capital of the identified country. This iterative approach guarantees complete evidence chains for multi-hop questions.

## Benchmark Results for Multi-Hop Queries
Architecture | Multi-Hop Accuracy | Average Hops | Evidence Completeness
Basic RAG    | 34%               | 1.0          | 42%
Self-RAG     | 51%               | 1.0          | 58%
Adaptive RAG | 67%               | 1.3          | 74%
Agentic RAG  | 89%               | 2.4          | 93%

## Conclusion
For queries requiring multi-hop reasoning, Agentic RAG is the clearly superior architecture, though at the cost of higher latency and token consumption. Adaptive RAG provides a reasonable middle ground for moderately complex multi-hop questions.
"""
    }
]

def initialize_default_documents():
    """Populates vector store with sample research files on startup if empty."""
    if len(vector_store.chunks) > 0:
        return
        
    chunker = TextChunker(chunk_size=120, chunk_overlap=20)
    
    for item in DEFAULT_DOCUMENTS:
        filename = item["filename"]
        content = item["content"]
        
        pages = [{
            "page_number": 1,
            "text": content,
            "source_type": filename.split(".")[-1],
            "content_type": "text"
        }]
        
        metadata = DocumentMetadata(
            doc_id=f"doc_default_{filename.split('.')[0].lower()}",
            filename=filename,
            file_type=filename.split(".")[-1],
            file_size_bytes=len(content),
            upload_timestamp="2026-08-23T10:00:00",
            chunk_count=0,
            page_count=1,
            summary=f"Sample RAG benchmark dataset: {filename}"
        )
        
        chunks = chunker.chunk_pages(metadata, pages)
        vector_store.add_document_metadata(metadata)
        vector_store.add_chunks(chunks)
