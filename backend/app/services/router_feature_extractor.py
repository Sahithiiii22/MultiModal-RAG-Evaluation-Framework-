import re
import numpy as np
from typing import Dict, Any, List
from app.retrieval.vector_store import vector_store

class RouterFeatureExtractor:
    """
    Extracts cheap, ultra-fast (< 2ms) statistical and retrieval features 
    from a user query to feed into the learned ML RAG Router.
    """

    FACTOID_WORDS = {"who", "what", "where", "when", "which", "name", "email", "phone", "location", "cgpa", "degree", "title"}
    REASONING_WORDS = {"why", "how", "compare", "contrast", "difference", "explain", "step-by-step", "synthesize", "analyze", "evaluate", "relationship", "trade-off", "tradeoff", "versus", "vs"}
    SUMMARY_WORDS = {"summarize", "summary", "overview", "outline", "key points", "main points", "brief", "digest"}

    FEATURE_NAMES = [
        "length_chars",
        "word_count",
        "avg_word_len",
        "is_factoid",
        "is_reasoning_multihop",
        "is_summarization",
        "entity_capital_count",
        "has_numbers",
        "question_mark",
        "retrieval_top1_score",
        "retrieval_top3_mean_score",
        "retrieval_score_spread"
    ]

    def extract_features(self, query: str) -> Dict[str, float]:
        q_clean = query.strip()
        words = re.findall(r'\b\w+\b', q_clean.lower())
        raw_words = q_clean.split()
        
        # 1. Length & Word statistics
        length_chars = float(len(q_clean))
        word_count = float(len(words)) if words else 1.0
        avg_word_len = float(sum(len(w) for w in words) / word_count) if words else 0.0

        # 2. Intent Keyword Signals
        is_factoid = 1.0 if any(w in self.FACTOID_WORDS for w in words[:4]) else 0.0
        is_reasoning = 1.0 if any(w in self.REASONING_WORDS for w in words) else 0.0
        is_summary = 1.0 if any(w in self.SUMMARY_WORDS for w in words) else 0.0

        # 3. Entity & Number cues
        entity_caps = float(sum(1 for w in raw_words if len(w) > 1 and w[0].isupper()))
        has_numbers = 1.0 if any(char.isdigit() for char in q_clean) else 0.0
        question_mark = 1.0 if q_clean.endswith('?') else 0.0

        # 4. Fast Retrieval Confidence & Spread Analysis (Top 3 lookup)
        retrieval_top1 = 0.50
        retrieval_top3_mean = 0.40
        retrieval_spread = 0.10

        try:
            if hasattr(vector_store, 'search'):
                top_chunks = vector_store.search(q_clean, top_k=3)
                if top_chunks:
                    scores = [getattr(c, 'score', 0.5) if hasattr(c, 'score') else c.get('score', 0.5) for c in top_chunks]
                    if scores:
                        retrieval_top1 = float(scores[0])
                        retrieval_top3_mean = float(np.mean(scores))
                        retrieval_spread = float(np.std(scores)) if len(scores) > 1 else 0.0
        except Exception:
            pass

        feature_dict = {
            "length_chars": length_chars,
            "word_count": word_count,
            "avg_word_len": avg_word_len,
            "is_factoid": is_factoid,
            "is_reasoning_multihop": is_reasoning,
            "is_summarization": is_summary,
            "entity_capital_count": entity_caps,
            "has_numbers": has_numbers,
            "question_mark": question_mark,
            "retrieval_top1_score": retrieval_top1,
            "retrieval_top3_mean_score": retrieval_top3_mean,
            "retrieval_score_spread": retrieval_spread
        }

        return feature_dict

    def to_feature_vector(self, feature_dict: Dict[str, float]) -> List[float]:
        return [feature_dict[name] for name in self.FEATURE_NAMES]

router_feature_extractor = RouterFeatureExtractor()
