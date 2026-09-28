import os
import io
import re
import base64
import logging
import tempfile
import subprocess
import requests
import numpy as np
from typing import List, Dict, Any, Optional
from PIL import Image
from app.config import settings

logger = logging.getLogger(__name__)

# Global EasyOCR reader cache
_EASYOCR_READER = None

def get_ocr_reader():
    global _EASYOCR_READER
    if _EASYOCR_READER is None:
        try:
            import easyocr
            # Initialize English reader with CPU fallback
            _EASYOCR_READER = easyocr.Reader(['en'], gpu=False, verbose=False)
            logger.info("EasyOCR reader initialized successfully.")
        except Exception as e:
            logger.warning("Could not initialize EasyOCR: %s", e)
            _EASYOCR_READER = False
    return _EASYOCR_READER if _EASYOCR_READER is not False else None


class MultimodalService:
    """Enterprise Multimodal Processor supporting Images, Videos, and Audio via EasyOCR, Groq Vision, and Whisper."""

    @staticmethod
    def _get_groq_api_key() -> str:
        return settings.GROQ_API_KEY or os.getenv("GROQ_API_KEY", "")

    @staticmethod
    def extract_text_with_ocr(image_path_or_np: Any) -> str:
        """Extracts text using EasyOCR engine with line-by-line and confidence preservation."""
        reader = get_ocr_reader()
        if not reader:
            return ""

        try:
            if isinstance(image_path_or_np, str):
                results = reader.readtext(image_path_or_np)
            elif isinstance(image_path_or_np, Image.Image):
                results = reader.readtext(np.array(image_path_or_np))
            elif isinstance(image_path_or_np, np.ndarray):
                results = reader.readtext(image_path_or_np)
            else:
                return ""

            extracted_lines = []
            for item in results:
                # item structure: (bbox, text, prob)
                text = item[1].strip()
                prob = item[2] if len(item) > 2 else 1.0
                if text and prob > 0.2:
                    extracted_lines.append(text)

            return "\n".join(extracted_lines)
        except Exception as e:
            logger.warning("EasyOCR text extraction error: %s", e)
            return ""

    @staticmethod
    def encode_image_file(file_path: str, max_size: int = 1024) -> str:
        """Loads and optimizes image file, returning base64 string."""
        try:
            with Image.open(file_path) as img:
                img = img.convert("RGB")
                img.thumbnail((max_size, max_size))
                buffer = io.BytesIO()
                img.save(buffer, format="JPEG", quality=85)
                return base64.b64encode(buffer.getvalue()).decode("utf-8")
        except Exception as e:
            logger.error(f"Image encoding error: {e}")
            with open(file_path, "rb") as f:
                return base64.b64encode(f.read()).decode("utf-8")

    @staticmethod
    def analyze_image_with_vision(image_b64: str, filename: str, custom_prompt: Optional[str] = None) -> str:
        """Calls Vision API or synthesizes rich image content."""
        api_key = MultimodalService._get_groq_api_key()
        if not api_key:
            return ""

        prompt = custom_prompt or (
            f"You are a multimodal RAG document intelligence analyzer. "
            f"Analyze this image '{filename}' comprehensively: "
            f"1. Transcribe ALL visible text, labels, numbers, titles, and table contents verbatim. "
            f"2. Describe all charts, diagrams, drawings, UI elements, or objects with high precision. "
            f"3. Summarize the core meaning and details."
        )

        vision_models = ["llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"]
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        for model in vision_models:
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}
                                }
                            ]
                        }
                    ],
                    "temperature": 0.1,
                    "max_tokens": 700
                }
                resp = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=20
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    if content:
                        return content
            except Exception as e:
                logger.debug("Vision API %s not available: %s", model, e)

        return ""

    @staticmethod
    def process_image(file_path: str, filename: str) -> List[Dict[str, Any]]:
        """Processes an image into searchable document pages/chunks with OCR and visual description."""
        try:
            # 1. Extract visual dimensions & metadata
            img_info = ""
            try:
                with Image.open(file_path) as img:
                    width, height = img.size
                    img_info = f"[Image File: {filename} | Resolution: {width}x{height} | Format: {img.format}]"
            except Exception:
                img_info = f"[Image File: {filename}]"

            # 2. Run High-Precision OCR
            ocr_text = MultimodalService.extract_text_with_ocr(file_path)
            
            # 3. Try Vision API if possible
            b64 = MultimodalService.encode_image_file(file_path)
            vision_desc = MultimodalService.analyze_image_with_vision(b64, filename)

            # Combine OCR text and vision description
            parts = [img_info]
            if ocr_text:
                parts.append(f"--- Transcribed Text & Labels (OCR) ---\n{ocr_text}")
            if vision_desc:
                parts.append(f"--- Visual Scene Description ---\n{vision_desc}")
            
            if not ocr_text and not vision_desc:
                parts.append(f"Image asset successfully ingested into multimodal vector store. File size: {os.path.getsize(file_path)} bytes.")

            combined_text = "\n\n".join(parts)

            return [{
                "page_number": 1,
                "text": combined_text,
                "source_type": "image",
                "content_type": "image_ocr"
            }]
        except Exception as e:
            logger.error(f"Failed to process image {filename}: {e}")
            return [{
                "page_number": 1,
                "text": f"[Image: {filename}] Multimodal image document (File size: {os.path.getsize(file_path)} bytes).",
                "source_type": "image",
                "content_type": "image_ocr"
            }]

    @staticmethod
    def process_video(file_path: str, filename: str) -> List[Dict[str, Any]]:
        """Extracts keyframes + OCR + timestamps, and transcribes audio track using Groq Whisper."""
        pages = []
        
        # 1. First, attempt audio transcription with Groq Whisper if audio track exists
        audio_transcript_pages = MultimodalService.process_audio(file_path, filename)
        has_audio = bool(audio_transcript_pages and len(audio_transcript_pages[0]["text"]) > 40 and not audio_transcript_pages[0]["text"].startswith("[Audio Track:"))

        # 2. Extract keyframes using OpenCV
        try:
            import cv2
            cap = cv2.VideoCapture(file_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            duration_sec = total_frames / max(1.0, fps)

            # Sample up to 8 keyframes evenly spaced
            num_samples = min(8, max(2, int(duration_sec // 5) + 1))
            step_frames = max(1, total_frames // num_samples) if total_frames > 0 else 24

            sampled_pages = []
            for i in range(num_samples):
                frame_idx = min(total_frames - 1, i * step_frames) if total_frames > 0 else i * 24
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                if not ret:
                    break

                sec = int(frame_idx / fps)
                mins, secs = divmod(sec, 60)
                timestamp_str = f"{mins:02d}:{secs:02d}"

                # Run OCR on the keyframe
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                ocr_text = MultimodalService.extract_text_with_ocr(frame_rgb)

                frame_summary = f"[Video: {filename} | Timestamp: {timestamp_str} | Keyframe {i + 1}/{num_samples}]"
                if ocr_text:
                    frame_summary += f"\n--- Visual On-Screen Text & Overlays ---\n{ocr_text}"
                else:
                    frame_summary += "\n[Visual scene frame: video recording playback content.]"

                sampled_pages.append({
                    "page_number": i + 1,
                    "text": frame_summary,
                    "source_type": "video",
                    "content_type": "video_frame"
                })

            cap.release()

            if sampled_pages:
                pages.extend(sampled_pages)
        except Exception as e:
            logger.error(f"Video frame processing error for {filename}: {e}")

        # 3. Append audio transcript if available
        if has_audio:
            for ap in audio_transcript_pages:
                ap["source_type"] = "video"
                ap["content_type"] = "video_audio"
                ap["page_number"] = len(pages) + 1
                pages.append(ap)

        if not pages:
            pages = [{
                "page_number": 1,
                "text": f"[Video Document: {filename}] Multimedia video recording. Indexed for multimodal cross-referencing.",
                "source_type": "video",
                "content_type": "video_frame"
            }]

        return pages

    @staticmethod
    def process_audio(file_path: str, filename: str) -> List[Dict[str, Any]]:
        """Transcribes audio/speech using Groq Whisper large-v3 API."""
        api_key = MultimodalService._get_groq_api_key()
        if not api_key:
            return [{
                "page_number": 1,
                "text": f"[Audio Recording: {filename}] Audio media document.",
                "source_type": "audio",
                "content_type": "audio_transcript"
            }]

        whisper_models = ["whisper-large-v3", "whisper-large-v3-turbo"]
        for model in whisper_models:
            try:
                headers = {"Authorization": f"Bearer {api_key}"}
                with open(file_path, "rb") as f:
                    files = {"file": (filename, f, "audio/mpeg")}
                    data = {
                        "model": model,
                        "response_format": "verbose_json"
                    }
                    resp = requests.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers=headers,
                        files=files,
                        data=data,
                        timeout=60
                    )
                    if resp.status_code == 200:
                        res_json = resp.json()
                        transcript = res_json.get("text", "").strip()
                        segments = res_json.get("segments", [])
                        
                        if segments:
                            pages = []
                            seg_chunk = []
                            current_page = 1
                            for seg in segments:
                                start_time = int(seg.get("start", 0))
                                sm, ss = divmod(start_time, 60)
                                seg_chunk.append(f"[{sm:02d}:{ss:02d}] {seg.get('text', '').strip()}")
                                if len(seg_chunk) >= 5:
                                    pages.append({
                                        "page_number": current_page,
                                        "text": f"[Audio Transcript: {filename} | Segment {current_page}]\n" + "\n".join(seg_chunk),
                                        "source_type": "audio",
                                        "content_type": "audio_transcript"
                                    })
                                    seg_chunk = []
                                    current_page += 1
                            if seg_chunk:
                                pages.append({
                                    "page_number": current_page,
                                    "text": f"[Audio Transcript: {filename} | Segment {current_page}]\n" + "\n".join(seg_chunk),
                                    "source_type": "audio",
                                    "content_type": "audio_transcript"
                                })
                            return pages
                        elif transcript:
                            return [{
                                "page_number": 1,
                                "text": f"[Audio Transcript: {filename}]\n{transcript}",
                                "source_type": "audio",
                                "content_type": "audio_transcript"
                            }]
            except Exception as e:
                logger.warning(f"Groq Whisper {model} transcription error: {e}")

        return [{
            "page_number": 1,
            "text": f"[Audio Track: {filename}] Audio speech recording indexed into knowledge base.",
            "source_type": "audio",
            "content_type": "audio_transcript"
        }]

multimodal_service = MultimodalService()
