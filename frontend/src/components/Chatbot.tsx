import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Paperclip, Bot, User, FileText, CheckCircle2,
  Trash2, Loader2, AlertCircle, Sparkles, ExternalLink, ShieldCheck, Copy, Check
} from 'lucide-react';
import { PipelineExecutionResponse, DocumentChunk, MetricWeights } from '../types';
import { api } from '../services/api';
import { CitationInspectorModal } from './CitationInspectorModal';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  result?: PipelineExecutionResponse;
  attachedFile?: string;
}

interface ChatbotProps {
  onDocumentUploaded?: () => void;
  documentCount: number;
  onResultUpdated?: (result: PipelineExecutionResponse) => void;
  metricWeights?: MetricWeights;
}

const PRESET_QUESTIONS = [
  "What is the education and CGPA of Sahithi Tarigoppula from the resume?",
  "Compare Self-RAG and Adaptive RAG in terms of latency and context filtering.",
  "What does the Agentic AI Roadmap document discuss?",
  "What are the limitations of Naive RAG?"
];

export const Chatbot: React.FC<ChatbotProps> = ({
  onDocumentUploaded,
  documentCount,
  onResultUpdated,
  metricWeights
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello! I am your Multimodal RAG Assistant.\n\nAsk any question or upload PDF/DOC/TXT files. For every question, I will retrieve verified knowledge to generate an accurate grounded answer with zero hallucination. The full architecture evaluation matrix and Final Judge decision will update live in the observatory panel.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'generating' | 'evaluating'>('generating');
  const [selectedInspectionChunk, setSelectedInspectionChunk] = useState<DocumentChunk | null>(null);
  const [currentInspectionQuery, setCurrentInspectionQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Attachment state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, loadingStage]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadNotice(`Uploading and vector-indexing '${file.name}'...`);
    setErrorNotice(null);

    try {
      const res = await api.uploadDocument(file);
      setUploadNotice(`Successfully indexed '${file.name}' (${res.chunks_created} chunks added)`);
      if (onDocumentUploaded) onDocumentUploaded();
    } catch (err: any) {
      setErrorNotice(err.message || 'File upload failed');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setIsLoading(true);
    setLoadingStage('generating');
    setErrorNotice(null);

    const evalTimer = setTimeout(() => {
      setLoadingStage('evaluating');
    }, 450);

    try {
      const res = await api.executeQuery(
        textToSend.trim(),
        ["Basic RAG", "Self-RAG", "Adaptive RAG", "Agentic RAG"],
        metricWeights
      );

      clearTimeout(evalTimer);

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        result: res
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (onResultUpdated) {
        onResultUpdated(res);
      }
    } catch (err: any) {
      clearTimeout(evalTimer);
      setErrorNotice(err.message || 'Failed to process query');
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `Error executing RAG pipeline: ${err.message || 'Service unavailable'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'assistant',
        text: 'Conversation cleared. Ready for your next question or document upload.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const inspectCitation = (chunk: DocumentChunk, query: string) => {
    setSelectedInspectionChunk(chunk);
    setCurrentInspectionQuery(query);
  };

  return (
    <div className="glass rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[780px] bg-white/95">
      {/* ── CHAT HEADER (PASTEL) ── */}
      <div className="p-4 border-b border-slate-200/80 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
            <Bot className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>RAG Assistant &amp; Evaluator</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                Multi-RAG Active
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-normal">
              {documentCount} documents indexed • Grounded Answers &amp; Zero Hallucination
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearChat}
          className="text-xs text-slate-500 hover:text-rose-600 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer"
          title="Clear Conversation"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear</span>
        </button>
      </div>

      {/* Upload notice banner */}
      {uploadNotice && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{uploadNotice}</span>
          </div>
          <button onClick={() => setUploadNotice(null)} className="text-emerald-700 hover:underline">Dismiss</button>
        </div>
      )}

      {errorNotice && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-rose-700 hover:underline">Dismiss</button>
        </div>
      )}

      {/* ── MESSAGES CONTAINER ── */}
      <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-slate-50/50">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const result = msg.result;

          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-indigo-600 shadow-2xs'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble Container */}
              <div className={`max-w-2xl space-y-2 ${isUser ? 'items-end text-right' : 'text-left'}`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-none text-left'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none whitespace-pre-line text-left shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">{msg.text}</div>
                    {!isUser && (
                      <button
                        onClick={() => copyMessage(msg.id, msg.text)}
                        className="text-slate-400 hover:text-slate-600 p-1 transition-colors cursor-pointer"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>

                  {/* Grounded Citation Badges */}
                  {result && result.sources && result.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center">
                        <FileText className="h-3 w-3 mr-1 text-indigo-500" /> Sources:
                      </span>
                      {result.sources.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => inspectCitation(s, result.query)}
                          className="text-[11px] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 px-2.5 py-0.8 rounded-lg font-medium flex items-center space-x-1 transition-all cursor-pointer shadow-2xs group"
                          title="Click to inspect exact passage snippet"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span>{s.filename}{s.page_number ? ` (p.${s.page_number})` : ''}</span>
                          <ExternalLink className="h-2.5 w-2.5 text-indigo-400 group-hover:text-indigo-700" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[10px] text-slate-400 font-mono block px-1">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start space-x-3 text-left">
            <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-700 space-y-1.5 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span className="font-bold text-slate-900">
                  {loadingStage === 'generating'
                    ? 'Executing 4 RAG architectures concurrently...'
                    : 'Evaluating 6 standardized metrics & selecting Final Judge winner...'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Running Basic RAG, Self-RAG, Adaptive RAG, and Agentic RAG in parallel.
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center space-x-2 overflow-x-auto text-left">
          <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">Suggested:</span>
          <div className="flex items-center space-x-1.5">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                className="text-[11px] bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-900 px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer shadow-2xs font-medium"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── INPUT BAR (PASTEL) ── */}
      <div className="p-3.5 border-t border-slate-200/80 bg-white">
        <div className="flex items-end space-x-2">
          {/* File Upload Attachment Button */}
          <label
            htmlFor="chat-file-upload-pastel"
            className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 cursor-pointer transition-colors flex items-center justify-center shadow-2xs"
            title="Upload PDF, DOCX, or TXT Document"
          >
            {uploadingFile ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
            <input
              id="chat-file-upload-pastel"
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.txt,.docx,.csv,.md"
              className="hidden"
              disabled={uploadingFile || isLoading}
            />
          </label>

          {/* Textarea Input */}
          <div className="flex-1 relative">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or upload a document with the paperclip... (Press Enter to send)"
              className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 rounded-xl p-3 text-sm border border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none transition-colors resize-none shadow-inner"
              disabled={isLoading}
            />
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white font-medium shadow-sm transition-all flex items-center justify-center cursor-pointer"
            title="Send Query"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Citation Inspector Modal */}
      <CitationInspectorModal
        chunk={selectedInspectionChunk}
        query={currentInspectionQuery}
        onClose={() => setSelectedInspectionChunk(null)}
      />
    </div>
  );
};
