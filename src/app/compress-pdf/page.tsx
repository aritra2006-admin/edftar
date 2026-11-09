"use client";

import { useState, useCallback } from "react";
import { Archive, Download, Loader2, Check, UploadCloud, X, Trash2 } from "@/components/Icons";

type Mode = "target" | "manual";
type ManualLevel = "low" | "medium" | "high";
type SizeUnit = "KB" | "MB";

export default function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "compressing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Mode
  const [mode, setMode] = useState<Mode>("target");

  // Target mode
  const [targetSize, setTargetSize] = useState<number>(500);
  const [targetUnit, setTargetUnit] = useState<SizeUnit>("KB");

  // Manual mode
  const [manualLevel, setManualLevel] = useState<ManualLevel>("medium");

  const [result, setResult] = useState<{ blob: Blob; originalSize: number; compressedSize: number } | null>(null);
  const [progress, setProgress] = useState("");

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

  const buildPdf = async (
    pdf: Awaited<ReturnType<typeof import("pdfjs-dist")["getDocument"]>>["promise"] extends Promise<infer T> ? T : never,
    PDFDocument: (typeof import("pdf-lib"))["PDFDocument"],
    scale: number,
    quality: number
  ) => {
    const newPdf = await PDFDocument.create();
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
      const jpegBytes = Uint8Array.from(atob(jpegDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
      const img = await newPdf.embedJpg(jpegBytes as unknown as ArrayBuffer);

      const origViewport = page.getViewport({ scale: 1 });
      const newPage = newPdf.addPage([origViewport.width, origViewport.height]);
      newPage.drawImage(img, { x: 0, y: 0, width: origViewport.width, height: origViewport.height });
    }

    const bytes = await newPdf.save();
    return new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
  };

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

      let blob: Blob;

      if (mode === "manual") {
        const settings = {
          low: { scale: 1.5, quality: 0.85 },
          medium: { scale: 1.2, quality: 0.65 },
          high: { scale: 0.9, quality: 0.45 },
        };
        const { scale, quality } = settings[manualLevel];
        setProgress("Compressing...");
        blob = await buildPdf(pdf, PDFDocument, scale, quality);
      } else {
        // Target size mode — binary search for the right quality
        const targetBytes = targetUnit === "MB" ? targetSize * 1048576 : targetSize * 1024;

        if (file.size <= targetBytes) {
          setResult({ blob: new Blob([arrayBuffer], { type: "application/pdf" }), originalSize: file.size, compressedSize: file.size });
          setStatus("done");
          setProgress("");
          return;
        }

        // Try progressively lower quality until we hit the target
        const attempts = [
          { scale: 1.5, quality: 0.8 },
          { scale: 1.3, quality: 0.65 },
          { scale: 1.2, quality: 0.55 },
          { scale: 1.0, quality: 0.45 },
          { scale: 0.9, quality: 0.35 },
          { scale: 0.8, quality: 0.25 },
          { scale: 0.7, quality: 0.18 },
          { scale: 0.6, quality: 0.12 },
          { scale: 0.5, quality: 0.08 },
        ];

        blob = new Blob([arrayBuffer], { type: "application/pdf" }); // fallback
        let found = false;

        for (let i = 0; i < attempts.length; i++) {
          const { scale, quality } = attempts[i];
          setProgress(`Attempt ${i + 1}/${attempts.length} — quality ${Math.round(quality * 100)}%, scale ${scale}x`);

          const candidate = await buildPdf(pdf, PDFDocument, scale, quality);
          blob = candidate;

          if (candidate.size <= targetBytes) {
            found = true;
            break;
          }
        }

        if (!found) {
          setErrorMsg(
            `Could not reach ${targetSize} ${targetUnit}. Best result: ${formatSize(blob.size)}. Try a larger target size.`
          );
        }
      }

      setResult({ blob, originalSize: file.size, compressedSize: blob.size });
      setStatus("done");
      setProgress("");
    } catch (err) {
      console.error(err);
      setErrorMsg("Compression failed. The PDF may be corrupted or password-protected.");
      setStatus("error");
      setProgress("");
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
    setProgress("");
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
          <p className="text-sm text-slate-500">Reduce PDF file size — set a target or choose a level</p>
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
              <p className="text-sm text-slate-500">Current size: <strong>{formatSize(file.size)}</strong></p>
            </div>
            <button onClick={reset} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => { setMode("target"); setResult(null); setStatus("idle"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === "target" ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              🎯 Target Size
            </button>
            <button
              onClick={() => { setMode("manual"); setResult(null); setStatus("idle"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === "manual" ? "bg-white text-orange-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              ⚙️ Manual Level
            </button>
          </div>

          {/* Target size input */}
          {mode === "target" && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Compress to under:</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={targetSize}
                  onChange={(e) => { setTargetSize(Math.max(1, Number(e.target.value))); setResult(null); setStatus("idle"); }}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-lg font-bold text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                />
                <div className="flex rounded-xl border border-slate-300 overflow-hidden">
                  <button
                    onClick={() => { setTargetUnit("KB"); setResult(null); setStatus("idle"); }}
                    className={`px-4 py-3 text-sm font-bold transition-all ${
                      targetUnit === "KB" ? "bg-orange-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    KB
                  </button>
                  <button
                    onClick={() => { setTargetUnit("MB"); setResult(null); setStatus("idle"); }}
                    className={`px-4 py-3 text-sm font-bold transition-all ${
                      targetUnit === "MB" ? "bg-orange-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    MB
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                The system will try different quality levels to get your file under {targetSize} {targetUnit}
              </p>
            </div>
          )}

          {/* Manual level */}
          {mode === "manual" && (
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Compression Level</label>
              <div className="grid grid-cols-3 gap-3">
                {(["low", "medium", "high"] as ManualLevel[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setManualLevel(l); setResult(null); setStatus("idle"); }}
                    className={`py-3 px-4 rounded-2xl border text-sm font-semibold transition-all ${
                      manualLevel === l
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
          )}

          {/* Progress */}
          {status === "compressing" && progress && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              {progress}
            </div>
          )}

          {/* Error */}
          {status === "error" && errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <Trash2 className="w-4 h-4 shrink-0 mt-0.5" />
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
                    {mode === "target" ? `Compress to under ${targetSize} ${targetUnit}` : "Compress PDF"}
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
