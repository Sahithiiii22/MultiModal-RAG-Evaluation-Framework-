import time
from typing import List, Dict, Any
from app.rag.base_rag import BaseRAGPipeline
from app.models.schemas import RAGExecutionResult

class BasicRAG(BaseRAGPipeline):
    """Standard Naive RAG: Query -> Top-K Retrieval -> Context -> Direct Generation."""
    
    def __init__(self, top_k: int = 4):
        super().__init__("Basic RAG", top_k=top_k)

    def generate(self, query: str, context: List[Dict[str, Any]]) -> str:
        return super().generate(query, context)

    def run(self, query: str, top_k: int = 4) -> RAGExecutionResult:
        start_total = time.time()
        
        # 1. Retrieval
        start_ret = time.time()
        retrieved_context = self.retrieve(query, top_k=top_k)
        retrieval_time = round(time.time() - start_ret, 3)
        
        # 2. Generation
        start_gen = time.time()
        answer = self.generate(query, retrieved_context)
        generation_time = round(time.time() - start_gen, 3)
        
        total_time = round(time.time() - start_total, 3)
        
        trace = [
            {"step": 1, "action": "Query Embedding & Vector Search", "details": f"Searched Top-{top_k} nearest chunks in vector DB."},
            {"step": 2, "action": "Context Assembly", "details": f"Constructed context prompt with {len(retrieved_context)} retrieved chunks."},
            {"step": 3, "action": "Single-Pass Generation", "details": "Generated final answer directly from prompt."}
        ]
        
        return RAGExecutionResult(
            architecture="Basic RAG",
            query=query,
            answer=answer,
            retrieved_context=retrieved_context,
            retrieval_time=retrieval_time,
            generation_time=generation_time,
            total_time=total_time,
            status="success",
            metadata={"retrieval_strategy": "single_pass_vector_similarity", "top_k": top_k},
            execution_trace=trace
        )
