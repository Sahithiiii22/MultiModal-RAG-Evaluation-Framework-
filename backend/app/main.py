import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import router as api_router
from app.ingestion.indexer import initialize_default_documents

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="Production-Quality Research Framework for Multimodal RAG Evaluation, Benchmarking & Query-Adaptive RAG Selection."
)

# CORS middleware for local frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.on_event("startup")
def startup_event():
    initialize_default_documents()

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs_url": "/docs",
        "api_endpoint": "/api/query",
        "version": settings.VERSION
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
