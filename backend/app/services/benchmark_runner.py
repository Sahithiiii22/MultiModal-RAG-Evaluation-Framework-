import uuid
import pandas as pd
from typing import List, Dict, Any, Optional
from app.models.schemas import (
    BenchmarkRequest, BenchmarkResponse, BenchmarkMetricsSummary,
    PipelineExecutionResponse, BenchmarkQueryItem
)
from app.services.query_analyzer import query_analyzer
from app.rag.basic_rag import BasicRAG
from app.rag.self_rag import SelfRAG
from app.rag.adaptive_rag import AdaptiveRAG
from app.rag.agentic_rag import AgenticRAG
from app.evaluation.evaluator import evaluator_service
from app.evaluation.judge import final_judge

DEFAULT_BENCHMARK_SUITE: List[BenchmarkQueryItem] = [
    BenchmarkQueryItem(
        id="q1",
        query="What is Naive RAG and what are its primary limitations?",
        ground_truth="Naive RAG performs single-pass Top-K similarity search. Its main limitations are vulnerability to noise, hallucination when context is irrelevant, and lack of dynamic multi-hop query planning.",
        category="factual"
    ),
    BenchmarkQueryItem(
        id="q2",
        query="Compare Self-RAG and Adaptive RAG in terms of latency, faithfulness, and context filtering mechanism.",
        ground_truth="Self-RAG uses self-reflection tokens to evaluate context relevance and output faithfulness, yielding high accuracy but higher latency (~2.1s). Adaptive RAG uses query routing to dynamically configure Top-K and query expansion, balancing speed (~1.3s) and multi-source synthesis.",
        category="comparative"
    ),
    BenchmarkQueryItem(
        id="q3",
        query="Explain step-by-step how Agentic RAG plans and executes multi-tool searches to answer complex questions.",
        ground_truth="Agentic RAG constructs an autonomous retrieval plan, executes sequential targeted search tools, evaluates intermediate evidence completeness, and synthesizes multi-document findings.",
        category="multi_step_reasoning"
    ),
    BenchmarkQueryItem(
        id="q4",
        query="What metrics are used to measure context relevance, context precision, and faithfulness in RAG evaluation frameworks?",
        ground_truth="Context Relevance measures signal ratio in chunks. Context Precision evaluates top-k score quality. Faithfulness checks if answer statements are grounded in retrieved context without hallucination.",
        category="summarization"
    )
]

