"use client";

import { useState, useCallback } from "react";
import { Archive, Download, Loader2, Check, UploadCloud, X, Trash2 } from "@/components/Icons";

type CompressionLevel = "low" | "medium" | "high";

export default function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "compressing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [result, setResult] = useState<{ blob: Blob; originalSize: number; compressedSize: number } | null>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Please upload a PDF file.");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setErrorMsg("");
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const compress = async () => {
    if (!file) return;
    setStatus("compressing");
    setErrorMsg("");
    setResult(null);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      const { PDFDocument } = await import("pdf-lib");

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      // Quality settings based on compression level
      const settings = {
        low: { scale: 1.5, quality: 0.85 },
        medium: { scale: 1.2, quality: 0.65 },
        high: { scale: 0.9, quality: 0.45 },
      };
      const { scale, quality } = settings[level];

      const newPdf = await PDFDocument.create();

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        // Render page to canvas
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Convert canvas to JPEG blob
        const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
        const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(",")[1]), (c) => c.charCodeAt(0));

        // Embed in new PDF
        const img = await newPdf.embedJpg(jpegBytes as unknown as ArrayBuffer);

        // Use original page dimensions (in points)
        const origViewport = page.getViewport({ scale: 1 });
        const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(img, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height,
        });
      }

      const compressedBytes = await newPdf.save();
      const blob = new Blob([compressedBytes as unknown as BlobPart], { type: "application/pdf" });

      setResult({
        blob,
        originalSize: file.size,
        compressedSize: blob.size,
      });
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Compression failed. The PDF may be corrupted or password-protected.");
      setStatus("error");
    }
  };

  const downloadResult = () => {
    if (!result || !file) return;
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(/\.pdf$/i, "") + "_compressed.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-600 text-white flex items-center justify-center shadow-md">
          <Archive className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Compress PDF</h1>
          <p className="text-sm text-slate-500">Reduce PDF file size — 100% in your browser, no uploads</p>
        </div>
      </div>

      {/* Dropzone */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
            dragOver ? "border-orange-500 bg-orange-50" : "border-slate-300 bg-slate-50 hover:border-orange-400 hover:bg-orange-50/50"
          }`}
          onClick={() => document.getElementById("pdf-compress-input")?.click()}
        >
          <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-700 font-semibold text-lg">Drop your PDF here</p>
          <p className="text-slate-500 text-sm mt-1">or click to browse</p>
          <input
            id="pdf-compress-input"
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
          {/* File info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Archive className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{file.name}</p>
              <p className="text-sm text-slate-500">{formatSize(file.size)}</p>
            </div>
            <button onClick={reset} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Compression level */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700">Compression Level</label>
            <div className="grid grid-cols-3 gap-3">
              {(["low", "medium", "high"] as CompressionLevel[]).map((l) => (
                <button
                  key={l}
                  onClick={() => { setLevel(l); setResult(null); setStatus("idle"); }}
                  className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all ${
                    level === l
                      ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-orange-300"
                  }`}
                >
                  <div className="capitalize">{l}</div>
                  <div className="text-xs font-normal mt-0.5 text-slate-400">
                    {l === "low" && "Best quality"}
                    {l === "medium" && "Balanced"}
                    {l === "high" && "Smallest file"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <Trash2 className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Result */}
          {status === "done" && result && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                <Check className="w-4 h-4" />
                Compression complete!
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="text-slate-500 text-xs">Original</div>
                  <div className="font-bold text-slate-700">{formatSize(result.originalSize)}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Compressed</div>
                  <div className="font-bold text-emerald-700">{formatSize(result.compressedSize)}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Saved</div>
                  <div className="font-bold text-orange-600">
                    {result.originalSize > result.compressedSize
                      ? Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100) + "%"
                      : "0%"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {status === "done" && result ? (
              <button
                onClick={downloadResult}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Compressed PDF
              </button>
            ) : (
              <button
                onClick={compress}
                disabled={status === "compressing"}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-sm shadow-md shadow-orange-500/25 hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {status === "compressing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Compressing…
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Compress PDF
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
