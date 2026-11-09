"use client";

import { useState, useCallback } from "react";
import { FileImage, FileWord, Download, Loader2, AlertTriangle, Check, UploadCloud, X } from "@/components/Icons";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "converting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setErrorMsg("Please upload a PDF file.");
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
      // Load pdfjs-dist
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      // Extract text from every page
      const paragraphsAll: { text: string; isHeading: boolean }[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();

        // Group text items into lines by Y position
        type TextItem = { str: string; transform: number[]; height: number };
        const items = content.items as TextItem[];
        const lines: Map<number, { text: string; height: number }> = new Map();

        for (const item of items) {
          const y = Math.round(item.transform[5]);
          const existing = lines.get(y);
          if (existing) {
            existing.text += item.str;
          } else {
            lines.set(y, { text: item.str, height: item.height || 12 });
          }
        }

        // Sort lines by descending Y (top of page first)
        const sorted = Array.from(lines.entries())
          .sort((a, b) => b[0] - a[0])
          .map((e) => e[1]);

        for (const line of sorted) {
          const trimmed = line.text.trim();
          if (!trimmed) continue;
          // Heuristic: tall font height → heading
          const isHeading = line.height > 14;
          paragraphsAll.push({ text: trimmed, isHeading });
        }

        // Add page break marker between pages
        if (i < pdf.numPages) {
          paragraphsAll.push({ text: "---", isHeading: false });
        }
      }

      // Build DOCX using the docx library
      const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } = await import("docx");

      const docParagraphs = paragraphsAll.map((p) => {
        if (p.text === "---") {
          return new Paragraph({ children: [new PageBreak()] });
        }
        if (p.isHeading) {
          return new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: p.text, bold: true })],
          });
        }
        return new Paragraph({ children: [new TextRun(p.text)] });
      });

      const doc = new Document({
        sections: [
          {
            children: docParagraphs,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.replace(/\.pdf$/i, "") + ".docx";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Conversion failed. The PDF may be scanned/image-based (no selectable text).");
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md">
            <FileWord className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">PDF to Word</h1>
            <p className="text-sm text-slate-500">Extract text from PDF and create a .docx file — 100% private</p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
        <div>
          <strong>Note:</strong> This tool extracts selectable text from PDFs and creates a Word document. Complex layouts, tables, and images may not transfer perfectly — this works best on text-based PDFs (not scanned images).
        </div>
      </div>

      {/* Dropzone */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
            dragOver ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50"
          }`}
          onClick={() => document.getElementById("pdf-input")?.click()}
        >
          <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-700 font-semibold text-lg">Drop your PDF here</p>
          <p className="text-slate-500 text-sm mt-1">or click to browse</p>
          <p className="text-xs text-slate-400 mt-3">Supports PDF files with selectable text</p>
          <input
            id="pdf-input"
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
          {/* File info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileImage className="w-6 h-6 text-indigo-600" />
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
              Your Word document has been downloaded successfully!
            </div>
          )}

          {/* Convert button */}
          <button
            onClick={convert}
            disabled={status === "converting"}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm shadow-md shadow-indigo-500/25 hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            {status === "converting" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting text…
              </>
            ) : status === "done" ? (
              <>
                <Download className="w-4 h-4" />
                Convert Again
              </>
            ) : (
              <>
                <FileWord className="w-4 h-4" />
                Convert to Word
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
