"use client";

import { useState, useCallback } from "react";
import { FileWord, Download, Loader2, AlertTriangle, Check, UploadCloud, X } from "@/components/Icons";

export default function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "converting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "docx" && ext !== "doc") {
      setErrorMsg("Please upload a .docx or .doc file.");
      setStatus("error");
      return;
    }
    setFile(f);
    setStatus("idle");
    setErrorMsg("");
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

  const convert = async () => {
    if (!file) return;
    setStatus("converting");
    setErrorMsg("");

    try {
      // Dynamically import mammoth (heavy library, only load when needed)
      const mammoth = (await import("mammoth")).default;
      const arrayBuffer = await file.arrayBuffer();

      // Convert DOCX → HTML
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      // Build a styled HTML document that prints cleanly to PDF
      const styledHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${file.name.replace(/\.[^.]+$/, "")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #000;
      background: #fff;
      padding: 2.54cm;
      max-width: 21cm;
      margin: 0 auto;
    }
    h1 { font-size: 20pt; font-weight: bold; margin: 16pt 0 8pt; }
    h2 { font-size: 16pt; font-weight: bold; margin: 14pt 0 6pt; }
    h3 { font-size: 13pt; font-weight: bold; margin: 12pt 0 4pt; }
    p { margin: 6pt 0; }
    ul, ol { padding-left: 24pt; margin: 6pt 0; }
    li { margin: 3pt 0; }
    table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
    td, th { border: 1px solid #999; padding: 4pt 6pt; }
    th { background: #eee; font-weight: bold; }
    img { max-width: 100%; height: auto; display: block; margin: 8pt 0; }
    @media print {
      body { padding: 0; }
      @page { margin: 2.54cm; size: A4; }
    }
  </style>
</head>
<body>
${html}
</body>
</html>`;

      // Create a Blob and trigger the browser's Print-to-PDF via a hidden iframe
      const blob = new Blob([styledHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);

      // Open in new tab so user can Ctrl+P / Save as PDF
      const win = window.open(url, "_blank");
      if (win) {
        win.onload = () => {
          // Auto-trigger print dialog in the new tab
          win.print();
        };
      }

      setStatus("done");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      console.error(err);
      setErrorMsg("Conversion failed. Please ensure the file is a valid .docx document.");
      setStatus("error");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md">
            <FileWord className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Word to PDF</h1>
            <p className="text-sm text-slate-500">Convert .docx documents to PDF — 100% in your browser</p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
        <div>
          <strong>How it works:</strong> Your Word document is converted to HTML in your browser, then a print-ready page opens. Use your browser&apos;s <strong>Print → Save as PDF</strong> (or press <strong>Ctrl+P</strong>) to save the PDF.
        </div>
      </div>

      {/* Dropzone */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
            dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
          }`}
          onClick={() => document.getElementById("word-input")?.click()}
        >
          <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-700 font-semibold text-lg">Drop your Word file here</p>
          <p className="text-slate-500 text-sm mt-1">or click to browse</p>
          <p className="text-xs text-slate-400 mt-3">Supports .docx and .doc files</p>
          <input
            id="word-input"
            type="file"
            accept=".docx,.doc"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
          {/* File info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileWord className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 truncate">{file.name}</p>
              <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={reset} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error */}
          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Success */}
          {status === "done" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <Check className="w-4 h-4 shrink-0" />
              A new tab has opened! Use <strong className="mx-1">Ctrl+P → Save as PDF</strong> to download your PDF.
            </div>
          )}

          {/* Convert button */}
          <button
            onClick={convert}
            disabled={status === "converting"}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-sm shadow-md shadow-blue-500/25 hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {status === "converting" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Converting…
              </>
            ) : status === "done" ? (
              <>
                <Download className="w-4 h-4" />
                Open Again
              </>
            ) : (
              <>
                <FileWord className="w-4 h-4" />
                Convert to PDF
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
