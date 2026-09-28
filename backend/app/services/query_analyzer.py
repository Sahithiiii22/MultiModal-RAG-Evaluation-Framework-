import re
from app.models.schemas import QueryClassification

class QueryAnalyzerService:
    """Lightweight query analyzer that classifies queries into functional categories and complexity levels."""

    def analyze_query(self, query: str) -> QueryClassification:
        q_lower = query.lower().strip()
        words = q_lower.split()
        word_count = len(words)

        # ── Keyword trigger sets ──────────────────────────────────────────────
        is_definitional = bool(re.search(
            r'^(what is|what are|define|definition of|meaning of|what does .* mean)',
            q_lower
        ))
        is_comparative = any(w in q_lower for w in [
            "compare", "vs", "versus", "difference", "differences",
            "pros and cons", "trade-off", "tradeoff", "better than",
            "which is better", "contrast"
        ])
        # reasoning keywords — but NOT if the query is purely definitional
        is_reasoning = (not is_definitional) and any(w in q_lower for w in [
            "why", "how come", "reason", "step by step", "step-by-step",
            "evaluate", "analyze", "analyse", "impact", "how does", "how do",
            "explain how", "explain why"
        ])
        is_summarization = any(w in q_lower for w in [
            "summarize", "summary", "overview", "key points",
            "bullet points", "main points", "brief", "recap"
        ])
        is_retrieval_heavy = any(phrase in q_lower for phrase in [
            "list all", "find all", "extract all", "across documents",
            "across all documents", "show all", "enumerate all"
        ])
        # True multi-document: explicitly references multiple files/docs
        is_multi_document = any(phrase in q_lower for phrase in [
            "multiple documents", "across documents", "all documents",
            "different files", "each document", "both documents",
            "across files"
        ])

        # ── Classification priority (order matters) ───────────────────────────
        if is_comparative:
            q_type     = "comparative"
            complexity = "high" if word_count > 10 else "medium"
            mult_src   = True
            req_reason = True
            strategy   = "Adaptive Multi-Query Search with Comparative Synthesis"

        elif is_reasoning:
            q_type     = "multi_step_reasoning"
            complexity = "high"
            mult_src   = True
            req_reason = True
            strategy   = "Agentic Multi-Step Search & Plan Execution"

        elif is_summarization:
            q_type     = "summarization"
            complexity = "medium"
            mult_src   = True
            req_reason = False
            strategy   = "Self-RAG Context Verification & Summarization"

        elif is_retrieval_heavy:
            q_type     = "retrieval_heavy"
            complexity = "medium"
            mult_src   = True
            req_reason = False
            strategy   = "Self-RAG Deep Retrieval with Strict Precision Filtering"

        elif is_definitional:
            # "What is X?" / "Define X" — simple knowledge lookup, no multi-doc needed
            q_type     = "definitional"
            complexity = "low"
            mult_src   = False
            req_reason = False
            strategy   = "Basic Single-Pass Direct Retrieval"

        elif word_count <= 5 and not any(w in q_lower for w in ["what", "how", "why", "where", "when"]):
            # Very short factual lookups: "CGPA score", "project title"
            q_type     = "simple_factual"
            complexity = "low"
            mult_src   = False
            req_reason = False
            strategy   = "Basic Single-Pass Direct Retrieval"

        elif is_multi_document:
            q_type     = "multi_document"
            complexity = "medium"
            mult_src   = True
            req_reason = False
            strategy   = "Adaptive Dynamic Multi-Document Search"

        else:
            # Generic informational queries — no special bonus for any single architecture
            q_type     = "informational"
            complexity = "medium"
            mult_src   = False
            req_reason = False
            strategy   = "Basic Retrieval-Augmented Generation"

        # ── Ambiguity ─────────────────────────────────────────────────────────
        ambiguity = "low"
        if word_count < 3:
            ambiguity = "high"
        elif any(w in q_lower for w in ["it", "they", "this", "that"]) and word_count < 7:
            ambiguity = "medium"

        return QueryClassification(
            query_type=q_type,
            complexity=complexity,
            requires_multiple_sources=mult_src,
            requires_reasoning=req_reason,
            ambiguity_level=ambiguity,
            recommended_strategy=strategy
        )

query_analyzer = QueryAnalyzerService()
