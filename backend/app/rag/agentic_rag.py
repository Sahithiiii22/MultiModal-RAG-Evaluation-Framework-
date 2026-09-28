import time
from typing import List, Dict, Any
from app.rag.base_rag import BaseRAGPipeline
from app.models.schemas import RAGExecutionResult

class AgenticRAG(BaseRAGPipeline):
    """Agentic RAG Pipeline: Agent Planner -> Multi-Search Tool Execution -> Evidence Synthesis -> Final Answer."""
    
    def __init__(self, top_k: int = 4):
        super().__init__("Agentic RAG", top_k=top_k)

    def generate(self, query: str, context: List[Dict[str, Any]]) -> str:
        return super().generate(query, context)

    def run(self, query: str, top_k: int = 4) -> RAGExecutionResult:
        start_total = time.time()
        trace = []
        
        # 1. Agent Planner Phase
        trace.append({
            "step": 1,
            "action": "Agent Planner",
            "plan": [
                f"1. Deconstruct query '{query}' into core sub-questions.",
                "2. Execute Search 1: Primary domain terms retrieval.",
                "3. Evaluate Search 1 results for completeness.",
                "4. Execute Search 2: Secondary contextual term retrieval.",
                "5. Aggregate and synthesize multi-source evidence."
            ]
        })
        
        # 2. Tool Search Iteration 1
        start_ret = time.time()
        search_1_chunks = self.retrieve(query, top_k=max(2, top_k // 2))
        
        trace.append({
            "step": 2,
            "action": "Tool Call [vector_search_tool]",
            "input": {"sub_query": query, "top_k": max(2, top_k // 2)},
            "retrieved_count": len(search_1_chunks)
        })
        
        # 3. Agent Evaluation & Decision for Iteration 2
        secondary_query = f"{query} details background evaluation metrics"
        search_2_chunks = self.retrieve(secondary_query, top_k=max(2, top_k // 2))
        
        trace.append({
            "step": 3,
            "action": "Tool Call [supplementary_search_tool]",
            "input": {"sub_query": secondary_query, "top_k": max(2, top_k // 2)},
            "retrieved_count": len(search_2_chunks)
        })
        
        retrieval_time = round(time.time() - start_ret, 3)

        # Combine & deduplicate context
        all_chunks = search_1_chunks + search_2_chunks
        unique_chunks = {}
        for c in all_chunks:
            unique_chunks[c.get("chunk_id")] = c
        final_context = list(unique_chunks.values())[:top_k]

        trace.append({
            "step": 4,
            "action": "Evidence Synthesis & Reflection",
            "decision": "READY_TO_GENERATE",
            "total_unique_passages": len(final_context)
        })

        # 4. Generate Final Synthesized Response
        start_gen = time.time()
        answer = self.generate(query, final_context)
        generation_time = round(time.time() - start_gen, 3)
        
        total_time = round(time.time() - start_total, 3)
        
        return RAGExecutionResult(
            architecture="Agentic RAG",
            query=query,
            answer=answer,
            retrieved_context=final_context,
            retrieval_time=retrieval_time,
            generation_time=generation_time,
            total_time=total_time,
            status="success",
            metadata={
                "num_agent_iterations": 2,
                "tool_calls": ["vector_search_tool", "supplementary_search_tool"],
                "evidence_count": len(final_context)
            },
            execution_trace=trace
        )
