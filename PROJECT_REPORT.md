# Multimodal RAG Evaluation & Selection Framework — Project Report

## Executive Summary
This framework provides a production-grade benchmarking and evaluation system that executes queries simultaneously across multiple Retrieval-Augmented Generation (RAG) architectures:
1. **Basic RAG** (Standard single-pass vector retrieval & generation)
2. **Self-RAG** (Self-reflection filtering, verification, and anti-hallucination)
3. **Adaptive RAG** (Dynamic query classification, query reformulation, and adaptive depth)
4. **Agentic RAG** (Autonomous multi-step tool use, iterative search planning, and cross-source evidence synthesis)

A dedicated **Final Judge LLM** evaluates each architecture's outputs against standardized metrics (Faithfulness, Answer Relevance, Context Relevance, Context Precision, and Latency), determines the optimal RAG architecture for the specific query requirement, and provides explicit analytical trade-off explanations to the user.

---

## Architecture Overview

```
User Query / Document (PDF / Text)
                │
   ┌────────────┴────────────┐
   ▼                         ▼
Document Ingestion      Query Classifier & Analyzer
(PDF, TXT, Raw Text)   (Type, Complexity, Multi-Hop)
   │                         │
   ▼                         ▼
Vector Store ─────────► Parallel RAG Execution
(Hybrid Similarity)      ├── Basic RAG
                         ├── Self-RAG
                         ├── Adaptive RAG
                         └── Agentic RAG
                             │
                             ▼
                     Evaluation Engine
                 (Faithfulness, Relevance, Speed)
                             │
                             ▼
                     Final Judge LLM
              (Recommendation, Confidence, Trade-offs)
                             │
                             ▼
              Clean Light Pastel User Interface
```

---

## What Has Been Completed (Tasks Done)

### 1. Backend Ingestion & Multi-Format Support
- [x] **PDF Parsing & Ingestion**: Direct ingestion of PDF documents with page extraction, metadata tagging, and text chunking.
- [x] **Direct Text Ingestion**: Dedicated endpoint (`/api/documents/text`) and UI form to paste and index arbitrary text notes into the vector store.
- [x] **Multi-format Support**: Integrated loaders for TXT, DOCX, CSV, and multimodal image OCR fallbacks.
- [x] **Vector Database**: In-memory vector store with hybrid vector-cosine similarity + keyword overlap boosting.
- [x] **Chunking Pipeline**: Token-aware sliding window chunking with metadata preservation (`doc_id`, `filename`, `page_number`).

### 2. Multi-RAG Pipeline Implementations
- [x] **Basic RAG**: Fast single-pass vector lookup and direct generation.
- [x] **Self-RAG**: Integrated reflection steps (`IS_RETRIEVAL_REQUIRED`, `IS_CONTEXT_RELEVANT`, `IS_ANSWER_SUPPORTED_BY_CONTEXT`) with verified context scoring.
- [x] **Adaptive RAG**: Query classification engine that dynamically adapts retrieval depth (`top_k`) and query reformulation.
- [x] **Agentic RAG**: Deconstructs complex queries into sub-searches, iteratively calls vector retrieval tools, and synthesizes aggregated passages.

### 3. Final Judge LLM & Evaluation Metrics
- [x] **Automated Quality Metrics**: Standardized mathematical calculation for Faithfulness, Answer Relevance, Context Relevance, Context Precision, and Efficiency.
- [x] **Query-Adaptive Decision Logic**: Multi-attribute ranking weighing query complexity, precision requirements, and latency constraints.
- [x] **Human-Readable Explanations**: Contextual justifications explaining *why* the recommended architecture is superior for the query.
- [x] **Comparative Trade-off Analysis**: Dynamic comparative trade-offs (e.g., Adaptive RAG vs. Basic RAG vs. Agentic RAG).

### 4. Frontend Redesign (Pastel Light Theme & Clean UI)
- [x] **Pastel Color Palette**: Fully converted to soft pastel colors (pastel sky `#e0f2fe`, pastel emerald `#dcfce7`, pastel amber `#fef3c7`, pastel purple `#f3e8ff`, neutral slate text `#1e293b`).
- [x] **Zero Gradients**: Completely eliminated all CSS gradients, gradient text, and dark background blurs for a neat, professional look.
- [x] **Concise & Relevant Copy**: Streamlined labels, tooltips, and descriptions, eliminating clutter.
- [x] **Dual Document Ingestion Tab**: Simple UI to browse files (PDF/TXT/CSV) or paste raw text notes.
- [x] **Interactive Deep Dive**: Detailed execution trace accordions, similarity score indicators, and cited source chips.
- [x] **Benchmarking & Experiment History**: Batch benchmark runner calculating empirical win rates with persistence.

---

## Tasks Left & Future Roadmap (Future Enhancements)

1. **Persistent On-Disk Vector Storage**:
   - *Status*: Pending / Future Roadmap
   - *Description*: Add pluggable ChromaDB / Qdrant on-disk persistence for ultra-large multi-gigabyte document corpora.
2. **Direct Visual OCR & Table Parser**:
   - *Status*: Pending / Future Roadmap
   - *Description*: Integrate vision LLMs (e.g. Gemini 1.5 Pro / GPT-4o Vision) for native chart extraction and diagram reasoning from complex PDFs.
3. **User-Configurable Metric Weights**:
   - *Status*: Pending / Future Roadmap
   - *Description*: Add an interactive slider modal allowing users to customize metric weights (e.g., heavily weighting latency vs. zero-tolerance hallucination).
4. **Exportable Evaluation Reports**:
   - *Status*: Pending / Future Roadmap
   - *Description*: Add PDF / CSV export of benchmark run results and comparison matrices for research publications.

---

## Verification & Testing Summary
- **Backend Tests**: Verified `/api/health`, `/api/documents`, `/api/documents/text`, `/api/query`, and `/api/benchmark` with 100% pass rate.
- **Frontend Build**: Production build bundled via Vite (`dist/`) in 593ms with 0 errors.
