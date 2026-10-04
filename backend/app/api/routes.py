import os
import uuid
import time
import json
import logging
import pandas as pd
from typing import List, Optional, Dict, Any, Generator
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Body
from fastapi.responses import StreamingResponse
from app.models.schemas import (
    QueryRequest, PipelineExecutionResponse, DocumentMetadata,
    BenchmarkRequest, BenchmarkResponse, TextInputRequest
)
from app.config import settings
from app.ingestion.document_loader import DocumentLoader
from app.ingestion.chunker import TextChunker
from app.retrieval.vector_store import vector_store
from app.services.query_analyzer import query_analyzer
from app.rag.basic_rag import BasicRAG
from app.rag.self_rag import SelfRAG
from app.rag.adaptive_rag import AdaptiveRAG
from app.rag.agentic_rag import AgenticRAG
from app.evaluation.evaluator import evaluator_service
from app.evaluation.judge import final_judge
from app.services.history_store import history_store
from app.services.benchmark_runner import benchmark_runner
from app.services.answer_generator import answer_generator

router = APIRouter()
logger = logging.getLogger(__name__)

rag_pipelines = {
    "Basic RAG": BasicRAG(),
    "Self-RAG": SelfRAG(),
    "Adaptive RAG": AdaptiveRAG(),
    "Agentic RAG": AgenticRAG()
}

@router.get("/health")
def health_check():
    return {
        "status": "online",
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "llm_provider": settings.LLM_PROVIDER,
        "llm_model": settings.LLM_MODEL,
        "total_documents": len(vector_store.documents),
        "total_chunks": len(vector_store.chunks),
        "top_k": settings.TOP_K,
        "chunk_size": settings.CHUNK_SIZE,
    }

# ── PROVIDER STATUS ────────────────────────────────────────────────────────────
@router.get("/provider/status")
def provider_status():
    """Check if the configured LLM provider is reachable."""
    import requests as req
    provider = settings.LLM_PROVIDER
    api_key = settings.GROQ_API_KEY if provider == "groq" else settings.API_KEY
    model = settings.LLM_MODEL

    status = {
        "provider": provider,
        "model": model,
        "api_key_configured": bool(api_key),
        "reachable": False,
        "latency_ms": None,
        "error": None
    }

    if not api_key:
        status["error"] = "No API key configured. Set GROQ_API_KEY in .env"
        return status

    if provider == "groq":
        try:
            start = time.time()
            resp = req.get(
                "https://api.groq.com/openai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10,
            )
            latency = round((time.time() - start) * 1000, 1)
            status["latency_ms"] = latency
            if resp.status_code == 200:
                models = [m["id"] for m in resp.json().get("data", [])]
                status["reachable"] = True
                status["available_models"] = models[:10]
            else:
                status["error"] = f"HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            status["error"] = str(e)

    elif provider == "gemini":
        try:
            start = time.time()
            resp = req.get(
                f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}",
                timeout=10,
            )
            latency = round((time.time() - start) * 1000, 1)
            status["latency_ms"] = latency
            status["reachable"] = resp.status_code == 200
            if resp.status_code != 200:
                status["error"] = f"HTTP {resp.status_code}"
        except Exception as e:
            status["error"] = str(e)

    return status


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(settings.UPLOAD_DIR, file.filename)

        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        # Parse document
        parsed = DocumentLoader.load_document(file_path, file.filename)
        metadata: DocumentMetadata = parsed["metadata"]
        pages = parsed["pages"]

        # Chunk document
        chunker = TextChunker(chunk_size=settings.CHUNK_SIZE, chunk_overlap=settings.CHUNK_OVERLAP)
        chunks = chunker.chunk_pages(metadata, pages)
        metadata.chunk_count = len(chunks)

        # Vector Store Indexing
        vector_store.add_document_metadata(metadata)
        vector_store.add_chunks(chunks)

        # Build document full text for summary
        full_text = "\n\n".join(p.get("text", "") for p in pages)

        # Auto-generate document summary (non-blocking — runs quickly)
        auto_summary = None
        try:
            auto_summary = answer_generator.summarize_document(file.filename, full_text)
        except Exception as se:
            logger.warning("[SUMMARY] Auto-summary failed: %s", se)

        return {
            "status": "success",
            "message": f"Successfully ingested {file.filename}",
            "metadata": metadata,
            "chunks_created": len(chunks),
            "pages_parsed": len(pages),
            "auto_summary": auto_summary,
        }
    except Exception as e:
        logger.exception("[UPLOAD] Document upload failed")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


# ── DOCUMENT SUMMARIZATION ─────────────────────────────────────────────────────
@router.post("/documents/{doc_id}/summarize")
def summarize_document(doc_id: str):
    """Trigger LLM-powered summarization for an already-uploaded document."""
    if doc_id not in vector_store.documents:
        raise HTTPException(status_code=404, detail="Document not found")

    metadata = vector_store.documents[doc_id]
    doc_chunks = [c for c in vector_store.chunks if c.doc_id == doc_id]

    if not doc_chunks:
        raise HTTPException(status_code=404, detail="No content found for this document")

    full_text = "\n\n".join(c.text for c in doc_chunks)
    summary = answer_generator.summarize_document(metadata.filename, full_text)

    return {
        "doc_id": doc_id,
        "filename": metadata.filename,
        "chunk_count": len(doc_chunks),
        "summary": summary,
    }


