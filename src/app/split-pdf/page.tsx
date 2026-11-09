"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import { splitPDF, downloadFile } from "@/lib/pdf-utils";
import JSZip from "jszip";
import confetti from "canvas-confetti";
import { 
  Scissors, 
  FileText, 
  Download, 
  Archive, 
  Loader2, 
  Layers,
  Sparkles,
  ArrowRight
} from "@/components/Icons";

export default function SplitPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [splitMode, setSplitMode] = useState<"all" | "range">("all");
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedZip, setCompletedZip] = useState<Blob | null>(null);
  const [completedSingle, setCompletedSingle] = useState<{ name: string; bytes: Uint8Array } | null>(null);

  const handleFiles = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setCompletedZip(null);
      setCompletedSingle(null);
    }
  };

  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const ranges = splitMode === "range" ? [{ from: rangeStart, to: rangeEnd }] : undefined;
      const results = await splitPDF(file, splitMode, ranges);

      if (results.length === 1) {
        setCompletedSingle(results[0]);
        downloadFile(results[0].bytes, results[0].name);
      } else if (results.length > 1) {
        // Create ZIP file containing all split pages
        const zip = new JSZip();
        results.forEach((item) => {
          zip.file(item.name, item.bytes);
        });
        const zipBlob = await zip.generateAsync({ type: "blob" });
        setCompletedZip(zipBlob);
        downloadFile(zipBlob, `${file.name.replace(/\.[^/.]+$/, "")}_pages.zip`, "application/zip");
      }

      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error("Failed to split PDF:", err);
      alert("Failed to split PDF. Please check if the document is encrypted or corrupt.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-bold border border-amber-200">
          <Scissors className="w-3.5 h-3.5" />
          <span>Split PDF Pages</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Split PDF Document
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Extract separate pages or split an entire PDF into individual files instantly in your browser.
        </p>
      </div>

      {!file ? (
        <Dropzone
          title="Select PDF file"
          subtitle="or drop a PDF file here to split"
          buttonText="Select PDF file"
          multiple={false}
          onFilesSelected={handleFiles}
        />
      ) : (
        <div className="space-y-6">
          {/* File Selected Card */}
          <div className="p-4 bg-white rounded-3xl border border-slate-200 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setCompletedZip(null);
                setCompletedSingle(null);
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50"
            >
              Choose different file
            </button>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSplitMode("all")}
              className={`p-6 rounded-3xl border-2 text-left transition-all ${
                splitMode === "all"
                  ? "border-amber-500 bg-amber-50/50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black mb-3">
                <Archive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Extract All Pages</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Splits every page into its own individual PDF file and downloads them together in a .ZIP archive.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSplitMode("range")}
              className={`p-6 rounded-3xl border-2 text-left transition-all ${
                splitMode === "range"
                  ? "border-amber-500 bg-amber-50/50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Custom Range</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Extract only a specific section of pages (e.g. from page 1 to 5) into a new document.
              </p>
            </button>
          </div>

          {/* Range Inputs */}
          {splitMode === "range" && (
            <div className="p-6 bg-white rounded-3xl border border-slate-200 space-y-3 shadow-xs">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Specify Page Range:
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">From Page</span>
                  <input
                    type="number"
                    min="1"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(parseInt(e.target.value) || 1)}
                    className="w-20 p-2.5 rounded-xl border border-slate-300 font-bold text-sm text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <span className="text-slate-400 font-bold">to</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 font-medium">To Page</span>
                  <input
                    type="number"
                    min="1"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(parseInt(e.target.value) || 1)}
                    className="w-20 p-2.5 rounded-xl border border-slate-300 font-bold text-sm text-center focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            {completedZip ? (
              <button
                type="button"
                onClick={() =>
                  downloadFile(completedZip, `${file.name.replace(/\.[^/.]+$/, "")}_pages.zip`, "application/zip")
                }
                className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Split ZIP Archive
              </button>
            ) : completedSingle ? (
              <button
                type="button"
                onClick={() => downloadFile(completedSingle.bytes, completedSingle.name)}
                className="px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Extracted PDF
              </button>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleSplit}
                className="px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md shadow-amber-600/25 transition-all flex items-center gap-2 disabled:opacity-75"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Splitting Document...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Split PDF Now
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
