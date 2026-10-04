import time
from typing import List, Dict, Any
from app.rag.base_rag import BaseRAGPipeline
from app.models.schemas import RAGExecutionResult, QueryClassification
class AdaptiveRAG(BaseRAGPipeline):
    """Adaptive RAG Pipeline: Query Classification -> Dynamic Retrieval Strategy Routing -> Adaptive Search & Generation."""
    
    def __init__(self, top_k: int = 4):
        super().__init__("Adaptive RAG", top_k=top_k)

    def generate(self, query: str, context: List[Dict[str, Any]]) -> str:
        return super().generate(query, context)

    def run(self, query: str, classification: QueryClassification = None, top_k: int = 4) -> RAGExecutionResult:
        start_total = time.time()
        trace = []
        
        # 1. Query Analysis & Strategy Routing
        query_type = classification.query_type if classification else "multi_document"
        complexity = classification.complexity if classification else "medium"
        
        trace.append({
            "step": 1,
            "action": "Adaptive Router Classification",
            "detected_query_type": query_type,
            "complexity": complexity,
            "strategy": classification.recommended_strategy if classification else "Dynamic Multi-Source Retrieval"
        })
        
        # 2. Dynamic Retrieval Configuration Strategy
        reformulated_query = query
        num_retrieval_steps = 1
        adaptive_top_k = top_k
        
        if query_type in ["comparative", "analytical", "multi_document"]:
            adaptive_top_k = min(top_k + 2, 8)
            num_retrieval_steps = 2
            reformulated_query = f"{query} detailed specifications comparison overview"
            trace.append({
                "step": 2,
                "action": "Query Reformulation & Strategy Adaption",
                "original_query": query,
                "reformulated_query": reformulated_query,
                "adjusted_top_k": adaptive_top_k,
                "retrieval_steps": num_retrieval_steps
            })
        else:
            trace.append({
                "step": 2,
                "action": "Direct Single-Pass Retrieval Strategy",
                "adjusted_top_k": adaptive_top_k
            })

        # 3. Execute Adaptive Retrieval
        start_ret = time.time()
        retrieved_context = self.retrieve(reformulated_query, top_k=adaptive_top_k)
        retrieval_time = round(time.time() - start_ret, 3)
        
        trace.append({
            "step": 3,
            "action": "Adaptive Vector Search Execution",
            "retrieved_chunk_count": len(retrieved_context),
            "highest_similarity_score": retrieved_context[0].get("score") if retrieved_context else 0.0
        })

        # 4. Generate Synthesized Output
        start_gen = time.time()
        answer = self.generate(query, retrieved_context)
        generation_time = round(time.time() - start_gen, 3)
        
        total_time = round(time.time() - start_total, 3)
        
        return RAGExecutionResult(
            architecture="Adaptive RAG",
            query=query,
            answer=answer,
            retrieved_context=retrieved_context,
            retrieval_time=retrieval_time,
            generation_time=generation_time,
            total_time=total_time,
            status="success",
            metadata={
                "query_type": query_type,
                "complexity": complexity,
                "retrieval_required": True,
                "num_retrieval_steps": num_retrieval_steps,
                "query_reformulated": (reformulated_query != query),
                "adjusted_top_k": adaptive_top_k
            },
            execution_trace=trace
        )
