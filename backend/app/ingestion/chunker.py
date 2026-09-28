import uuid
from typing import List, Dict, Any
from app.models.schemas import DocumentChunk, DocumentMetadata

class TextChunker:
    """Configurable document text chunker with overlap and metadata retention."""
    
    def __init__(self, chunk_size: int = 200, chunk_overlap: int = 30):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_pages(self, metadata: DocumentMetadata, pages: List[Dict[str, Any]]) -> List[DocumentChunk]:
        chunks: List[DocumentChunk] = []
        
        for page in pages:
            text = page.get("text", "")
            page_num = page.get("page_number", 1)
            source_type = page.get("source_type", "document")
            content_type = page.get("content_type", "text")
            
            if not text or not text.strip():
                continue
                
            words = text.split()
            if not words:
                continue
                
            # If page text is within chunk size, create 1 complete chunk
            if len(words) <= self.chunk_size:
                chunk_obj = DocumentChunk(
                    chunk_id=f"{metadata.doc_id}_p{page_num}_c{len(chunks)+1}",
                    doc_id=metadata.doc_id,
                    filename=metadata.filename,
                    page_number=page_num,
                    source_type=source_type,
                    content_type=content_type,
                    text=" ".join(words),
                    embedding=None,
                    score=0.0
                )
                chunks.append(chunk_obj)
                continue

            # Sliding window chunking with overlap
            start = 0
            while start < len(words):
                end = min(start + self.chunk_size, len(words))
                chunk_words = words[start:end]
                chunk_text = " ".join(chunk_words)
                
                chunk_obj = DocumentChunk(
                    chunk_id=f"{metadata.doc_id}_p{page_num}_c{len(chunks)+1}",
                    doc_id=metadata.doc_id,
                    filename=metadata.filename,
                    page_number=page_num,
                    source_type=source_type,
                    content_type=content_type,
                    text=chunk_text,
                    embedding=None,
                    score=0.0
                )
                chunks.append(chunk_obj)
                
                if end >= len(words):
                    break
                start += (self.chunk_size - self.chunk_overlap)
                
        # If no chunks were created, ensure at least one placeholder chunk exists
        if not chunks:
            chunks.append(DocumentChunk(
                chunk_id=f"{metadata.doc_id}_c1",
                doc_id=metadata.doc_id,
                filename=metadata.filename,
                page_number=1,
                source_type=metadata.file_type,
                content_type="text",
                text=f"Document: {metadata.filename}. Uploaded file metadata.",
                embedding=None,
                score=0.0
            ))
            
        metadata.chunk_count = len(chunks)
        return chunks
