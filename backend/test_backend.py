import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.retrieval.vector_store import vector_store
from app.ingestion.indexer import initialize_default_documents

client = TestClient(app)

def test_full_pipeline():
    print("1. Initializing default documents...")
    initialize_default_documents()
    print(f"Total documents loaded: {len(vector_store.documents)}, Total chunks: {len(vector_store.chunks)}")

    print("\n2. Testing /api/health...")
    r = client.get("/api/health")
    assert r.status_code == 200
    print("Health response:", r.json())

    print("\n3. Testing /api/documents/text (Raw text upload)...")
    sample_text = {
        "title": "Quantum_Computing_Overview.txt",
        "content": "Quantum computing uses quantum bits or qubits. Unlike classical bits, qubits can exist in superpositions of 0 and 1. Quantum entanglement allows qubits to be correlated with each other."
    }
    r = client.post("/api/documents/text", json=sample_text)
    assert r.status_code == 200
    data = r.json()
    print("Text upload response:", data)
    assert data["status"] == "success"
    assert data["chunks_created"] > 0

    print("\n4. Testing /api/documents list...")
    r = client.get("/api/documents")
    assert r.status_code == 200
    docs = r.json()
    print(f"Total documents listed: {len(docs)}")

    print("\n5. Testing /api/query (All 4 RAG architectures)...")
    query_payload = {
        "query": "Compare Self-RAG and Adaptive RAG in terms of latency and context filtering mechanism.",
        "selected_architectures": ["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"],
        "top_k": 4
    }
    r = client.post("/api/query", json=query_payload)
    assert r.status_code == 200
    res = r.json()
    print("Selected RAG Architecture:", res["selected_rag"])
    print("Reason:", res["rag_reason"])
    print("Confidence:", res["confidence"])
    print("Recommended by Final Judge:", res["final_judge"]["recommended_architecture"])
    print("Final Judge Rankings:", [(item["rank"], item["architecture"]) for item in res["final_judge"]["ranking"]])
    print("Tradeoff analysis keys:", list(res["final_judge"]["tradeoff_analysis"].keys()))
    assert len(res["rag_results"]) == 4

    print("\n5b. Testing /api/query with Custom Priority Metric Weights (Speed Optimized)...")
    speed_query_payload = {
        "query": "What is Naive RAG?",
        "selected_architectures": ["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"],
        "top_k": 2,
        "metric_weights": {
            "faithfulness": 0.10,
            "answer_relevance": 0.20,
            "context_relevance": 0.10,
            "correctness": 0.10,
            "context_recall": 0.05,
            "efficiency": 0.45
        }
    }
    r = client.post("/api/query", json=speed_query_payload)
    assert r.status_code == 200
    res_speed = r.json()
    print("Speed-weighted Recommended Architecture:", res_speed["final_judge"]["recommended_architecture"])
    print("Speed-weighted Top Rank:", res_speed["final_judge"]["ranking"][0]["architecture"])

    print("\n6. Testing /api/benchmark...")
    r = client.post("/api/benchmark", json={})
    assert r.status_code == 200
    bench = r.json()
    print(f"Benchmark completed on {bench['total_queries']} queries.")
    for s in bench["summaries"]:
        print(f"  - {s['architecture']}: Win Rate {s['win_rate_percent']}% | Score: {s['avg_overall_score']}")

    print("\nAll Backend Tests PASSED Successfully!")

if __name__ == "__main__":
    test_full_pipeline()
