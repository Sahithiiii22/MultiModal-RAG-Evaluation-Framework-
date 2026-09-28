from typing import List, Dict, Any, Optional
from app.retrieval.vector_store import vector_store
from app.models.schemas import DocumentChunk

class StandardRetriever:
    """Configurable retriever supporting Top-K, query expansion, and document filtering."""
    
    def __init__(self, top_k: int = 4):
        self.top_k = top_k

    def retrieve(self, query: str, top_k: Optional[int] = None, filter_doc_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        k = top_k or self.top_k
        chunks: List[DocumentChunk] = vector_store.search(query, top_k=k, filter_doc_ids=filter_doc_ids)
        
        result_chunks = []
        for idx, chunk in enumerate(chunks):
            result_chunks.append({
                "chunk_id": chunk.chunk_id,
                "doc_id": chunk.doc_id,
                "filename": chunk.filename,
                "page_number": chunk.page_number,
                "source_type": chunk.source_type,
                "content_type": chunk.content_type,
                "text": chunk.text,
                "score": chunk.score,
                "citation_index": idx + 1
            })
        return result_chunks
