import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, color_hex):
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def create_styled_table(doc, headers, data, col_widths=None):
    table = doc.add_table(rows=len(data) + 1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    # Format Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "4F46E5") # Indigo primary
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.bold = True
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(255, 255, 255)
            run.font.name = "Arial"
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=150, right=150)

    # Format Data Rows
    for row_idx, row_data in enumerate(data):
        row_cells = table.rows[row_idx + 1].cells
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, cell_value in enumerate(row_data):
            row_cells[col_idx].text = str(cell_value)
            set_cell_background(row_cells[col_idx], bg_color)
            p = row_cells[col_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            for run in p.runs:
                run.font.size = Pt(9.5)
                run.font.color.rgb = RGBColor(30, 41, 59)
                run.font.name = "Arial"
            set_cell_margins(row_cells[col_idx], top=100, bottom=100, left=150, right=150)

    # Set Column Widths if provided
    if col_widths:
        for row in table.rows:
            for i, w in enumerate(col_widths):
                row.cells[i].width = Inches(w)

    doc.add_paragraph() # Spacing after table
    return table

def add_callout_box(doc, title, text_body, bg_color="EEF2FF", border_color="6366F1"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, bg_color)
    set_cell_margins(cell, top=140, bottom=140, left=180, right=180)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(4)
    run_t = p.add_run(f"📌 {title}\n")
    run_t.font.bold = True
    run_t.font.size = Pt(10.5)
    run_t.font.color.rgb = RGBColor(79, 70, 229)
    run_t.font.name = "Arial"
    
    run_b = p.add_run(text_body)
    run_b.font.size = Pt(9.5)
    run_b.font.color.rgb = RGBColor(51, 65, 85)
    run_b.font.name = "Arial"
    
    doc.add_paragraph()

def build_word_document(output_path):
    doc = docx.Document()

    # Set Margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # ── DOCUMENT HEADER / TITLE ──
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_after = Pt(4)
    title_run = title_p.add_run("Unified Multimodal RAG Evaluation &\nQuery-Adaptive Selection Framework")
    title_run.font.bold = True
    title_run.font.size = Pt(22)
    title_run.font.color.rgb = RGBColor(30, 41, 59)
    title_run.font.name = "Arial"

    subtitle_p = doc.add_paragraph()
    subtitle_p.paragraph_format.space_after = Pt(16)
    sub_run = subtitle_p.add_run("Comprehensive Technical Documentation, System Architecture, and Implementation Reference")
    sub_run.font.size = Pt(11)
    sub_run.font.color.rgb = RGBColor(100, 116, 139)
    sub_run.font.name = "Arial"

    # Meta banner
    add_callout_box(
        doc,
        "Core Research Question",
        "\"Given a specific user query and multimodal context, which RAG architecture provides the best answer, and why?\"\n"
        "This framework executes queries simultaneously across 4 distinct RAG pipelines, calculates mathematical quality & latency metrics, and uses a dedicated Final Judge LLM to provide optimal recommendations and trade-off rationales.",
        bg_color="F0FDF4",
        border_color="10B981"
    )

    # ── SECTION 1: EXECUTIVE SUMMARY ──
    h1 = doc.add_heading("1. Executive Summary & Problem Formulation", level=1)
    for r in h1.runs:
        r.font.color.rgb = RGBColor(30, 41, 59)
        r.font.name = "Arial"

    doc.add_paragraph(
        "In modern generative AI applications, Retrieval-Augmented Generation (RAG) is the primary technique used to ground Large Language Models (LLMs) on private enterprise data. However, real-world user queries exhibit wide variance in complexity, requiring different retrieval paradigms:\n"
        "• Simple Factoid Queries: Optimal with lightweight, fast, single-pass vector lookup.\n"
        "• Noisy Context Queries: Require self-reflection and context relevance filtering to prevent hallucinations.\n"
        "• Complex / Multi-Topic Queries: Require query classification, dynamic search depth (Top-K tuning), and reformulation.\n"
        "• Deep Multi-Hop Questions: Require autonomous agents that decompose questions into sub-searches and synthesize multi-source evidence."
    )
    doc.add_paragraph(
        "Rather than forcing a single architecture onto all questions, this framework implements all 4 major RAG architectures in parallel, computes standardized metrics, and automatically routes and explains the best approach for every query."
    )

    # ── SECTION 2: SYSTEM ARCHITECTURE ──
    h2 = doc.add_heading("2. System Architecture & Component Breakdown", level=1)
    for r in h2.runs:
        r.font.color.rgb = RGBColor(30, 41, 59)
        r.font.name = "Arial"

    doc.add_paragraph(
        "The system is organized into modular layers connected via asynchronous FastAPI REST endpoints and a modern React + TypeScript frontend:"
    )

    headers_arch = ["Layer", "Module", "Technologies", "Key Responsibility"]
    data_arch = [
        ["1. User Interface", "Frontend Web App", "React 18, TypeScript, Vite, Tailwind CSS", "Pastel UI, Login authentication, Query input with file attachment, Dedicated Metrics & Observatory page, Knowledge base manager."],
        ["2. Ingestion Engine", "Document Ingestion", "pypdf, python-docx, pandas, Vision OCR", "Parses PDF, Word (.docx), TXT, CSV, Images, Audio/Video transcripts, token-aware sliding window chunking."],
        ["3. Vector Storage", "Hybrid Vector Store", "In-Memory, Cosine Similarity, BM25 Boost", "Generates dense embeddings via all-MiniLM-L6-v2, indexes chunks with full source/page metadata, supports single-click deletion."],
        ["4. Multi-RAG Core", "4 RAG Pipelines", "Basic RAG, Self-RAG, Adaptive RAG, Agentic RAG", "Executes 4 pipelines concurrently with distinct retrieval strategies, reflection loops, and agent sub-searches."],
        ["5. Evaluation Layer", "Metrics Engine", "Mathematical Evaluation Functions", "Computes Context Relevance, Context Precision, Context Recall, Answer Relevance, Faithfulness, Correctness, and Latency."],
        ["6. Decision Engine", "Final Judge LLM", "Groq LPU API (openai/gpt-oss-120b)", "Evaluates query complexity, grounding, and latency trade-offs to select recommended architecture with confidence score %."],
        ["7. LLM Provider", "High-Speed Inference", "Groq Cloud API with Auto-Failover", "Ultra-fast inference powered by active Groq models (openai/gpt-oss-120b, qwen/qwen3.8-27b) with zero downtime."]
    ]
    create_styled_table(doc, headers_arch, data_arch, col_widths=[1.2, 1.3, 1.6, 2.4])

    # ── SECTION 3: MULTIMODAL KNOWLEDGE BASE ──
    h3 = doc.add_heading("3. Multimodal Knowledge Base & Document Management", level=1)
    for r in h3.runs:
        r.font.color.rgb = RGBColor(30, 41, 59)
        r.font.name = "Arial"

    doc.add_paragraph(
        "The knowledge base is designed for rich multimodal ingestion, accurate text extraction, and full document lifecycle control:"
    )
    doc.add_paragraph(
        "• PDF Ingestion: Utilizes pypdf with whitespace cleaning and page-by-page mapping, ensuring extracted text is correctly tagged with the source page number.\n"
        "• Word Documents (.docx): Extracts paragraph structures and table grids using python-docx.\n"
        "• Plain Text & Spreadsheets: Ingests TXT, Markdown, CSV, and TSV with row serialization.\n"
        "• Vision & OCR: Extracts textual descriptions and OCR transcripts from image files (PNG, JPG, WebP).\n"
        "• Sliding-Window Chunking: Chunks text into 400-token windows with an 80-token overlap, preserving doc_id, filename, page_number, chunk_id, and content_type.\n"
        "• Single-Click Document Deletion: Users can view all ingested documents in the Knowledge Base tab and delete any document individually, instantly purging its chunks from the vector index."
    )

    # ── SECTION 4: THE 4 RAG ARCHITECTURES ──
    h4 = doc.add_heading("4. The 4 RAG Architecture Implementations", level=1)
    for r in h4.runs:
        r.font.color.rgb = RGBColor(30, 41, 59)
        r.font.name = "Arial"

    headers_rag = ["Architecture", "Core Mechanism", "Key Strengths", "Ideal Scenario"]
    data_rag = [
        [
            "1. Basic / Naive RAG",
            "Single-pass top-k vector retrieval directly feeding retrieved passages into the LLM prompt.",
            "Ultra-low latency, low token usage, simple execution.",
            "Straightforward factual queries from clean, high-signal documents."
        ],
        [
            "2. Self-RAG",
            "Three-stage self-reflection:\n1. IS_RETRIEVAL_REQUIRED check\n2. IS_CONTEXT_RELEVANT filtering\n3. IS_FAITHFUL verification loop.",
            "Eliminates hallucinations, guarantees verified context grounding.",
            "High-stakes documents (legal, medical, financial) where hallucination tolerance is zero."
        ],
        [
            "3. Adaptive RAG",
            "Lightweight query classification engine categorizes query intent & complexity, dynamically adjusting Top-K depth and query reformulations.",
            "Dynamic resource allocation, high context recall, balanced latency.",
            "Multi-aspect, ambiguous, or comparative queries."
        ],
        [
            "4. Agentic RAG",
            "Autonomous multi-step loop: Decomposes question into sub-queries, iteratively calls vector retrieval tools, and synthesizes evidence.",
            "Deep multi-hop reasoning across multiple documents and disjoint sections.",
            "Complex research questions requiring synthesis of disparate facts."
        ]
    ]
    create_styled_table(doc, headers_rag, data_rag, col_widths=[1.3, 2.2, 1.5, 1.5])

    # ── SECTION 5: EVALUATION & FINAL JUDGE ──
    h5 = doc.add_heading("5. Evaluation Layer & Final Judge Decision Engine", level=1)
    for r in h5.runs:
        r.font.color.rgb = RGBColor(30, 41, 59)
        r.font.name = "Arial"

    doc.add_paragraph(
        "For every query execution across all 4 pipelines, the evaluation engine calculates standardized quantitative metrics:"
    )

    headers_metrics = ["Metric Category", "Specific Metric", "Definition & Measurement"]
    data_metrics = [
        ["Retrieval Metrics", "Context Relevance", "Proportion of retrieved chunks that contain semantically relevant information to the user query."],
        ["Retrieval Metrics", "Context Precision", "Signal-to-noise ratio in retrieved context, penalizing irrelevant chunks ranked at top positions."],
        ["Retrieval Metrics", "Context Recall", "Measures whether all factual claims needed to answer the question are present in the retrieved passages."],
        ["Generation Metrics", "Answer Relevance", "Semantic alignment between the LLM-generated response and the user's original query."],
        ["Generation Metrics", "Faithfulness", "Mathematical ratio of claims in the generated answer that are directly supported by cited evidence."],
        ["Generation Metrics", "Correctness", "Accuracy and completeness of the answer evaluated against reference grounding."],
        ["System Performance", "Retrieval vs Generation Latency", "Separately tracks vector retrieval time and LLM generation time in seconds."],
        ["System Performance", "Token Usage & LLM Calls", "Tracks prompt tokens, completion tokens, and total LLM API calls per pipeline."]
    ]
    create_styled_table(doc, headers_metrics, data_metrics, col_widths=[1.5, 1.8, 3.2])

    doc.add_paragraph(
        "Overall Quality Score Equation:\n"
        "Score = (0.25 × Faithfulness) + (0.20 × Answer Relevance) + (0.20 × Context Relevance) + (0.15 × Precision) + (0.10 × Recall) + (0.10 × Efficiency)"
    )

    add_callout_box(
        doc,
        "Final Judge Recommendation Engine",
        "The Final Judge LLM synthesizes all quantitative scores, evaluates query complexity, and outputs:\n"
        "1. Recommended Architecture (e.g., Adaptive RAG, Self-RAG)\n"
        "2. Confidence Score % (e.g., 86%)\n"
        "3. Analytical Trade-Off Explanation (explaining why the winner was chosen over other architectures based on verified grounding and latency).",
        bg_color="EEF2FF",
        border_color="6366F1"
    )

    # ── SECTION 6: USER INTERFACE ──
    h6 = doc.add_heading("6. Frontend User Interface & Experience", level=1)
    for r in h6.runs:
        r.font.color.rgb = RGBColor(30, 41, 59)
        r.font.name = "Arial"

    doc.add_paragraph(
        "The user interface is built with a modern light pastel theme (#f4f6fb background, soft indigo/violet/emerald accents, rounded cards, and zero visual clutter):\n"
        "• 🔐 Sign-In Gate: Clean authentication screen displayed before accessing workspace features.\n"
        "• 💬 Query & Answers Workspace: Integrated input bar supporting text queries and direct file attachments (PDF, DOCX, TXT, CSV, Images) with real-time progress indicators.\n"
        "• 📄 Grounded Answer Delivery: Displays the synthesized answer first, clickable citation chips (filename, exact page number, similarity score), and tabs to inspect all 4 RAG outputs.\n"
        "• 🏆 Recommendation Panel: Highlights the optimal RAG pipeline, confidence percentage, and detailed trade-off reasoning.\n"
        "• 📊 Dedicated Metrics & Insights Page: Multi-axis Radar Chart, Latency Breakdown Bar Chart (Retrieval vs Generation), complete metric comparison table, and export to CSV/Markdown.\n"
        "• 🗂️ Knowledge Base Manager: Table of indexed documents with metadata and individual single-click deletion.\n"
        "• 🏆 Suite Benchmarking & History: Automated test suites calculating empirical win rates and persistent query logs."
    )

    # ── SECTION 7: GROQ HIGH-SPEED API ──
    h7 = doc.add_heading("7. High-Speed LLM Inference (Groq Integration)", level=1)
    for r in h7.runs:
        r.font.color.rgb = RGBColor(30, 41, 59)
        r.font.name = "Arial"

    doc.add_paragraph(
        "The LLM backend is powered by Groq's LPU hardware for ultra-low latency generation:\n"
        "• Primary Active Model: openai/gpt-oss-120b and qwen/qwen3.8-27b.\n"
        "• Automated Multi-Model Failover: If a model experiences rate limits or downtime, the client automatically fails over across available active models (openai/gpt-oss-20b, allam-2-7b), guaranteeing 100% reliable generation."
    )

    # ── SECTION 8: HOW TO RUN ──
    h8 = doc.add_heading("8. How to Run the Application", level=1)
    for r in h8.runs:
        r.font.color.rgb = RGBColor(30, 41, 59)
        r.font.name = "Arial"

    doc.add_paragraph(
        "To start the application locally:\n\n"
        "1. Start Backend API Server:\n"
        "   cd backend\n"
        "   uvicorn app.main:app --reload --port 8000\n\n"
        "2. Start Frontend Dev Server (in separate terminal):\n"
        "   cd frontend\n"
        "   npm run dev\n\n"
        "3. Open in Browser:\n"
        "   Navigate to http://localhost:3000 to sign in and begin evaluating RAG pipelines."
    )

    # Save document
    doc.save(output_path)
    print(f"Document successfully created at: {output_path}")

if __name__ == "__main__":
    out_file = os.path.abspath("Multimodal_RAG_Framework_Complete_Documentation.docx")
    build_word_document(out_file)
