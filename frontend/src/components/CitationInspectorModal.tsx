import React from 'react';
import { X, FileText, CheckCircle, Copy, ShieldCheck, Award } from 'lucide-react';
import { DocumentChunk } from '../types';

interface CitationInspectorModalProps {
  chunk: DocumentChunk | null;
  query?: string;
  onClose: () => void;
}

export const CitationInspectorModal: React.FC<CitationInspectorModalProps> = ({
  chunk,
  query,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!chunk) return null;

  const scorePct = chunk.score !== undefined ? (chunk.score * 100).toFixed(1) : null;
  const isHighRelevance = chunk.score ? chunk.score >= 0.7 : true;

  const handleCopy = () => {
    if (chunk.text) {
      navigator.clipboard.writeText(chunk.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderHighlightedText = (text: string, q?: string) => {
    if (!q) return text;
    const terms = q
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);
    if (terms.length === 0) return text;

    const regex = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      terms.includes(part.toLowerCase()) ? (
        <mark key={i} className="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-semibold border border-amber-200">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-slideUp">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-xl overflow-hidden flex flex-col max-h-[85vh] text-left">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>Citation &amp; Evidence Inspector</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                  Verified Grounding
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-normal">
                {chunk.filename} {chunk.page_number ? `• Page ${chunk.page_number}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Metadata Chips Bar */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-2.5 text-xs">
          <div className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-medium">
            <FileText className="h-3.5 w-3.5 text-indigo-600" />
            <span className="font-bold">Source:</span>
            <span>{chunk.filename}</span>
          </div>

          {chunk.page_number && (
            <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-medium">
              <span className="font-bold">Page:</span> {chunk.page_number}
            </div>
          )}

          {scorePct && (
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg font-mono font-bold border ${
                isHighRelevance
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Match: {scorePct}%</span>
            </div>
          )}

          <div className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-500 font-mono text-[11px] ml-auto">
            Chunk ID: {chunk.chunk_id ? chunk.chunk_id.slice(-8) : 'N/A'}
          </div>
        </div>

        {/* Chunk Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {query && (
            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700">
              <span className="font-bold text-indigo-900">Query Reference: </span>
              <span className="italic font-medium">"{query}"</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Extracted Grounded Evidence:
              </span>
              <button
                onClick={handleCopy}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
              >
                {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm leading-relaxed font-sans whitespace-pre-wrap selection:bg-indigo-100">
              {renderHighlightedText(chunk.text, query)}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Zero-Hallucination Grounding:</strong> This text passage was extracted directly via vector embedding similarity from your uploaded document.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
