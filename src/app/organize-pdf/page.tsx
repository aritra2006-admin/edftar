"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import { organizePDF, downloadFile, renderPageThumbnail } from "@/lib/pdf-utils";
import confetti from "canvas-confetti";
import { 
  Grid, 
  FileText, 
  Download, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Sparkles, 
  Loader2 
} from "@/components/Icons";
import { PDFDocument } from "pdf-lib";

interface OrganizedPage {
  originalIndex: number; // 0-based
  displayPageNumber: number;
  rotation: number;
  thumbnail: string;
}

export default function OrganizePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<OrganizedPage[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultBytes, setResultBytes] = useState<Uint8Array | null>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setResultBytes(null);
    setIsLoadingPages(true);

    try {
      const buffer = await selected.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      const count = doc.getPageCount();

      const loaded: OrganizedPage[] = [];
      for (let i = 0; i < count; i++) {
        let thumb = "";
        try {
          thumb = await renderPageThumbnail(buffer, i + 1, 0.35);
        } catch {
          thumb = "";
        }
        loaded.push({
          originalIndex: i,
          displayPageNumber: i + 1,
          rotation: 0,
          thumbnail: thumb,
        });
      }
      setPages(loaded);
    } catch (err) {
      console.error("Failed to load PDF for organizing:", err);
      alert("Could not load PDF. Please make sure the file is valid and unencrypted.");
    } finally {
      setIsLoadingPages(false);
    }
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    setPages((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveRight = (index: number) => {
    if (index === pages.length - 1) return;
    setPages((prev) => {
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const rotatePage = (index: number) => {
    setPages((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        rotation: (copy[index].rotation + 90) % 360,
      };
      return copy;
    });
  };

  const deletePage = (index: number) => {
    if (pages.length <= 1) {
      alert("A PDF must retain at least one page.");
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveOrganized = async () => {
    if (!file || pages.length === 0) return;
    setIsProcessing(true);
    try {
      const outputBytes = await organizePDF(
        file,
        pages.map((p) => ({
          originalIndex: p.originalIndex,
          rotation: p.rotation,
        }))
      );
      setResultBytes(outputBytes);
      downloadFile(outputBytes, `edftar_organized_${file.name}`);
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error("Failed to organize PDF:", err);
      alert("Failed to organize document.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold border border-purple-200">
          <Grid className="w-3.5 h-3.5" />
          <span>Organize & Reorder PDF</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Organize PDF Pages
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Sort, rearrange page orders, rotate, or delete unwanted pages in a visual interactive grid.
        </p>
      </div>

      {!file ? (
        <Dropzone
          title="Select PDF file"
          subtitle="or drop a PDF file here to organize"
          buttonText="Select PDF file"
          multiple={false}
          onFilesSelected={handleFiles}
        />
      ) : (
        <div className="space-y-6">
          {/* File Bar */}
          <div className="p-4 sm:p-6 bg-white rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {pages.length} Pages remaining • {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setFile(null);
                setPages([]);
                setResultBytes(null);
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50"
            >
              Choose different file
            </button>
          </div>

          {/* Grid Area */}
          {isLoadingPages ? (
            <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Loading page thumbnails...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {pages.map((p, idx) => (
                <div
                  key={`${p.originalIndex}-${idx}`}
                  className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col items-center gap-3 relative group"
                >
                  <div className="w-full aspect-[3/4] bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2 relative">
                    {p.thumbnail ? (
                      <img
                        src={p.thumbnail}
                        alt={`Page ${p.displayPageNumber}`}
                        className="max-h-full max-w-full object-contain transition-transform duration-300"
                        style={{ transform: `rotate(${p.rotation}deg)` }}
                      />
                    ) : (
                      <div
                        className="w-full h-full bg-white rounded border border-slate-300 p-2 flex flex-col justify-between transition-transform duration-300"
                        style={{ transform: `rotate(${p.rotation}deg)` }}
                      >
                        <div className="h-2 w-8 bg-slate-300 rounded"></div>
                        <span className="text-[10px] text-slate-400 font-bold text-center">
                          P.{p.displayPageNumber}
                        </span>
                      </div>
                    )}

                    <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Page Controls */}
                  <div className="w-full flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveLeft(idx)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                      title="Move left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(idx)}
                      className="p-1 rounded text-slate-400 hover:text-purple-600 hover:bg-purple-50"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === pages.length - 1}
                      onClick={() => moveRight(idx)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                      title="Move right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePage(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 ml-1"
                      title="Delete page"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Bar */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Ready to export {pages.length} pages in new order
              </p>
              <p className="text-xs text-slate-400">
                Exported file: <span className="font-semibold text-slate-600">edftar_organized_{file.name}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {resultBytes ? (
                <button
                  type="button"
                  onClick={() => downloadFile(resultBytes, `edftar_organized_${file.name}`)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Organized PDF
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing || isLoadingPages}
                  onClick={handleSaveOrganized}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving PDF...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Save Organized PDF
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
