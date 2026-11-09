"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import { mergePDFs, downloadFile } from "@/lib/pdf-utils";
import confetti from "canvas-confetti";
import { 
  Layers, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Download, 
  Sparkles, 
  FileText, 
  Loader2 
} from "@/components/Icons";

export default function MergePdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [downloadBytes, setDownloadBytes] = useState<Uint8Array | null>(null);

  const handleFiles = (newFiles: File[]) => {
    const valid = newFiles.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    setFiles((prev) => [...prev, ...valid]);
    setIsCompleted(false);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setIsCompleted(false);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles((prev) => {
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const handleMerge = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    try {
      const mergedBytes = await mergePDFs(files);
      setDownloadBytes(mergedBytes);
      setIsCompleted(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
      // Trigger download immediately
      downloadFile(mergedBytes, "edftar_merged.pdf");
    } catch (err) {
      console.error("Failed to merge PDFs:", err);
      alert("Failed to merge PDFs. Please make sure files are not password-protected.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-brand-600 text-xs font-bold border border-rose-200">
          <Layers className="w-3.5 h-3.5" />
          <span>Merge PDF Documents</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Merge PDF Files Online
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Combine multiple PDFs into one unified document in your preferred sequence. 100% private.
        </p>
      </div>

      {/* Main Container */}
      {files.length === 0 ? (
        <Dropzone
          title="Select PDF files"
          subtitle="or drop PDF documents here to merge"
          buttonText="Select PDF files"
          onFilesSelected={handleFiles}
        />
      ) : (
        <div className="space-y-6">
          {/* File Queue List */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="font-bold text-slate-800 text-sm">
                Files to Merge ({files.length})
              </span>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition">
                <Plus className="w-3.5 h-3.5" />
                <span>Add More PDFs</span>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(Array.from(e.target.files));
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <div className="space-y-2.5">
              {files.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/70 rounded-2xl border border-slate-200/80 transition"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-6 text-center text-xs font-bold text-slate-400">
                      {idx + 1}.
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-brand-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-4">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveUp(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === files.length - 1}
                      onClick={() => moveDown(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Ready to combine {files.length} document{files.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-slate-400">
                Merged file will be saved as <span className="font-semibold text-slate-600">edftar_merged.pdf</span>
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isCompleted && downloadBytes ? (
                <button
                  type="button"
                  onClick={() => downloadFile(downloadBytes, "edftar_merged.pdf")}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Merged PDF
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleMerge}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Merging in Browser...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Merge PDFs Now
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