class BenchmarkRunnerService:
    """Executes automated benchmark suites across all RAG architectures and computes Win Rates."""

    def run_benchmark(self, request: Optional[BenchmarkRequest] = None) -> BenchmarkResponse:
        queries = (request.queries if (request and request.queries) else None) or DEFAULT_BENCHMARK_SUITE
        architectures_to_run = (request.architectures_to_run if (request and request.architectures_to_run) else None) or ["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"]

        rag_instances = {
            "Basic RAG": BasicRAG(),
            "Self-RAG": SelfRAG(),
            "Adaptive RAG": AdaptiveRAG(),
            "Agentic RAG": AgenticRAG()
        }

        pipeline_runs: List[PipelineExecutionResponse] = []
        win_counts: Dict[str, int] = {arch: 0 for arch in architectures_to_run}
        metrics_accumulator: Dict[str, Dict[str, List[float]]] = {
            arch: {
                "faithfulness": [],
                "answer_relevance": [],
                "context_relevance": [],
                "correctness": [],
                "latency": [],
                "overall_score": []
            } for arch in architectures_to_run
        }

        for item in queries:
            q_id = str(uuid.uuid4())
            classification = query_analyzer.analyze_query(item.query)
            
            rag_results = {}
            evaluations = {}

            for arch_name in architectures_to_run:
                if arch_name in rag_instances:
                    pipeline = rag_instances[arch_name]
                    if arch_name == "Adaptive RAG":
                        res = pipeline.run(item.query, classification=classification)
                    else:
                        res = pipeline.run(item.query)
                    
                    ev = evaluator_service.evaluate_result(res, ground_truth=item.ground_truth, metric_weights=request.metric_weights if request else None)
                    
                    rag_results[arch_name] = res
                    evaluations[arch_name] = ev

                    # Accumulate stats
                    metrics_accumulator[arch_name]["faithfulness"].append(ev.faithfulness)
                    metrics_accumulator[arch_name]["answer_relevance"].append(ev.answer_relevance)
                    metrics_accumulator[arch_name]["context_relevance"].append(ev.context_relevance)
                    if ev.correctness is not None:
                        metrics_accumulator[arch_name]["correctness"].append(ev.correctness)
                    metrics_accumulator[arch_name]["latency"].append(ev.total_response_time)
                    metrics_accumulator[arch_name]["overall_score"].append(ev.overall_score)

            judge_decision = final_judge.evaluate_and_recommend(
                query=item.query,
                classification=classification,
                rag_results=rag_results,
                evaluations=evaluations,
                metric_weights=request.metric_weights if request else None
            )

            rec_arch = judge_decision.recommended_architecture
            if rec_arch in win_counts:
                win_counts[rec_arch] += 1

            selected_result = rag_results.get(rec_arch)
            selected_evaluation = evaluations.get(rec_arch)
            answer = selected_result.answer if selected_result and selected_result.status == "success" else "Unable to generate an answer because the RAG/LLM service is currently unavailable."

            pipeline_response = PipelineExecutionResponse(
                query_id=q_id,
                query=item.query,
                answer=answer,
                sources=selected_result.retrieved_context if selected_result and selected_result.status == "success" else [],
                selected_rag=rec_arch if selected_result and selected_result.status == "success" else "None",
                rag_reason=judge_decision.reason,
                evaluation=selected_evaluation,
                confidence=judge_decision.confidence,
                timestamp=pd.Timestamp.now().isoformat(),
                query_classification=classification,
                rag_results=rag_results,
                evaluations=evaluations,
                final_judge=judge_decision,
                total_pipeline_time=sum(r.total_time for r in rag_results.values()),
                is_demo_mode=False
            )
            pipeline_runs.append(pipeline_response)

        # Calculate final benchmark summaries
        total_q = len(queries)
        summaries: List[BenchmarkMetricsSummary] = []
        for arch in architectures_to_run:
            wins = win_counts.get(arch, 0)
            win_rate = round((wins / max(1, total_q)) * 100.0, 1)
            
            acc = metrics_accumulator[arch]
            avg_faith = round(sum(acc["faithfulness"]) / max(1, len(acc["faithfulness"])), 2)
            avg_ans_rel = round(sum(acc["answer_relevance"]) / max(1, len(acc["answer_relevance"])), 2)
            avg_ctx_rel = round(sum(acc["context_relevance"]) / max(1, len(acc["context_relevance"])), 2)
            avg_corr = round(sum(acc["correctness"]) / len(acc["correctness"]), 2) if acc["correctness"] else None
            avg_lat = round(sum(acc["latency"]) / max(1, len(acc["latency"])), 2)
            avg_overall = round(sum(acc["overall_score"]) / max(1, len(acc["overall_score"])), 3)

            summaries.append(BenchmarkMetricsSummary(
                architecture=arch,
                win_rate_percent=win_rate,
                win_count=wins,
                avg_faithfulness=avg_faith,
                avg_answer_relevance=avg_ans_rel,
                avg_context_relevance=avg_ctx_rel,
                avg_correctness=avg_corr,
                avg_latency_sec=avg_lat,
                avg_overall_score=avg_overall
            ))

        summaries.sort(key=lambda x: x.win_rate_percent, reverse=True)

        return BenchmarkResponse(
            benchmark_id=str(uuid.uuid4()),
            timestamp=pd.Timestamp.now().isoformat(),
            total_queries=total_q,
            summaries=summaries,
            query_results=pipeline_runs
        )

benchmark_runner = BenchmarkRunnerService()
