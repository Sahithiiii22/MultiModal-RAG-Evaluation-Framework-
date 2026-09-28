import os
import uuid
import time
import logging
import pandas as pd
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Body
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
        "total_documents": len(vector_store.documents),
        "total_chunks": len(vector_store.chunks)
    }

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

        return {
            "status": "success",
            "message": f"Successfully ingested {file.filename}",
            "metadata": metadata,
            "chunks_created": len(chunks)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

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

@router.post("/query", response_model=PipelineExecutionResponse)
def execute_query(payload: QueryRequest):
    query = payload.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query string cannot be empty")

    query_id = str(uuid.uuid4())
    start_pipeline = time.time()

    # 1. Analyze query
    logger.info("[QUERY] %s", query)
    classification = query_analyzer.analyze_query(query)

    selected_archs = payload.selected_architectures or ["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"]
    top_k = payload.top_k or settings.TOP_K

    rag_results = {}
    evaluations = {}

    # Execute selected RAG architectures in parallel (fast latency, fault-tolerant)
    def _execute_arch(arch_name: str):
        if arch_name not in rag_pipelines:
            return None
        try:
            logger.info("[ROUTER] Executing architecture in thread: %s", arch_name)
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
            failed_ev = evaluator_service.evaluate_result(failed_res, metric_weights=payload.metric_weights, classification=classification)
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

    # 2. Execute Final Judge LLM
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
        logger.info("[ANSWER] %s", answer)
    else:
        answer = "Unable to generate an answer because the RAG/LLM service is currently unavailable."
        sources = []
        selected_rag = "None"
        selected_evaluation = None
        logger.error("[ANSWER] No successful RAG architecture produced an answer")

    logger.info("[EVALUATION] Selected metrics: %s", selected_evaluation)
    logger.info("[JUDGE] Recommended: %s", judge_decision.recommended_architecture)

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

    # Store in history
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
