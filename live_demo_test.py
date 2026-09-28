import requests
import json
import time
import sys

# Ensure UTF-8 output for Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:3000/api"

def run_live_demo():
    print("=" * 60)
    print("STARTING LIVE MULTIMODAL RAG FRAMEWORK DEMO VALIDATION")
    print("=" * 60)

    # 1. Health Check
    print("\n[Step 1] Verifying System Health...")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health = r.json()
    print(f"[OK] Backend Status: {health['status'].upper()}")
    print(f"[OK] LLM Provider: {health['llm_provider']}")
    print(f"[OK] Initial Documents: {health['total_documents']} | Initial Chunks: {health['total_chunks']}")

    # 2. Upload/Paste Raw Text Note
    print("\n[Step 2] Testing Raw Text Ingestion...")
    payload = {
        "title": "Quantum_and_Neuromorphic_Computing_Overview.txt",
        "content": (
            "Neuromorphic computing mimics the biological neural architecture of the human brain. "
            "It uses spiking neural networks (SNNs) to achieve ultra-low power consumption for edge AI. "
            "In contrast, quantum computing leverages qubits and quantum superposition to solve complex "
            "combinatorial optimization and factorization problems exponentially faster than classical computers."
        )
    }
    r = requests.post(f"{BASE_URL}/documents/text", json=payload)
    assert r.status_code == 200, f"Text ingestion failed: {r.text}"
    doc_res = r.json()
    print(f"[OK] Ingested: {doc_res['metadata']['filename']} (ID: {doc_res['metadata']['doc_id']})")
    print(f"[OK] Chunks created: {doc_res['chunks_created']}")

    # 3. Retrieve Documents List
    print("\n[Step 3] Verifying Knowledge Base Documents...")
    r = requests.get(f"{BASE_URL}/documents")
    assert r.status_code == 200
    docs = r.json()
    print(f"[OK] Total Documents Ingested: {len(docs)}")
    for d in docs:
        print(f"   • {d['filename']} [{d['file_type'].upper()}] - {d['chunk_count']} chunks")

    # 4. Execute Diverse Queries and Evaluate Final Judge Decisions
    test_queries = [
        "What is neuromorphic computing and how does it compare to quantum computing?",
        "Compare Self-RAG and Adaptive RAG in terms of latency and context filtering.",
        "Explain the step-by-step reasoning process of Agentic RAG."
    ]

    for idx, query in enumerate(test_queries, 1):
        print(f"\n[Step 4.{idx}] Executing Multi-RAG Query: '{query}'")
        q_payload = {
            "query": query,
            "selected_architectures": ["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"],
            "top_k": 4
        }
        start_t = time.time()
        r = requests.post(f"{BASE_URL}/query", json=q_payload)
        elapsed = time.time() - start_t
        assert r.status_code == 200, f"Query failed: {r.text}"
        res = r.json()

        print(f"[OK] Pipeline Response Received in {elapsed:.2f}s")
        print(f"   • Recommended Architecture: {res['final_judge']['recommended_architecture']}")
        print(f"   • Final Judge Confidence: {res['confidence'] * 100:.0f}%")
        print(f"   • Query Classification: {res['query_classification']['query_type']} (Complexity: {res['query_classification']['complexity']})")
        print(f"   • Suitability Explanation: {res['rag_reason']}")
        print(f"   • Top Grounded Answer: {res['answer'][:180]}...")
        print("   • Architecture Performance Matrix:")
        for arch_name, eval_metric in res["evaluations"].items():
            print(f"      - {arch_name:14s}: Score={eval_metric['overall_score']:.3f} | Faithfulness={eval_metric['faithfulness']*100:.0f}% | Latency={eval_metric['total_response_time']:.2f}s")

    # 5. Run Automated Benchmark
    print("\n[Step 5] Executing Benchmark Evaluation Suite...")
    r = requests.post(f"{BASE_URL}/benchmark", json={})
    assert r.status_code == 200
    bench = r.json()
    print(f"[OK] Automated Benchmark Completed on {bench['total_queries']} test queries.")
    print("[OK] Empirical Win Rate Summary:")
    for s in bench["summaries"]:
        print(f"   • {s['architecture']:14s}: Win Rate={s['win_rate_percent']:.1f}% | Wins={s['win_count']} | Score={s['avg_overall_score']:.3f} | Avg Latency={s['avg_latency_sec']:.2f}s")

    # 6. Verify History
    print("\n[Step 6] Verifying Experiment History...")
    r = requests.get(f"{BASE_URL}/history")
    assert r.status_code == 200
    hist = r.json()
    print(f"[OK] Recorded History Experiments: {len(hist)}")

    print("\n" + "=" * 60)
    print("ALL INTEGRATION TESTS AND LIVE DEMO SUCCEEDED WITH 0 ERRORS!")
    print("=" * 60)

if __name__ == "__main__":
    run_live_demo()
