import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from root and backend directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BASE_DIR)
load_dotenv(os.path.join(ROOT_DIR, ".env"))
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv()

class Settings:
    APP_NAME: str = "Unified Multimodal RAG Evaluation & Selection Framework"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    
    # Provider options: "groq", "gemini", "openai", "anthropic", "ollama", "demo"
    _provider_env = os.getenv("LLM_PROVIDER", "")
    if _provider_env and _provider_env.lower() == "groq" and os.getenv("GROQ_API_KEY", ""):
        LLM_PROVIDER: str = "groq"
    elif _provider_env and _provider_env.lower() == "gemini" and GEMINI_API_KEY:
        LLM_PROVIDER: str = "gemini"
    elif _provider_env and _provider_env.lower() == "openai" and OPENAI_API_KEY:
        LLM_PROVIDER: str = "openai"
    elif _provider_env and _provider_env.lower() in ("ollama", "anthropic"):
        LLM_PROVIDER: str = _provider_env.lower()
    elif os.getenv("GROQ_API_KEY", ""):
        LLM_PROVIDER: str = "groq"
    elif GEMINI_API_KEY:
        LLM_PROVIDER: str = "gemini"
    elif OPENAI_API_KEY:
        LLM_PROVIDER: str = "openai"
    else:
        LLM_PROVIDER: str = "demo"
        
    # Model configuration
    _model_env = os.getenv("LLM_MODEL", "")
    if _model_env:
        LLM_MODEL: str = _model_env
    elif LLM_PROVIDER == "groq":
        LLM_MODEL: str = "openai/gpt-oss-120b"
    elif LLM_PROVIDER == "gemini":
        LLM_MODEL: str = "gemini-1.5-flash"
    else:
        LLM_MODEL: str = "gpt-4o-mini"
        
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    API_KEY: str = (
        os.getenv("GROQ_API_KEY", "") if LLM_PROVIDER == "groq"
        else GEMINI_API_KEY if LLM_PROVIDER == "gemini"
        else (OPENAI_API_KEY or GEMINI_API_KEY)
    )
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "http://localhost:11434")
    LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "90"))
    
    VECTOR_DB: str = os.getenv("VECTOR_DB", "chroma")
    TOP_K: int = int(os.getenv("TOP_K", "6"))
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "400"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "80"))
    
    # Evaluation metric weights
    WEIGHT_FAITHFULNESS: float = 0.25
    WEIGHT_ANSWER_RELEVANCE: float = 0.20
    WEIGHT_CONTEXT_RELEVANCE: float = 0.20
    WEIGHT_CORRECTNESS: float = 0.25
    WEIGHT_EFFICIENCY: float = 0.10

    # Paths
    BASE_DIR: str = BASE_DIR
    UPLOAD_DIR: str = os.path.join(ROOT_DIR, "data", "uploads")
    VECTOR_DB_DIR: str = os.path.join(ROOT_DIR, "data", "vector_db")

settings = Settings()

