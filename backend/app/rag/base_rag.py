import time
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from app.models.schemas import RAGExecutionResult
from app.retrieval.retriever import StandardRetriever
from app.services.answer_generator import answer_generator

class BaseRAGPipeline(ABC):
    """Abstract Base Class for all RAG Architecture Implementations."""
    
    def __init__(self, architecture_name: str, top_k: int = 4):
        self.architecture_name = architecture_name
        self.retriever = StandardRetriever(top_k=top_k)

    def retrieve(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        return self.retriever.retrieve(query, top_k=top_k)

    @abstractmethod
    def generate(self, query: str, context: List[Dict[str, Any]]) -> str:
        return answer_generator.generate(query, context)

    @abstractmethod
    def run(self, query: str, top_k: int = 4) -> RAGExecutionResult:
        pass
