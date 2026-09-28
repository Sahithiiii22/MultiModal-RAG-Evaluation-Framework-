from typing import Dict, Any, Optional
from app.models.schemas import RAGExecutionResult, RAGEvaluationMetrics, QueryClassification
from app.evaluation.metrics import MetricsCalculator

class RAGEvaluatorService:
    """Dedicated Evaluation Service evaluating each RAG system output consistently."""

    def evaluate_result(
        self,
        result: RAGExecutionResult,
        ground_truth: Optional[str] = None,
        metric_weights: Optional[Any] = None,
        classification: Optional[QueryClassification] = None,
    ) -> RAGEvaluationMetrics:
        if result.status == "failed":
            return RAGEvaluationMetrics(
                architecture=result.architecture,
                context_relevance=0.0,
                context_precision=0.0,
                context_recall=0.0 if ground_truth else None,
                answer_relevance=0.0,
                faithfulness=0.0,
                correctness=0.0 if ground_truth else None,
                retrieval_latency=result.retrieval_time,
                generation_latency=result.generation_time,
                total_response_time=result.total_time,
                num_retrieved_chunks=0,
                num_llm_calls=0,
                token_usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
                overall_score=0.0
            )

        calculated = MetricsCalculator.calculate_metrics(
            query=result.query,
            answer=result.answer,
            retrieved_context=result.retrieved_context,
            retrieval_time=result.retrieval_time,
            generation_time=result.generation_time,
            total_time=result.total_time,
            ground_truth=ground_truth,
            metric_weights=metric_weights,
            architecture=result.architecture,
            classification=classification,
        )

        return RAGEvaluationMetrics(
            architecture=result.architecture,
            **calculated
        )

evaluator_service = RAGEvaluatorService()
