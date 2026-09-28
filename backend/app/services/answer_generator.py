import logging
import requests
import re
from typing import Any, Dict, List, Union

from app.config import settings

logger = logging.getLogger(__name__)


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

        prompt = self._prompt(query, context)
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
            logger.error("[LLM] %s provider failed, falling back to grounded demo mode. Error: %s", provider, exc)
            return self._demo_answer(query, context)

        return self._demo_answer(query, context)

    def _prompt(self, query: str, context: List[Any]) -> str:
        evidence_parts = []
        for index, item in enumerate(context or [], start=1):
            filename = self._get_item_attr(item, 'filename', 'source')
            page_num = self._get_item_attr(item, 'page_number', 1)
            text = self._get_item_attr(item, 'text', '')
            if text and text.strip():
                evidence_parts.append(f"[{index}] Source: {filename} (Page {page_num}):\n{text}")

        evidence = "\n\n".join(evidence_parts)
        if evidence:
            return (
                "You are an accurate, strictly grounded AI assistant. Answer the user's question directly and concisely based on the verified evidence below.\n\n"
                "Grounding Rules:\n"
                "1. Answer strictly using the facts stated in the evidence.\n"
                "2. Include exact citations referencing the document and page when making claims (e.g. [Filename.pdf, p. 1]).\n"
                "3. If the user asks about a specific person, skill, qualification, project, or topic, extract the exact details from the matching document.\n"
                "4. Do NOT hallucinate or extrapolate beyond what is stated in the evidence.\n"
                "5. If the evidence does not contain sufficient details to answer, state clearly: 'The uploaded documents do not contain information regarding this topic.'\n\n"
                f"Question: {query}\n\n"
                f"Evidence:\n{evidence}"
            )
        else:
            return (
                "You are an accurate, factual AI assistant. Answer the following question clearly and concisely.\n"
                "Note: No external document was uploaded for this query. Provide standard, accurate factual knowledge.\n\n"
                f"Question: {query}"
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
            },
            timeout=settings.LLM_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()

    def _groq(self, prompt: str) -> str:
        """Groq inference with resilient fallback models and rate limit management."""
        models_to_try = [
            settings.LLM_MODEL or "openai/gpt-oss-120b",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b",
        ]
        seen = set()
        models = [m for m in models_to_try if not (m in seen or seen.add(m))]
        
        last_error = None
        for model in models:
            try:
                logger.info("[GROQ] Calling model: %s", model)
                response = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.1,
                        "max_tokens": 300,
                    },
                    timeout=settings.LLM_TIMEOUT,
                )
                if response.status_code == 200:
                    result = response.json()["choices"][0]["message"]["content"].strip()
                    logger.info("[GROQ] Success with %s, length: %d chars", model, len(result))
                    return result
                elif response.status_code == 429:
                    logger.warning("[GROQ] Model %s rate limited (429), trying next model...", model)
                    continue
                else:
                    error_body = response.text[:250]
                    logger.warning("[GROQ] Model %s HTTP %s: %s", model, response.status_code, error_body)
                    last_error = LLMUnavailableError(f"HTTP {response.status_code}: {error_body}")
            except Exception as e:
                logger.warning("[GROQ] Model %s error: %s", model, e)
                last_error = e

        if last_error:
            raise last_error
        raise LLMUnavailableError("Groq model generation failed.")

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
            "gemini-2.5-flash",
        ]
        seen_models = set()
        models = [m for m in models_to_try if not (m in seen_models or seen_models.add(m))]

        last_error = None
        for model in models:
            try:
                logger.info("[GEMINI] Trying model: %s", model)
                response = requests.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    params={"key": settings.API_KEY},
                    json={"contents": [{"parts": [{"text": prompt}]}]},
                    timeout=60,
                )
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            logger.info("[GEMINI] Success with model: %s", model)
                            return parts[0]["text"].strip()
                else:
                    error_body = response.text[:300]
                    logger.warning("[GEMINI] Model %s returned HTTP %s: %s", model, response.status_code, error_body)
                    last_error = LLMUnavailableError(f"HTTP {response.status_code}: {error_body}")
            except Exception as e:
                logger.warning("[GEMINI] Model %s raised exception: %s", model, e)
                last_error = e
                continue

        if last_error:
            raise last_error
        raise LLMUnavailableError("All Gemini model endpoints failed to generate response.")

    def _demo_answer(self, query: str, context: List[Any]) -> str:
        q_lower = query.lower().strip()
        query_terms = [
            term for term in re.findall(r"\w+", q_lower)
            if len(term) > 2 and term not in self.STOP_WORDS
        ]
        
        # 1. Check for specific attribute queries (e.g. CGPA, GPA, email, phone, contact)
        if "cgpa" in q_lower or "gpa" in q_lower:
            for item in (context or []):
                raw = self._get_item_attr(item, "text", "")
                filename = self._get_item_attr(item, "filename", "document")
                cgpa_match = re.search(r"(?:CGPA|GPA)\s*[:=-]?\s*([0-9]+(?:\.[0-9]+)?)", raw, re.IGNORECASE)
                if cgpa_match:
                    cgpa_val = cgpa_match.group(1)
                    edu_match = re.search(r"([^.\n]*?(?:B\.Tech|BTech|Degree|College|Institute|University|School)[^.\n]*?CGPA\s*[:=-]?\s*[0-9.]+[^.\n]*)", raw, re.IGNORECASE)
                    if edu_match:
                        detail = edu_match.group(1).strip()
                        return f"According to **{filename}**, the CGPA is **{cgpa_val}** ({detail})."
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
                phone_match = re.search(r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", raw)
                if phone_match:
                    return f"The contact number found in **{filename}** is **{phone_match.group(0)}**."

        # 2. Precision-weighted sentence & paragraph extraction from retrieved context
        candidate_snippets = []
        if context:
            for item in context:
                raw_text = self._get_item_attr(item, "text", "")
                doc_name = self._get_item_attr(item, "filename", "document")
                page_num = self._get_item_attr(item, "page_number", 1)
                
                if not raw_text or not raw_text.strip():
                    continue

                cleaned_text = re.sub(r'[#*_`]', ' ', raw_text)
                
                # Split text into sentences and meaningful bullet points
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
                            "page": page_num
                        })

        if candidate_snippets:
            candidate_snippets.sort(key=lambda x: (x["score"], x["matches"]), reverse=True)
            best_snippet = candidate_snippets[0]
            top_doc = best_snippet["doc"]
            top_page = best_snippet["page"]
            
            # Filter top matching snippets from the highest-ranked document
            filtered = [c["text"] for c in candidate_snippets if c["doc"] == top_doc and c["score"] >= best_snippet["score"] * 0.6]
            unique_sentences = []
            for s in filtered:
                if s not in unique_sentences:
                    unique_sentences.append(s)
                    
            body = " ".join(unique_sentences[:4]).strip()
            if not body.endswith(('.', '!', '?')):
                body += "."
            return f"According to **{top_doc}** (Page {top_page}):\n\n{body}"

        # 3. Knowledge base fallback for concepts
        if "machine learning" in q_lower:
            return "Machine Learning (ML) is a branch of Artificial Intelligence where algorithms learn patterns from data to make predictions or decisions."
        if "self-rag" in q_lower or "self rag" in q_lower:
            return "Self-RAG dynamically critiques retrieved passages and generated answers using reflection tokens to eliminate hallucinations."
        if "adaptive rag" in q_lower or "adaptive" in q_lower:
            return "Adaptive RAG dynamically routes queries to the optimal retrieval strategy based on complexity and classification."
        if "agentic rag" in q_lower or "agentic" in q_lower:
            return "Agentic RAG uses autonomous agent loops and multi-step tool searches to plan and answer multi-hop reasoning questions."

        # 4. Clear fallback
        return f"Based on the uploaded documents, no specific information was found regarding '{query}'."


answer_generator = AnswerGenerator()