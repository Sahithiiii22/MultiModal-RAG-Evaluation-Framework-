import os
import json
import math
import re
import logging
from typing import List, Dict, Any, Optional
from app.models.schemas import DocumentChunk, DocumentMetadata
from app.retrieval.embeddings import embedding_manager

logger = logging.getLogger(__name__)

PERSISTENCE_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "vector_store_persistence.json")

class VectorStore:
    """In-memory & persistent vector database store supporting hybrid similarity & keyword retrieval."""
    
    def __init__(self, persistence_file: str = PERSISTENCE_PATH):
        self.chunks: List[DocumentChunk] = []
        self.documents: Dict[str, DocumentMetadata] = {}
        self.persistence_file = persistence_file
        self.load_from_disk()

    def add_chunks(self, chunks: List[DocumentChunk]):
        for chunk in chunks:
            if not chunk.embedding:
                chunk.embedding = embedding_manager.get_embedding(chunk.text)
            self.chunks.append(chunk)
        self.save_to_disk()

    def add_document_metadata(self, metadata: DocumentMetadata):
        self.documents[metadata.doc_id] = metadata
        self.save_to_disk()

    def delete_document(self, doc_id: str) -> bool:
        if doc_id in self.documents:
            del self.documents[doc_id]
            self.chunks = [c for c in self.chunks if c.doc_id != doc_id]
            self.save_to_disk()
            return True
        return False

    def get_all_documents(self) -> List[DocumentMetadata]:
        return list(self.documents.values())

    def clear(self):
        self.chunks = []
        self.documents = {}
        self.save_to_disk()

    def save_to_disk(self):
        try:
            os.makedirs(os.path.dirname(self.persistence_file), exist_ok=True)
            data = {
                "documents": {doc_id: meta.dict() for doc_id, meta in self.documents.items()},
                "chunks": [chunk.dict() for chunk in self.chunks]
            }
            with open(self.persistence_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"Could not persist vector store to disk: {e}")

    def load_from_disk(self):
        if not os.path.exists(self.persistence_file):
            return
        try:
            with open(self.persistence_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.documents = {doc_id: DocumentMetadata(**meta) for doc_id, meta in data.get("documents", {}).items()}
            self.chunks = [DocumentChunk(**chunk) for chunk in data.get("chunks", [])]
            logger.info(f"Loaded {len(self.documents)} documents and {len(self.chunks)} chunks from persistent storage.")
        except Exception as e:
            logger.warning(f"Could not load vector store from disk: {e}")

    def search(self, query: str, top_k: int = 4, filter_doc_ids: Optional[List[str]] = None) -> List[DocumentChunk]:
        if not self.chunks:
            return []
            
        query_clean = query.lower().strip()
        query_vec = embedding_manager.get_embedding(query_clean)
        query_words = [w for w in re.findall(r'\w+', query_clean) if len(w) > 2]
        
        scored_chunks = []
        for chunk in self.chunks:
            if filter_doc_ids and chunk.doc_id not in filter_doc_ids:
                continue
                
            # Vector Cosine Similarity
            vec = chunk.embedding or embedding_manager.get_embedding(chunk.text)
            dot_product = sum(q * v for q, v in zip(query_vec, vec))
            
            # Keyword overlap boost (Hybrid RAG)
            chunk_lower = chunk.text.lower()
            chunk_words = set(re.findall(r'\w+', chunk_lower))
            
            overlap_count = sum(1 for qw in query_words if qw in chunk_words or qw in chunk_lower)
            keyword_score = (overlap_count / max(1, len(query_words))) if query_words else 0.0
            
            # Filename relevance bonus (e.g. if query mentions person's name or document title)
            filename_lower = chunk.filename.lower()
            filename_bonus = 0.25 if any(qw in filename_lower for qw in query_words if len(qw) > 3) else 0.0
            
            # Combine vector + keyword score + filename bonus
            total_score = (0.50 * dot_product) + (0.40 * keyword_score) + (0.10 * filename_bonus)
            
            chunk_copy = DocumentChunk(**chunk.dict())
            chunk_copy.score = round(float(total_score), 4)
            scored_chunks.append(chunk_copy)
            
        # Sort by similarity score descending
        scored_chunks.sort(key=lambda x: x.score or 0.0, reverse=True)
        return scored_chunks[:top_k]

# Global singleton vector store instance
vector_store = VectorStore()