@router.post("/documents/text")
def upload_raw_text(payload: TextInputRequest):
    try:
        title = payload.title.strip() or "Untitled_Note.txt"
        content = payload.content.strip()
        if not content:
            raise HTTPException(status_code=400, detail="Text content cannot be empty")

        doc_id = str(uuid.uuid4())
        pages = [{
            "page_number": 1,
            "text": content,
            "source_type": "text_note",
            "content_type": "text"
        }]

        metadata = DocumentMetadata(
            doc_id=doc_id,
            filename=title if "." in title else f"{title}.txt",
            file_type="txt",
            file_size_bytes=len(content.encode("utf-8")),
            upload_timestamp=pd.Timestamp.now().isoformat(),
            chunk_count=0,
            page_count=1,
            summary=f"User pasted text note: {title}"
        )

        chunker = TextChunker(chunk_size=settings.CHUNK_SIZE, chunk_overlap=settings.CHUNK_OVERLAP)
        chunks = chunker.chunk_pages(metadata, pages)
        metadata.chunk_count = len(chunks)

        vector_store.add_document_metadata(metadata)
        vector_store.add_chunks(chunks)

        return {
            "status": "success",
            "message": f"Successfully ingested text note '{metadata.filename}'",
            "metadata": metadata,
            "chunks_created": len(chunks)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process text: {str(e)}")


@router.get("/documents", response_model=List[DocumentMetadata])
def get_documents():
    return vector_store.get_all_documents()

@router.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    if vector_store.delete_document(doc_id):
        return {"status": "success", "message": f"Document {doc_id} deleted."}
    raise HTTPException(status_code=404, detail="Document not found")


# ── STREAMING QUERY ────────────────────────────────────────────────────────────
@router.post("/query/stream")
def stream_query(payload: QueryRequest):
    """
    Server-Sent Events streaming endpoint.
    Runs the best RAG pipeline, then streams the LLM answer token-by-token.
    Emits JSON SSE events: { type, data }
    """
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    def event_generator() -> Generator[str, None, None]:
        def sse(event_type: str, data: Any) -> str:
            return f"data: {json.dumps({'type': event_type, 'data': data})}\n\n"

        try:
            yield sse("status", {"message": "🔍 Analyzing query..."})

            classification = query_analyzer.analyze_query(query)
            top_k = payload.top_k or settings.TOP_K

            yield sse("status", {"message": f"📚 Retrieving relevant context (top-{top_k})..."})

            # Use Basic RAG retrieval (fastest) to get context for streaming
            basic = rag_pipelines.get("Basic RAG") or BasicRAG()
            retrieved_context = basic.retrieve(query, top_k=top_k)

            yield sse("context", {
                "sources": [
                    {
                        "filename": c.get("filename", ""),
                        "page": c.get("page_number", 1),
                        "score": round(c.get("score", 0), 3),
                        "snippet": c.get("text", "")[:200],
                    }
                    for c in retrieved_context
                ]
            })

            yield sse("status", {"message": "🤖 Generating answer with Groq LLM..."})

            # Stream the answer tokens
            full_answer = ""
            for token in answer_generator.stream_generate(query, retrieved_context):
                full_answer += token
                yield sse("token", {"text": token})

            yield sse("done", {
                "answer": full_answer,
                "query_type": classification.query_type,
                "complexity": classification.complexity,
                "sources_used": len(retrieved_context),
            })

        except Exception as e:
            logger.exception("[STREAM] Error in streaming query")
            yield sse("error", {"message": str(e)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ── STANDARD QUERY ─────────────────────────────────────────────────────────────
@router.post("/query", response_model=PipelineExecutionResponse)
def execute_query(payload: QueryRequest):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query string cannot be empty")

    query_id = str(uuid.uuid4())
    start_pipeline = time.time()

    logger.info("[QUERY] %s", query)
    classification = query_analyzer.analyze_query(query)

    selected_archs = payload.selected_architectures or ["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"]
    top_k = payload.top_k or settings.TOP_K

    rag_results = {}
    evaluations = {}

    def _execute_arch(arch_name: str):
        if arch_name not in rag_pipelines:
            return None
        try:
            logger.info("[ROUTER] Executing architecture: %s", arch_name)
            pipeline = rag_pipelines[arch_name]
            if arch_name == "Adaptive RAG":
                res = pipeline.run(query, classification=classification, top_k=top_k)
            else:
                res = pipeline.run(query, top_k=top_k)
            ev = evaluator_service.evaluate_result(res, metric_weights=payload.metric_weights, classification=classification)
            return arch_name, res, ev
        except Exception as ex:
            from app.models.schemas import RAGExecutionResult
            logger.exception("[RAG] %s failed", arch_name)
            failed_res = RAGExecutionResult(
                architecture=arch_name,
                query=query,
                answer="Execution error occurred during pipeline run.",
                status="failed",
                error=str(ex)
            )
            failed_ev = evaluator_service.evaluate_result(
                failed_res, metric_weights=payload.metric_weights, classification=classification
            )
            return arch_name, failed_res, failed_ev

    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=min(len(selected_archs), 4)) as executor:
        futures = [executor.submit(_execute_arch, arch) for arch in selected_archs if arch in rag_pipelines]
        for f in futures:
            result_tuple = f.result()
            if result_tuple:
                arch_name, res, ev = result_tuple
                rag_results[arch_name] = res
                evaluations[arch_name] = ev

    # Final Judge
    judge_decision = final_judge.evaluate_and_recommend(
        query=query,
        classification=classification,
        rag_results=rag_results,
        evaluations=evaluations,
        metric_weights=payload.metric_weights
    )

    successful_result = rag_results.get(judge_decision.recommended_architecture)
    if successful_result and successful_result.status == "success":
        answer = successful_result.answer
        sources = successful_result.retrieved_context
        selected_rag = successful_result.architecture
        selected_evaluation = evaluations.get(selected_rag)
        logger.info("[ANSWER] %s", answer[:200])
    else:
        answer = "Unable to generate an answer because the RAG/LLM service is currently unavailable."
        sources = []
        selected_rag = "None"
        selected_evaluation = None
        logger.error("[ANSWER] No successful RAG architecture produced an answer")

    total_pipeline_time = round(time.time() - start_pipeline, 3)

    response = PipelineExecutionResponse(
        query_id=query_id,
        query=query,
        answer=answer,
        sources=sources,
        selected_rag=selected_rag,
        rag_reason=judge_decision.reason,
        evaluation=selected_evaluation,
        confidence=judge_decision.confidence,
        timestamp=pd.Timestamp.now().isoformat(),
        query_classification=classification,
        rag_results=rag_results,
        evaluations=evaluations,
        final_judge=judge_decision,
        total_pipeline_time=total_pipeline_time,
        is_demo_mode=(settings.LLM_PROVIDER == "demo")
    )

    history_store.save_execution(response)
    return response


@router.get("/results/{query_id}", response_model=PipelineExecutionResponse)
def get_execution_result(query_id: str):
    res = history_store.get_execution(query_id)
    if not res:
        raise HTTPException(status_code=404, detail="Execution result not found")
    return res

@router.get("/history", response_model=List[PipelineExecutionResponse])
def get_history():
    return history_store.list_history()

@router.post("/benchmark", response_model=BenchmarkResponse)
def run_benchmark(request: Optional[Dict[str, Any]] = Body(default=None)):
    req_obj = BenchmarkRequest(**request) if request else BenchmarkRequest()
    return benchmark_runner.run_benchmark(req_obj)


# ── SEMANTIC HISTORY SEARCH ────────────────────────────────────────────────────
@router.get("/history/search")
def search_history(q: str, limit: int = 10):
    """
    Semantic search through query history.
    Returns past queries similar to the search term.
    """
    if not q:
        return []

    all_history = history_store.list_history()
    q_lower = q.lower()
    q_words = set(q_lower.split())

    results = []
    for item in all_history:
        query_lower = item.query.lower()
        query_words = set(query_lower.split())
        overlap = len(q_words & query_words) / max(1, len(q_words))
        if overlap > 0.3 or q_lower in query_lower:
            results.append({
                "query_id": item.query_id,
                "query": item.query,
                "answer_snippet": (item.answer or "")[:200],
                "selected_rag": item.selected_rag,
                "timestamp": item.timestamp,
                "similarity": round(overlap, 3),
            })

    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:limit]


# ── KNOWLEDGE BASE STATS ───────────────────────────────────────────────────────
@router.get("/knowledge/stats")
def knowledge_base_stats():
    """Returns analytics about the current knowledge base."""
    docs = vector_store.get_all_documents()
    chunks = vector_store.chunks

    type_distribution: Dict[str, int] = {}
    for doc in docs:
        ft = doc.file_type or "unknown"
        type_distribution[ft] = type_distribution.get(ft, 0) + 1

    total_words = sum(len(c.text.split()) for c in chunks)
    avg_chunk_size = round(total_words / max(1, len(chunks)), 1)

    return {
        "total_documents": len(docs),
        "total_chunks": len(chunks),
        "total_words_indexed": total_words,
        "avg_chunk_size_words": avg_chunk_size,
        "file_type_distribution": type_distribution,
        "documents": [
            {
                "doc_id": d.doc_id,
                "filename": d.filename,
                "file_type": d.file_type,
                "chunk_count": d.chunk_count,
                "page_count": d.page_count,
                "upload_timestamp": d.upload_timestamp,
            }
            for d in docs
        ],
    }
