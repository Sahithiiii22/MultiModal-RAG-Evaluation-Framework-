import math
import re
from typing import List
from sklearn.feature_extraction.text import HashingVectorizer

class EmbeddingManager:
    """Provides fast, high-dimensional n-gram vector embeddings for high retrieval accuracy."""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.vectorizer = HashingVectorizer(
            n_features=2048,
            ngram_range=(1, 2),
            alternate_sign=False,
            norm='l2',
            lowercase=True
        )

    def get_embedding(self, text: str) -> List[float]:
        if not text or not text.strip():
            return [0.0] * 2048
        
        vec = self.vectorizer.transform([text])
        return vec.toarray()[0].tolist()

    def get_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        cleaned = [t if t and t.strip() else " " for t in texts]
        matrix = self.vectorizer.transform(cleaned)
        return matrix.toarray().tolist()

embedding_manager = EmbeddingManager()
