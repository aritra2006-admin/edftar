"use client";

import { useState, useEffect } from "react";
import Dropzone from "@/components/Dropzone";
import { rotatePDF, downloadFile, renderPageThumbnail } from "@/lib/pdf-utils";
import confetti from "canvas-confetti";
import { 
  RotateCw, 
  FileText, 
  Download, 
  Sparkles, 
  Loader2, 
  RotateCcw,
  Check
} from "@/components/Icons";
import { PDFDocument } from "pdf-lib";

interface PageItem {
  pageNumber: number;
  rotation: number; // in degrees: 0, 90, 180, 270
  thumbnail: string;
}

export default function RotatePdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rotatedBytes, setRotatedBytes] = useState<Uint8Array | null>(null);

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const selected = files[0];
    setFile(selected);
    setRotatedBytes(null);
    setIsLoadingPages(true);

    try {
      const buffer = await selected.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      const count = doc.getPageCount();

      const loadedPages: PageItem[] = [];
      for (let i = 1; i <= count; i++) {
        let thumb = "";
        try {
          thumb = await renderPageThumbnail(buffer, i, 0.4);
        } catch {
          // Fallback if canvas rendering fails
          thumb = "";
        }
        loadedPages.push({
          pageNumber: i,
          rotation: 0,
          thumbnail: thumb,
        });
      }
      setPages(loadedPages);
    } catch (err) {
      console.error("Failed to load PDF pages:", err);
      alert("Could not load PDF. Please make sure it is not encrypted.");
    } finally {
      setIsLoadingPages(false);
    }
  };

  const rotatePage = (index: number, degreesToAdd: number) => {
    setPages((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        rotation: (copy[index].rotation + degreesToAdd + 360) % 360,
      };
      return copy;
    });
  };

  const rotateAll = (degreesToAdd: number) => {
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        rotation: (p.rotation + degreesToAdd + 360) % 360,
      }))
    );
  };

  const handleApplyRotations = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const rotationMap: Record<number, number> = {};
      pages.forEach((p, idx) => {
        if (p.rotation !== 0) {
          rotationMap[idx] = p.rotation;
        }
      });

      const resultBytes = await rotatePDF(file, rotationMap);
      setRotatedBytes(resultBytes);
      downloadFile(resultBytes, `edftar_rotated_${file.name}`);
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error("Failed to rotate PDF:", err);
      alert("Failed to rotate document.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-200">
          <RotateCw className="w-3.5 h-3.5" />
          <span>Rotate PDF Pages</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Rotate PDF Documents
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Rotate individual pages or the entire document 90°, 180°, or 270° clockwise with real-time preview.
        </p>
      </div>

      {!file ? (
        <Dropzone
          title="Select PDF file"
          subtitle="or drop a PDF file here to rotate"
          buttonText="Select PDF file"
          multiple={false}
          onFilesSelected={handleFiles}
        />
      ) : (
        <div className="space-y-6">
          {/* Top Controls Bar */}
          <div className="p-4 sm:p-6 bg-white rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {pages.length} Pages • {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => rotateAll(90)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Rotate All 90° ↻</span>
              </button>
              <button
                type="button"
                onClick={() => rotateAll(-90)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rotate All 90° ↺</span>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoadingPages ? (
            <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Rendering page thumbnails...</p>
            </div>
          ) : (
            /* Page Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
              {pages.map((p, idx) => (
                <div
                  key={p.pageNumber}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col items-center gap-3"
                >
                  <div className="w-full aspect-[3/4] bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2 relative">
                    {p.thumbnail ? (
                      <img
                        src={p.thumbnail}
                        alt={`Page ${p.pageNumber}`}
                        className="max-h-full max-w-full object-contain transition-transform duration-300"
                        style={{ transform: `rotate(${p.rotation}deg)` }}
                      />
                    ) : (
                      <div
                        className="w-full h-full bg-white rounded border border-slate-300 p-2 flex flex-col justify-between transition-transform duration-300"
                        style={{ transform: `rotate(${p.rotation}deg)` }}
                      >
                        <div className="h-2 w-8 bg-slate-300 rounded"></div>
                        <div className="space-y-1">
                          <div className="h-1 w-full bg-slate-200 rounded"></div>
                          <div className="h-1 w-3/4 bg-slate-200 rounded"></div>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold text-center">
                          P.{p.pageNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="w-full flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">Page {p.pageNumber}</span>
                    <button
                      type="button"
                      onClick={() => rotatePage(idx, 90)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 font-bold transition"
                      title="Rotate 90 degrees clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
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
                Ready to save your rotated document
              </p>
              <p className="text-xs text-slate-400">
                All changes are executed in memory with zero quality loss.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {rotatedBytes ? (
                <button
                  type="button"
                  onClick={() => downloadFile(rotatedBytes, `edftar_rotated_${file.name}`)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Rotated PDF
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing || isLoadingPages}
                  onClick={handleApplyRotations}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Applying Rotations...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Save & Download Rotated PDF
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
