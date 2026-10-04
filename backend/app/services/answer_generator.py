import logging
import requests
import re
import json
from typing import Any, Dict, List, Union, Iterator

from app.config import settings

logger = logging.getLogger(__name__)

# ── Valid Groq model catalog (updated 2026) ───────────────────────────────────
GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "allam-2-7b",
    "canopylabs/orpheus-v1-english",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]


class LLMUnavailableError(RuntimeError):
    """Raised when a configured answer-generation provider cannot be reached."""


class AnswerGenerator:
    STOP_WORDS = {
        "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
        "the", "and", "are", "does", "with", "from", "this", "that", "about",
        "retrieve", "get", "show", "find", "extract", "tell", "give", "search",
        "lookup", "please", "fetch", "check", "display", "list", "provide",
        "can", "you", "for", "any", "all", "its", "into", "their", "details",
        "explain", "overview", "information", "regarding"
    }

    def _get_item_attr(self, item: Any, attr: str, default: Any = "") -> Any:
        if isinstance(item, dict):
            return item.get(attr, default)
        return getattr(item, attr, default)

    def generate(self, query: str, context: List[Any]) -> str:
        provider = settings.LLM_PROVIDER.lower() if settings.LLM_PROVIDER else "demo"

        if provider == "demo" or (not settings.API_KEY and provider != "ollama"):
            return self._demo_answer(query, context)

        prompt = self._build_prompt(query, context)
        try:
            if provider in {"openai", "anthropic"}:
                return self._openai_compatible(prompt)
            if provider == "groq":
                return self._groq(prompt)
            if provider == "ollama":
                return self._ollama(prompt)
            if provider == "gemini":
                return self._gemini(prompt)
        except Exception as exc:
            logger.error(
                "[LLM] %s provider failed, falling back to demo mode. Error: %s",
                provider, exc
            )
            return self._demo_answer(query, context)

        return self._demo_answer(query, context)

    # ── STREAMING ─────────────────────────────────────────────────────────────
    def stream_generate(self, query: str, context: List[Any]) -> Iterator[str]:
        """
        Yields partial text tokens as a streaming generator.
        Falls back to a single-chunk yield if streaming is not supported.
        """
        provider = settings.LLM_PROVIDER.lower() if settings.LLM_PROVIDER else "demo"

        if provider == "demo" or (not settings.API_KEY and provider != "ollama"):
            yield self._demo_answer(query, context)
            return

        prompt = self._build_prompt(query, context)

        if provider == "groq":
            yield from self._groq_stream(prompt)
        elif provider == "gemini":
            # Gemini streaming not yet supported — yield full answer
            try:
                answer = self._gemini(prompt)
                yield answer
            except Exception as e:
                logger.error("[GEMINI-STREAM] Error: %s", e)
                yield self._demo_answer(query, context)
        else:
            try:
                answer = self.generate(query, context)
                yield answer
            except Exception as e:
                logger.error("[STREAM] Fallback failed: %s", e)
                yield self._demo_answer(query, context)

    # ── SUMMARIZATION ─────────────────────────────────────────────────────────
    def summarize_document(self, filename: str, full_text: str) -> str:
        """Generates a concise, structured summary of a document using the LLM."""
        provider = settings.LLM_PROVIDER.lower() if settings.LLM_PROVIDER else "demo"
        max_chars = 8000
        truncated = full_text[:max_chars] + ("..." if len(full_text) > max_chars else "")

        prompt = (
            f"You are an expert document analyst. Summarize the following document clearly and concisely.\n\n"
            f"Document filename: {filename}\n\n"
            f"Instructions:\n"
            f"1. Write a 2-3 sentence executive summary of what the document is about.\n"
            f"2. List the 5-7 key topics or main points covered.\n"
            f"3. Note the document type (resume, research paper, report, etc.).\n"
            f"4. Be specific — extract actual names, numbers, and facts from the content.\n\n"
            f"Document Content:\n{truncated}\n\n"
            f"Provide your structured summary now:"
        )

        if provider == "demo" or not settings.API_KEY:
            words = full_text.split()
            return (
                f"**{filename}** — Document Summary\n\n"
                f"This document contains approximately {len(words)} words across {len(full_text.splitlines())} lines.\n\n"
                f"**Key topics detected:** {', '.join(set(full_text.split()[:20])) if words else 'N/A'}"
            )

        try:
            if provider == "groq":
                return self._groq(prompt)
            elif provider == "gemini":
                return self._gemini(prompt)
            elif provider in {"openai", "anthropic"}:
                return self._openai_compatible(prompt)
        except Exception as e:
            logger.error("[SUMMARIZE] LLM summarization failed: %s", e)
            return f"Auto-summary unavailable for **{filename}**. Please query the document directly."

    # ── PROMPT BUILDER ────────────────────────────────────────────────────────
    def _build_prompt(self, query: str, context: List[Any]) -> str:
        """
        Builds the final LLM prompt.
        - If documents are in context -> accurate grounded RAG prompt that also answers general queries
        - If no documents             -> open knowledge prompt
        """
        evidence_parts = []
        for index, item in enumerate(context or [], start=1):
            filename = self._get_item_attr(item, "filename", "source")
            page_num = self._get_item_attr(item, "page_number", 1)
            text = self._get_item_attr(item, "text", "")
            if text and text.strip():
                evidence_parts.append(
                    f"[{index}] Source: {filename} (Page {page_num}):\n{text}"
                )

        evidence = "\n\n".join(evidence_parts)

        if evidence:
            return (
                "You are an intelligent, accurate AI assistant.\n\n"
                "CONTEXT FROM UPLOADED DOCUMENTS:\n"
                f"{evidence}\n\n"
                f"USER QUESTION: {query}\n\n"
                "INSTRUCTIONS:\n"
                "1. If the question asks about the uploaded document or the context contains relevant information, provide an accurate, thorough answer based directly on the context, citing the source document and page number (e.g. [Filename, Page X]).\n"
                "2. If the question is a general query (or the context does not contain the answer), answer the question fully and accurately using your general knowledge.\n"
                "3. Present information clearly with formatting (bullet points, bold text) where helpful.\n\n"
                "YOUR ANSWER:"
            )
        else:
            return (
                "You are an intelligent, helpful AI assistant.\n\n"
                f"QUESTION: {query}\n\n"
                "INSTRUCTIONS:\n"
                "1. Answer the question accurately, thoroughly, and clearly.\n"
                "2. Format your response cleanly with markdown where helpful.\n\n"
                "YOUR ANSWER:"
            )

    def _openai_compatible(self, prompt: str) -> str:
        base_url = settings.LLM_BASE_URL.rstrip("/")
        response = requests.post(
            f"{base_url}/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.API_KEY}"},
            json={
                "model": settings.LLM_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 1500,
            },
            timeout=settings.LLM_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()

    def _groq(self, prompt: str) -> str:
        """
        Groq inference — tries valid Groq models with proper rate-limit fallback.
        """
        configured = settings.LLM_MODEL or "llama-3.3-70b-versatile"
        models_to_try = [configured]
        for m in GROQ_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        last_error = None
        for model in models_to_try:
            try:
                logger.info("[GROQ] Calling model: %s", model)
                response = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.15,
                        "max_tokens": 1500,
                    },
                    timeout=settings.LLM_TIMEOUT,
                )
                if response.status_code == 200:
                    result = response.json()["choices"][0]["message"]["content"].strip()
                    logger.info("[GROQ] ✅ Success with %s (%d chars)", model, len(result))
                    return result
                elif response.status_code == 429:
                    logger.warning("[GROQ] ⏳ Rate-limited on %s, trying next...", model)
                    continue
                else:
                    error_body = response.text[:300]
                    logger.warning("[GROQ] ❌ %s → HTTP %s: %s", model, response.status_code, error_body)
                    last_error = LLMUnavailableError(f"HTTP {response.status_code}: {error_body}")
            except requests.exceptions.Timeout:
                logger.warning("[GROQ] ⏱ Timeout on model %s", model)
                last_error = LLMUnavailableError(f"Timeout on {model}")
            except Exception as e:
                logger.warning("[GROQ] ⚠ Error on model %s: %s", model, e)
                last_error = e

        if last_error:
            raise last_error
        raise LLMUnavailableError("All Groq models failed.")

    def _groq_stream(self, prompt: str) -> Iterator[str]:
        """
        Streams token-by-token from Groq using SSE.
        Yields text chunks as they arrive.
        """
        configured = settings.LLM_MODEL or ""
        models_to_try = []
        if configured and configured in GROQ_MODELS:
            models_to_try.append(configured)
        for m in GROQ_MODELS:
            if m not in models_to_try:
                models_to_try.append(m)

        for model in models_to_try:
            try:
                logger.info("[GROQ-STREAM] Calling model: %s", model)
                with requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.15,
                        "max_tokens": 1500,
                        "stream": True,
                    },
                    timeout=settings.LLM_TIMEOUT,
                    stream=True,
                ) as resp:
                    if resp.status_code == 429:
                        continue
                    resp.raise_for_status()
                    for line in resp.iter_lines():
                        if not line:
                            continue
                        decoded = line.decode("utf-8")
                        if decoded.startswith("data: "):
                            data_str = decoded[6:]
                            if data_str.strip() == "[DONE]":
                                return
                            try:
                                chunk = json.loads(data_str)
                                delta = chunk["choices"][0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    yield content
                            except Exception:
                                pass
                return  # success — exit generator
            except Exception as e:
                logger.warning("[GROQ-STREAM] Model %s error: %s", model, e)
                continue

        # All models failed — yield empty
        yield ""

    def _ollama(self, prompt: str) -> str:
        response = requests.post(
            f"{settings.LLM_BASE_URL.rstrip('/')}/api/generate",
            json={"model": settings.LLM_MODEL, "prompt": prompt, "stream": False},
            timeout=settings.LLM_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()["response"].strip()

    def _gemini(self, prompt: str) -> str:
        models_to_try = [
            settings.LLM_MODEL or "gemini-1.5-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-2.0-flash",
        ]
        seen_models: set = set()
        models = [m for m in models_to_try if not (m in seen_models or seen_models.add(m))]

        last_error = None
        for model in models:
            try:
                logger.info("[GEMINI] Trying model: %s", model)
                response = requests.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    params={"key": settings.API_KEY},
                    json={
                        "contents": [{"parts": [{"text": prompt}]}],
                        "generationConfig": {"maxOutputTokens": 1500, "temperature": 0.15},
                    },
                    timeout=60,
                )
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            logger.info("[GEMINI] ✅ Success with model: %s", model)
                            return parts[0]["text"].strip()
                else:
                    error_body = response.text[:300]
                    logger.warning(
                        "[GEMINI] Model %s → HTTP %s: %s", model, response.status_code, error_body
                    )
                    last_error = LLMUnavailableError(
                        f"HTTP {response.status_code}: {error_body}"
                    )
            except Exception as e:
                logger.warning("[GEMINI] Model %s error: %s", model, e)
                last_error = e
                continue

        if last_error:
            raise last_error
        raise LLMUnavailableError("All Gemini models failed.")

    def _demo_answer(self, query: str, context: List[Any]) -> str:
        q_lower = query.lower().strip()
        query_terms = [
            term for term in re.findall(r"\w+", q_lower)
            if len(term) > 2 and term not in self.STOP_WORDS
        ]

        # 1. Specific attribute detection (CGPA, email, phone)
        if "cgpa" in q_lower or "gpa" in q_lower:
            for item in (context or []):
                raw = self._get_item_attr(item, "text", "")
                filename = self._get_item_attr(item, "filename", "document")
                cgpa_match = re.search(
                    r"(?:CGPA|GPA)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)", raw, re.IGNORECASE
                )
                if cgpa_match:
                    cgpa_val = cgpa_match.group(1)
                    edu_match = re.search(
                        r"([^.\n]*?(?:B\.Tech|BTech|Degree|College|Institute|University|School)[^.\n]*?CGPA\s*[:=-]?\s*[0-9.]+[^.\n]*)",
                        raw, re.IGNORECASE
                    )
                    if edu_match:
                        return f"According to **{filename}**, the CGPA is **{cgpa_val}** ({edu_match.group(1).strip()})."
                    return f"According to **{filename}**, the CGPA is **{cgpa_val}**."

        if "email" in q_lower or "mail" in q_lower:
            for item in (context or []):
                raw = self._get_item_attr(item, "text", "")
                filename = self._get_item_attr(item, "filename", "document")
                email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", raw)
                if email_match:
                    return f"The email address found in **{filename}** is **{email_match.group(0)}**."

        if "phone" in q_lower or "contact" in q_lower or "mobile" in q_lower:
            for item in (context or []):
                raw = self._get_item_attr(item, "text", "")
                filename = self._get_item_attr(item, "filename", "document")
                phone_match = re.search(
                    r"(?:\+?\d{1,3}[-.\\s]?)?\(?\d{3}\)?[-.\\s]?\d{3}[-.\\s]?\d{4}", raw
                )
                if phone_match:
                    return f"The contact number found in **{filename}** is **{phone_match.group(0)}**."

        # 2. Precision-weighted sentence extraction from context
        candidate_snippets = []
        if context:
            for item in context:
                raw_text = self._get_item_attr(item, "text", "")
                doc_name = self._get_item_attr(item, "filename", "document")
                page_num = self._get_item_attr(item, "page_number", 1)

                if not raw_text or not raw_text.strip():
                    continue

                cleaned_text = re.sub(r"[#*_`]", " ", raw_text)
                segments = re.split(r"(?<=[.!?])\s+|\n+", cleaned_text)
                for seg in segments:
                    seg_clean = seg.strip()
                    if not seg_clean or len(seg_clean) < 15:
                        continue
                    seg_lower = seg_clean.lower()
                    seg_terms = set(re.findall(r"\w+", seg_lower))
                    matched = [t for t in query_terms if t in seg_terms or t in seg_lower]
                    if matched or len(query_terms) == 0:
                        score = len(matched) / max(1, len(query_terms))
                        if " ".join(query_terms) in seg_lower:
                            score += 0.5
                        candidate_snippets.append({
                            "text": seg_clean,
                            "score": score,
                            "matches": len(matched),
                            "doc": doc_name,
                            "page": page_num,
                        })

        if candidate_snippets:
            candidate_snippets.sort(key=lambda x: (x["score"], x["matches"]), reverse=True)
            best = candidate_snippets[0]
            filtered = [
                c["text"] for c in candidate_snippets
                if c["doc"] == best["doc"] and c["score"] >= best["score"] * 0.6
            ]
            unique = []
            for s in filtered:
                if s not in unique:
                    unique.append(s)
            body = " ".join(unique[:4]).strip()
            if not body.endswith((".", "!", "?")):
                body += "."
            return f"According to **{best['doc']}** (Page {best['page']}):\n\n{body}"

        # 3. General knowledge fallback (no documents uploaded)
        if not context:
            general_answers = {
                "machine learning": "Machine Learning (ML) is a branch of Artificial Intelligence where algorithms learn patterns from data to make predictions or decisions without being explicitly programmed.",
                "deep learning": "Deep Learning is a subset of machine learning that uses multi-layered neural networks to model complex patterns in data — powering applications like image recognition, NLP, and speech synthesis.",
                "rag": "Retrieval-Augmented Generation (RAG) is an AI framework that combines document retrieval with large language models to generate grounded, accurate responses from a knowledge base.",
                "self-rag": "Self-RAG dynamically critiques retrieved passages and generated answers using reflection tokens to eliminate hallucinations and improve faithfulness.",
                "adaptive rag": "Adaptive RAG dynamically routes queries to the optimal retrieval strategy based on query complexity and type classification.",
                "agentic rag": "Agentic RAG uses autonomous agent loops and multi-step tool searches to plan and answer complex multi-hop reasoning questions.",
                "python": "Python is a versatile, high-level programming language known for readability and a vast ecosystem — widely used in data science, ML, web development, and automation.",
                "artificial intelligence": "Artificial Intelligence (AI) is the simulation of human intelligence in machines — enabling them to learn, reason, problem-solve, and understand language.",
            }
            q_lower_clean = q_lower.strip("?. ")
            for key, answer in general_answers.items():
                if key in q_lower_clean:
                    return answer

            return (
                f"I can answer your question about **\"{query}\"** — however, no documents are currently uploaded. "
                f"Please upload a PDF, DOCX, or TXT file and I'll search through it. "
                f"Alternatively, the LLM API (Groq) will answer general knowledge questions when the API key is properly configured."
            )

        return f"Based on the uploaded documents, no specific information was found regarding '{query}'."


answer_generator = AnswerGenerator()