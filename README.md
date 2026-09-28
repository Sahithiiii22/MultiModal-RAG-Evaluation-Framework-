# Unified Multimodal RAG Evaluation and Query-Adaptive RAG Selection Framework

A research-grade web application to evaluate, compare, and intelligently select between multiple Retrieval-Augmented Generation (RAG) architectures for any user query.

---

## 🌟 Core Research Question

> *"Given a particular user query, which RAG architecture provides the best answer, and why?"*

Instead of assuming one RAG approach is universally superior, this framework executes queries across multiple RAG architectures in parallel, evaluates output quality using standardized metrics, and uses a dedicated **Final Judge LLM** to analyze query complexity and recommend the optimal RAG architecture with a detailed explanation.

---

## 🚀 Key Features

1. **4 Implemented RAG Architectures**:
   - **Basic / Naive RAG**: Fast single-pass vector lookup.
   - **Self-RAG**: Dynamic self-reflection (retrieval decision, context relevance filtering, faithfulness verification).
   - **Adaptive RAG**: Query classification & dynamic strategy routing (query reformulation, adaptive Top-K).
   - **Agentic RAG**: Autonomous multi-step planner, tool invocation trace, evidence synthesis.

2. **Multimodal Knowledge Ingestion**:
   - Parses PDF, TXT, DOCX, CSV, and Image files (with vision/OCR metadata).
   - Preserves rich metadata (doc ID, filename, page number, chunk ID, content type) for exact citations.

3. **Standardized Evaluation Layer**:
   - **Retrieval Metrics**: Context Relevance, Context Precision, Context Recall.
   - **Generation Metrics**: Answer Relevance, Faithfulness, Correctness.
   - **System Metrics**: Latency (Retrieval vs Generation), Token Usage, LLM calls.
   - **Weighted Overall Quality Score**.

4. **Final Judge LLM Decision Engine**:
   - Evaluates query complexity, faithfulness requirements, and latency trade-offs.
   - Returns structured JSON recommendations with confidence scores, ranking matrix, and analytical trade-off comparisons.

5. **Automated Benchmark & Win Rate**:
   - Runs benchmark test suites across all RAG approaches.
   - Computes empirical **Architecture Win Rates** (e.g. Adaptive: 42%, Self-RAG: 27%, etc.).

6. **Experiment History**:
   - Persists all past query executions for inspection and reproduction.

---

## 📁 Project Directory Structure

```
multimodal_rag_framework/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py             # FastAPI REST endpoints
│   │   ├── rag/                      # RAG Architecture Modules
│   │   │   ├── base_rag.py           # Abstract Base Pipeline
│   │   │   ├── basic_rag.py          # Naive RAG Pipeline
│   │   │   ├── self_rag.py           # Self-Reflective RAG
│   │   │   ├── adaptive_rag.py       # Query-Adaptive RAG
│   │   │   └── agentic_rag.py        # Agentic Multi-Tool RAG
│   │   ├── retrieval/
│   │   │   ├── vector_store.py       # Hybrid Vector Database
│   │   │   ├── embeddings.py         # Vector Embedding Generator
│   │   │   └── retriever.py          # Standard Retriever Wrapper
│   │   ├── evaluation/
│   │   │   ├── metrics.py            # Quantitative Metric Calculations
│   │   │   ├── evaluator.py          # Dedicated Evaluation Service
│   │   │   └── judge.py              # Final Judge LLM Decision Service
│   │   ├── ingestion/
│   │   │   ├── document_loader.py    # Multimodal PDF/TXT/DOCX/CSV/Image loader
│   │   │   ├── chunker.py            # Configurable Overlapping Chunker
│   │   │   └── indexer.py            # Vector Indexer & Sample Dataset Seeder
│   │   ├── models/
│   │   │   └── schemas.py            # Pydantic Schemas
│   │   ├── services/
│   │   │   ├── query_analyzer.py     # Lightweight Query Classifier
│   │   │   ├── history_store.py      # Experiment History Store
│   │   │   └── benchmark_runner.py   # Benchmark & Win Rate Engine
│   │   ├── config.py                 # Configuration Settings
│   │   └── main.py                   # FastAPI Application Entrypoint
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx            # Navigation & Mode Status Header
│   │   │   ├── QuerySection.tsx      # Query Input & RAG Module Selectors
│   │   │   ├── ProgressIndicator.tsx # Live Execution Step Indicator
│   │   │   ├── RecommendationPanel.tsx # Final Judge Recommendation Card
│   │   │   ├── ComparisonTable.tsx   # Metrics Comparison Matrix
│   │   │   ├── MetricsCharts.tsx     # Recharts Bar & Radar Visualizations
│   │   │   ├── ArchitectureDetails.tsx # Detailed Answer, Context & Trace Viewer
│   │   │   ├── DocumentManager.tsx   # File Upload & Vector KB Manager
│   │   │   ├── BenchmarkMode.tsx     # Benchmark Runner & Win Rate UI
│   │   │   └── HistoryView.tsx       # Past Experiments History Viewer
│   │   ├── services/
│   │   │   └── api.ts                # REST API Client
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript Interfaces
│   │   ├── App.tsx                   # Main Dashboard Page
│   │   ├── index.css                 # Tailwind CSS Styles
│   │   └── main.tsx                  # React Entrypoint
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── .env.example
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Run Backend Server (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/health`

### 2. Run Frontend Dashboard (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
- Dashboard UI: `http://localhost:3000`
