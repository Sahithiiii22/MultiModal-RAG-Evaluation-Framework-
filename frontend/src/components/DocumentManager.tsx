import React, { useState } from 'react';
import { 
  Upload, FileText, Database, Trash2, CheckCircle2, AlertCircle, 
  PlusCircle, Edit3, Image as ImageIcon, Video, Music, FileCode 
} from 'lucide-react';
import { DocumentMetadata } from '../types';
import { api } from '../services/api';

interface DocumentManagerProps {
  documents: DocumentMetadata[];
  onRefresh: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ documents, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Raw text state
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(`Ingesting and indexing ${file.name} (Extracting text, OCR & multimodal features)...`);
    setError(null);

    try {
      const res = await api.uploadDocument(file);
      setUploadStatus(`Successfully indexed ${file.name} (${res.chunks_created} multimodal chunks generated)`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim()) {
      setError('Please provide text content');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Ingesting text into vector store...');
    setError(null);

    try {
      const title = textTitle.trim() || 'Pasted_Text_Note';
      const res = await api.uploadRawText(title, textContent);
      setUploadStatus(`Successfully indexed '${res.metadata.filename}' (${res.chunks_created} chunks generated)`);
      setTextTitle('');
      setTextContent('');
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest text');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await api.deleteDocument(docId);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
    }
  };

  const getFileBadge = (fileType: string) => {
    const ft = fileType.toLowerCase();
    if (ft === 'pdf') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          PDF
        </span>
      );
    }
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif'].includes(ft)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          IMAGE (OCR)
        </span>
      );
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ft)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          VIDEO (FRAMES+AUDIO)
        </span>
      );
    }
    if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ft)) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
          AUDIO (WHISPER)
        </span>
      );
    }
    if (ft === 'csv' || ft === 'tsv') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          CSV / TABLE
        </span>
      );
    }
    if (ft === 'docx' || ft === 'doc') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          DOCX
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
        {fileType.toUpperCase()}
      </span>
    );
  };

  const getFileIcon = (fileType: string) => {
    const ft = fileType.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'gif'].includes(ft)) {
      return <ImageIcon className="h-4 w-4 text-purple-600" />;
    }
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ft)) {
      return <Video className="h-4 w-4 text-amber-600" />;
    }
    if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ft)) {
      return <Music className="h-4 w-4 text-cyan-600" />;
    }
    if (ft === 'pdf') {
      return <FileText className="h-4 w-4 text-rose-600" />;
    }
    return <FileText className="h-4 w-4 text-indigo-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Upload Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {/* Toggle Mode */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-4 mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('upload'); setError(null); setUploadStatus(null); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'upload'
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Upload className="h-4 w-4" />
            <span>Upload Multimodal File (PDF, Images, Video, Audio, DOCX, CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('text'); setError(null); setUploadStatus(null); }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'text'
                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="h-4 w-4" />
            <span>Paste Raw Text Note</span>
          </button>
        </div>

        {activeTab === 'upload' ? (
          <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-2xl p-8 text-center transition-all">
            <div className="max-w-xl mx-auto space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-100 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Upload Multimodal Knowledge Assets</h3>
                <p className="text-xs text-slate-600 mt-1.5">
                  Supported formats: <strong>PDF</strong>, <strong>Images</strong> (PNG, JPG, WEBP), <strong>Video</strong> (MP4, MOV, AVI), <strong>Audio</strong> (MP3, WAV), <strong>DOCX</strong>, <strong>CSV</strong>, <strong>TXT</strong>
                </p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-2.5">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">📷 Visual OCR</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">🎬 Video Keyframe Sampling</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">🎙️ Speech Transcription</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium">📄 PDF Parsing</span>
                </div>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm cursor-pointer shadow-sm transition-all">
                  <span>Browse Multimodal File</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.txt,.docx,.csv,.md,.png,.jpg,.jpeg,.webp,.bmp,.tiff,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.m4a,.ogg,.flac"
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleTextSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={textTitle}
                onChange={(e) => setTextTitle(e.target.value)}
                placeholder="e.g. Project_Requirements.txt"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                disabled={isUploading}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Text Content
              </label>
              <textarea
                rows={5}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste or type text content to be indexed into the RAG vector store..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white resize-none"
                disabled={isUploading}
              />
            </div>

            <button
              type="submit"
              disabled={isUploading || !textContent.trim()}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{isUploading ? 'Indexing Text...' : 'Index Text to Knowledge Base'}</span>
            </button>
          </form>
        )}

        {uploadStatus && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <span>{uploadStatus}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Ingested Documents List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
            <Database className="h-5 w-5 text-indigo-500" />
            <span>Ingested Multimodal Knowledge Base ({documents.length})</span>
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            Total Chunks: {documents.reduce((acc, d) => acc + d.chunk_count, 0)}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No documents in knowledge base. Upload an image, video, PDF, or paste text to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.doc_id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-indigo-300 hover:shadow-xs transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      {getFileIcon(doc.file_type)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 truncate max-w-[180px]">
                        {doc.filename}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        {getFileBadge(doc.file_type)}
                        <span className="text-[11px] text-slate-500 font-medium">
                          {(doc.file_size_bytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(doc.doc_id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200 text-slate-500">
                  <div>Chunks: <span className="font-semibold text-slate-700">{doc.chunk_count}</span></div>
                  <div>Pages/Segments: <span className="font-semibold text-slate-700">{doc.page_count}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
