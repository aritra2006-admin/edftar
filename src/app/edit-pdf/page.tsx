"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { 
  FileText, 
  Download, 
  Loader2, 
  Check, 
  UploadCloud, 
  Trash2, 
  Undo, 
  ZoomIn, 
  ZoomOut, 
  Plus, 
  X,
  ShieldCheck
} from "@/components/Icons";

type ToolType = "select" | "text" | "draw" | "highlight" | "whiteout" | "signature" | "rect";

interface Annotation {
  id: string;
  pageIndex: number;
  type: "text" | "draw" | "highlight" | "whiteout" | "signature" | "rect";
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  color?: string;
  points?: { x: number; y: number }[];
  lineWidth?: number;
  dataUrl?: string; // for signatures or stamps
}

export default function PdfEditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  // Styling state
  const [fontColor, setFontColor] = useState("#0f172a");
  const [fontSize, setFontSize] = useState(16);
  const [penColor, setPenColor] = useState("#ef4444");
  const [penWidth, setPenWidth] = useState(3);
  const [highlightColor, setHighlightColor] = useState("rgba(250, 204, 21, 0.45)");

  // Annotations store
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Dragging and Resizing State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; w: number; h: number }>({ x: 0, y: 0, w: 0, h: 0 });

  // Freehand Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  // Signature Modal
  const [showSigModal, setShowSigModal] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigDrawing, setIsSigDrawing] = useState(false);

  // Canvas & Container refs
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF via pdfjs-dist
  const handlePdfUpload = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF file.");
      return;
    }
    setFile(f);
    setStatus("loading");
    setStatusMsg("Rendering PDF...");
    setAnnotations([]);
    setSelectedId(null);
    setCurrentPage(1);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await f.arrayBuffer();
      const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDoc(loadedPdf);
      setNumPages(loadedPdf.numPages);
    } catch (err) {
      console.error(err);
      alert("Failed to load PDF file.");
    } finally {
      setStatus("idle");
      setStatusMsg("");
    }
  };

  // Render current PDF page on canvas
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale });
      const canvas = pdfCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (drawCanvasRef.current) {
        drawCanvasRef.current.width = viewport.width;
        drawCanvasRef.current.height = viewport.height;
      }

      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.error(err);
    }
  }, [pdfDoc, currentPage, scale]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  // Click on PDF Canvas to place new annotations
  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || draggingId || resizingId) return;

    // Only create when text/whiteout/rect tool is active
    if (activeTool === "select" || activeTool === "draw" || activeTool === "highlight") {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === "text") {
      const newAnno: Annotation = {
        id: Math.random().toString(36).slice(2),
        pageIndex: currentPage,
        type: "text",
        x: Math.max(10, x - 10),
        y: Math.max(10, y - 10),
        text: "Click and type text here",
        fontSize,
        color: fontColor,
      };
      setAnnotations((prev) => [...prev, newAnno]);
      setSelectedId(newAnno.id);
      setActiveTool("select");
    } else if (activeTool === "whiteout") {
      const w = 150;
      const h = 32;
      const newAnno: Annotation = {
        id: Math.random().toString(36).slice(2),
        pageIndex: currentPage,
        type: "whiteout",
        x: Math.max(10, x - w / 2),
        y: Math.max(10, y - h / 2),
        width: w,
        height: h,
        color: "#ffffff",
      };
      setAnnotations((prev) => [...prev, newAnno]);
      setSelectedId(newAnno.id);
      setActiveTool("select");
    } else if (activeTool === "rect") {
      const w = 140;
      const h = 70;
      const newAnno: Annotation = {
        id: Math.random().toString(36).slice(2),
        pageIndex: currentPage,
        type: "rect",
        x: Math.max(10, x - w / 2),
        y: Math.max(10, y - h / 2),
        width: w,
        height: h,
        color: penColor,
        lineWidth: penWidth,
      };
      setAnnotations((prev) => [...prev, newAnno]);
      setSelectedId(newAnno.id);
      setActiveTool("select");
    }
  };

  // Dragging Handlers for Annotations
  const handleAnnotationMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedId(id);
    const anno = annotations.find((a) => a.id === id);
    if (!anno || !containerRef.current) return;

    setDraggingId(id);
    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: (e.clientX - rect.left) - anno.x,
      y: (e.clientY - rect.top) - anno.y,
    });
  };

  const handleResizeMouseDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const anno = annotations.find((a) => a.id === id);
    if (!anno) return;

    setResizingId(id);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      w: anno.width || 120,
      h: anno.height || 60,
    });
  };

  // Global Mouse Move and Mouse Up across the viewport
  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (draggingId) {
      const currentMouseX = e.clientX - rect.left;
      const currentMouseY = e.clientY - rect.top;

      setAnnotations((prev) =>
        prev.map((a) => {
          if (a.id === draggingId) {
            return {
              ...a,
              x: Math.max(0, Math.min(rect.width - 40, currentMouseX - dragOffset.x)),
              y: Math.max(0, Math.min(rect.height - 20, currentMouseY - dragOffset.y)),
            };
          }
          return a;
        })
      );
    } else if (resizingId) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      setAnnotations((prev) =>
        prev.map((a) => {
          if (a.id === resizingId) {
            return {
              ...a,
              width: Math.max(40, resizeStart.w + deltaX),
              height: Math.max(20, resizeStart.h + deltaY),
            };
          }
          return a;
        })
      );
    }
  };

  const handleContainerMouseUp = () => {
    setDraggingId(null);
    setResizingId(null);
  };

  // Freehand Drawing Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "draw" && activeTool !== "highlight") return;
    setIsDrawing(true);
    const rect = drawCanvasRef.current!.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCurrentPath([pt]);
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = drawCanvasRef.current!.getBoundingClientRect();
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setCurrentPath((prev) => [...prev, pt]);

    const ctx = drawCanvasRef.current?.getContext("2d");
    if (!ctx || currentPath.length < 1) return;

    ctx.strokeStyle = activeTool === "highlight" ? highlightColor : penColor;
    ctx.lineWidth = activeTool === "highlight" ? 14 : penWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    const prevPt = currentPath[currentPath.length - 1];
    ctx.moveTo(prevPt.x, prevPt.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentPath.length > 1) {
      const newAnno: Annotation = {
        id: Math.random().toString(36).slice(2),
        pageIndex: currentPage,
        type: activeTool === "highlight" ? "highlight" : "draw",
        x: 0,
        y: 0,
        points: currentPath,
        color: activeTool === "highlight" ? highlightColor : penColor,
        lineWidth: activeTool === "highlight" ? 14 : penWidth,
      };
      setAnnotations((prev) => [...prev, newAnno]);
    }
    setCurrentPath([]);
  };

  const updateText = (id: string, newText: string) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, text: newText } : a))
    );
  };

  const deleteAnnotation = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Signature Canvas Handlers
  const startSigDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsSigDrawing(true);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const moveSigDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSigDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const endSigDraw = () => {
    setIsSigDrawing(false);
  };

  const clearSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const applySignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    const newAnno: Annotation = {
      id: Math.random().toString(36).slice(2),
      pageIndex: currentPage,
      type: "signature",
      x: 120,
      y: 180,
      width: 180,
      height: 75,
      dataUrl,
    };
    setAnnotations((prev) => [...prev, newAnno]);
    setSelectedId(newAnno.id);
    setShowSigModal(false);
    clearSig();
    setActiveTool("select");
  };

  // Export & Bake Annotations directly into Downloaded PDF
  const saveAndDownloadPdf = async () => {
    if (!file || !pdfDoc) return;
    setStatus("saving");
    setStatusMsg("Baking edits into final PDF...");

    try {
      const { PDFDocument, rgb } = await import("pdf-lib");
      const arrayBuffer = await file.arrayBuffer();
      const pdfLibDoc = await PDFDocument.load(arrayBuffer);

      for (let i = 0; i < pdfLibDoc.getPageCount(); i++) {
        const pageIdx = i + 1;
        const pageAnnos = annotations.filter((a) => a.pageIndex === pageIdx);
        if (pageAnnos.length === 0) continue;

        const targetPage = pdfLibDoc.getPage(i);
        const { width: pageWidth, height: pageHeight } = targetPage.getSize();

        const pageObj = await pdfDoc.getPage(pageIdx);
        const viewport = pageObj.getViewport({ scale });
        const scaleX = pageWidth / viewport.width;
        const scaleY = pageHeight / viewport.height;

        for (const anno of pageAnnos) {
          if (anno.type === "text" && anno.text) {
            const pdfX = anno.x * scaleX;
            const pdfFontSize = (anno.fontSize || 16) * scaleX;
            const pdfY = pageHeight - (anno.y * scaleY) - pdfFontSize;

            targetPage.drawText(anno.text, {
              x: Math.max(0, pdfX),
              y: Math.max(0, pdfY),
              size: pdfFontSize,
              color: rgb(0.1, 0.1, 0.1),
            });
          } else if (anno.type === "whiteout") {
            const pdfX = anno.x * scaleX;
            const pdfWidth = (anno.width || 120) * scaleX;
            const pdfHeight = (anno.height || 30) * scaleY;
            const pdfY = pageHeight - (anno.y * scaleY) - pdfHeight;

            targetPage.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfWidth,
              height: pdfHeight,
              color: rgb(1, 1, 1),
            });
          } else if (anno.type === "rect") {
            const pdfX = anno.x * scaleX;
            const pdfWidth = (anno.width || 120) * scaleX;
            const pdfHeight = (anno.height || 60) * scaleY;
            const pdfY = pageHeight - (anno.y * scaleY) - pdfHeight;

            targetPage.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfWidth,
              height: pdfHeight,
              borderColor: rgb(0.9, 0.2, 0.2),
              borderWidth: (anno.lineWidth || 2) * scaleX,
            });
          } else if (anno.type === "signature" && anno.dataUrl) {
            const pngImage = await pdfLibDoc.embedPng(anno.dataUrl);
            const pdfX = anno.x * scaleX;
            const pdfWidth = (anno.width || 180) * scaleX;
            const pdfHeight = (anno.height || 75) * scaleY;
            const pdfY = pageHeight - (anno.y * scaleY) - pdfHeight;

            targetPage.drawImage(pngImage, {
              x: pdfX,
              y: pdfY,
              width: pdfWidth,
              height: pdfHeight,
            });
          }
        }
      }

      const editedPdfBytes = await pdfLibDoc.save();
      const blob = new Blob([editedPdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.pdf$/i, "")}_edited.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error(err);
      alert("Failed to export edited PDF.");
    } finally {
      setStatus("idle");
      setStatusMsg("");
    }
  };

  const currentPageAnnotations = annotations.filter((a) => a.pageIndex === currentPage);

  return (
    <div className="flex flex-col min-h-screen bg-[#2d3139] text-slate-100 select-none">
      
      {/* 1. Adobe Style Top Navigation Bar */}
      <header className="bg-[#1e2229] border-b border-[#3b404d] px-4 py-2 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#eb1000] text-white flex items-center justify-center font-black text-sm shadow-sm">
            PDF
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{file ? file.name : "Edftar Adobe PDF Editor"}</span>
              <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30">
                Acrobat Pro Mode
              </span>
            </h1>
            <span className="text-[11px] text-slate-400">Drag to move • Click to type directly • 100% Private</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className="text-xs bg-slate-800 text-blue-400 px-2.5 py-1 rounded flex items-center gap-1 border border-slate-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {statusMsg}
            </span>
          )}

          {file && (
            <>
              <button
                onClick={() => setFile(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
              >
                Change File
              </button>
              <button
                onClick={saveAndDownloadPdf}
                disabled={status !== "idle"}
                className="px-4 py-1.5 rounded-lg bg-[#eb1000] hover:bg-[#d00e00] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-all"
              >
                <Download className="w-4 h-4" /> Save &amp; Download PDF
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. Adobe Acrobat Tools Toolbar */}
      {file && (
        <div className="bg-[#262a33] border-b border-[#3b404d] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
          {/* Primary Annotation Tools */}
          <div className="flex items-center gap-1 bg-[#1e2229] p-1 rounded-xl border border-[#3b404d]">
            <button
              onClick={() => setActiveTool("select")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTool === "select" ? "bg-[#eb1000] text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Select & Move Tool (Drag boxes around)"
            >
              👆 Select / Move
            </button>

            <button
              onClick={() => setActiveTool("text")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTool === "text" ? "bg-[#eb1000] text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Click on page to type text anywhere"
            >
              🔤 Add Text
            </button>

            <button
              onClick={() => setActiveTool("draw")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTool === "draw" ? "bg-[#eb1000] text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Freehand Pen"
            >
              ✏️ Draw
            </button>

            <button
              onClick={() => setActiveTool("highlight")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTool === "highlight" ? "bg-[#eb1000] text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Highlight text or areas"
            >
              🖍️ Highlight
            </button>

            <button
              onClick={() => setActiveTool("whiteout")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTool === "whiteout" ? "bg-[#eb1000] text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Whiteout / Redact text"
            >
              ⬜ Whiteout / Redact
            </button>

            <button
              onClick={() => setShowSigModal(true)}
              className="px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 text-slate-300 hover:bg-slate-800"
              title="Draw and place your signature"
            >
              ✍️ Sign Document
            </button>

            <button
              onClick={() => setActiveTool("rect")}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeTool === "rect" ? "bg-[#eb1000] text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
              title="Box / Frame"
            >
              🔲 Box
            </button>
          </div>

          {/* Secondary Tool Options */}
          <div className="flex items-center gap-3">
            {activeTool === "text" && (
              <div className="flex items-center gap-2 bg-[#1e2229] px-2.5 py-1 rounded-xl border border-[#3b404d]">
                <span className="text-slate-400">Color:</span>
                <input
                  type="color"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="w-4 h-4 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-slate-400 ml-1">Size:</span>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="bg-[#262a33] border border-slate-700 text-xs rounded px-1.5 py-0.5 text-slate-200 outline-none"
                >
                  <option value={12}>12pt</option>
                  <option value={14}>14pt</option>
                  <option value={16}>16pt</option>
                  <option value={20}>20pt</option>
                  <option value={24}>24pt</option>
                  <option value={32}>32pt</option>
                </select>
              </div>
            )}

            {(activeTool === "draw" || activeTool === "rect") && (
              <div className="flex items-center gap-2 bg-[#1e2229] px-2.5 py-1 rounded-xl border border-[#3b404d]">
                <span className="text-slate-400">Color:</span>
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="w-4 h-4 rounded cursor-pointer bg-transparent border-0"
                />
                <span className="text-slate-400 ml-1">Thickness:</span>
                <select
                  value={penWidth}
                  onChange={(e) => setPenWidth(Number(e.target.value))}
                  className="bg-[#262a33] border border-slate-700 text-xs rounded px-1.5 py-0.5 text-slate-200 outline-none"
                >
                  <option value={2}>Thin (2px)</option>
                  <option value={4}>Medium (4px)</option>
                  <option value={7}>Thick (7px)</option>
                </select>
              </div>
            )}

            {/* Clear page annotations */}
            {currentPageAnnotations.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Clear all edits on this page?")) {
                    setAnnotations((prev) => prev.filter((a) => a.pageIndex !== currentPage));
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear ({currentPageAnnotations.length})
              </button>
            )}

            {/* Page Navigation */}
            <div className="flex items-center gap-1 bg-[#1e2229] px-2 py-1 rounded-xl border border-[#3b404d]">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2 py-0.5 hover:bg-slate-800 rounded disabled:opacity-40 font-bold"
              >
                ◀
              </button>
              <span className="font-semibold text-slate-300 px-1">
                Page {currentPage} of {numPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="px-2 py-0.5 hover:bg-slate-800 rounded disabled:opacity-40 font-bold"
              >
                ▶
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#1e2229] px-2 py-1 rounded-xl border border-[#3b404d]">
              <button onClick={() => setScale((s) => Math.max(0.6, s - 0.2))} className="p-1 hover:bg-slate-800 rounded">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale((s) => Math.min(2.4, s + 0.2))} className="p-1 hover:bg-slate-800 rounded">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Stage Container */}
      <div 
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        className="flex-1 flex justify-center items-start overflow-auto p-4 sm:p-8 relative"
      >
        {!file ? (
          /* Empty State Dropzone */
          <div className="max-w-xl w-full my-auto text-center space-y-6">
            <div
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handlePdfUpload(f);
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("pdf-edit-file-input")?.click()}
              className="border-2 border-dashed border-red-500/40 hover:border-red-500 bg-[#262a33] hover:bg-[#2c313c] p-12 rounded-3xl cursor-pointer transition-all shadow-xl group space-y-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-500 group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white">Upload PDF to Edit (Adobe Pro Style)</h2>
              <p className="text-sm text-slate-400 max-w-sm mx-auto">
                Add text, draw, highlight, whiteout confidential info, and sign contracts directly inside your web browser.
              </p>
              <span className="inline-block px-5 py-2.5 rounded-xl bg-[#eb1000] text-white font-bold text-xs shadow-md shadow-red-600/25">
                Select PDF File
              </span>
              <input
                id="pdf-edit-file-input"
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePdfUpload(f);
                }}
              />
            </div>

            <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Private</span>
              <span>•</span>
              <span>No file size limits</span>
              <span>•</span>
              <span>No sign-up required</span>
            </div>
          </div>
        ) : (
          /* PDF Page Sheet with Annotations Overlay */
          <div 
            ref={containerRef}
            onClick={handleStageClick}
            className={`relative shadow-2xl rounded-sm border border-slate-700 bg-white select-none ${
              activeTool === "text" || activeTool === "whiteout" || activeTool === "rect" ? "cursor-crosshair" : "cursor-default"
            }`}
          >
            {/* Base PDF Canvas */}
            <canvas ref={pdfCanvasRef} className="block pointer-events-none" />

            {/* Freehand Drawing Canvas */}
            <canvas
              ref={drawCanvasRef}
              onMouseDown={startDrawing}
              onMouseMove={drawMove}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className={`absolute inset-0 z-10 ${
                activeTool === "draw" || activeTool === "highlight" ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
              }`}
            />

            {/* Interactive & Draggable Annotations */}
            {currentPageAnnotations.map((anno) => {
              const isSelected = selectedId === anno.id;

              /* TEXT ANNOTATION - Direct Inline Typing */
              if (anno.type === "text") {
                return (
                  <div
                    key={anno.id}
                    onMouseDown={(e) => handleAnnotationMouseDown(anno.id, e)}
                    style={{
                      left: anno.x,
                      top: anno.y,
                    }}
                    className={`absolute z-20 group flex items-start gap-1 p-1 rounded transition-shadow ${
                      isSelected ? "ring-2 ring-blue-500 bg-blue-500/10 shadow-lg" : "hover:ring-1 hover:ring-slate-400"
                    }`}
                  >
                    {/* Drag Handle */}
                    <div className="cursor-move p-0.5 text-slate-400 hover:text-slate-800 opacity-60 group-hover:opacity-100" title="Drag to move">
                      ⠿
                    </div>

                    {/* Inline Input/Textarea */}
                    <input
                      type="text"
                      value={anno.text || ""}
                      onChange={(e) => updateText(anno.id, e.target.value)}
                      onFocus={() => setSelectedId(anno.id)}
                      style={{
                        color: anno.color || fontColor,
                        fontSize: `${anno.fontSize || fontSize}px`,
                        fontFamily: "Arial, sans-serif",
                      }}
                      className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-1 py-0.5 font-medium transition-all"
                      placeholder="Type text..."
                    />

                    {/* Delete button */}
                    <button
                      onClick={(e) => deleteAnnotation(anno.id, e)}
                      className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
                      title="Delete text"
                    >
                      ✕
                    </button>
                  </div>
                );
              }

              /* WHITEOUT ANNOTATION - Draggable and Resizable */
              if (anno.type === "whiteout") {
                return (
                  <div
                    key={anno.id}
                    onMouseDown={(e) => handleAnnotationMouseDown(anno.id, e)}
                    style={{
                      left: anno.x,
                      top: anno.y,
                      width: anno.width || 140,
                      height: anno.height || 32,
                    }}
                    className={`absolute z-20 bg-white border border-dashed border-slate-400 group cursor-move shadow-xs ${
                      isSelected ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    {/* Delete Button */}
                    <button
                      onClick={(e) => deleteAnnotation(anno.id, e)}
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-30"
                      title="Delete whiteout"
                    >
                      ✕
                    </button>

                    {/* Corner Resize Handle */}
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(anno.id, e)}
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-500 cursor-nwse-resize opacity-0 group-hover:opacity-100 z-30"
                      title="Drag to resize"
                    />
                  </div>
                );
              }

              /* RECTANGLE / BOX ANNOTATION */
              if (anno.type === "rect") {
                return (
                  <div
                    key={anno.id}
                    onMouseDown={(e) => handleAnnotationMouseDown(anno.id, e)}
                    style={{
                      left: anno.x,
                      top: anno.y,
                      width: anno.width || 140,
                      height: anno.height || 70,
                      borderColor: anno.color || penColor,
                      borderWidth: `${anno.lineWidth || penWidth}px`,
                    }}
                    className={`absolute z-20 border group cursor-move ${
                      isSelected ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <button
                      onClick={(e) => deleteAnnotation(anno.id, e)}
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-30"
                      title="Delete box"
                    >
                      ✕
                    </button>
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(anno.id, e)}
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-500 cursor-nwse-resize opacity-0 group-hover:opacity-100 z-30"
                      title="Drag to resize"
                    />
                  </div>
                );
              }

              /* SIGNATURE ANNOTATION - Draggable and Resizable */
              if (anno.type === "signature" && anno.dataUrl) {
                return (
                  <div
                    key={anno.id}
                    onMouseDown={(e) => handleAnnotationMouseDown(anno.id, e)}
                    style={{
                      left: anno.x,
                      top: anno.y,
                      width: anno.width || 180,
                      height: anno.height || 75,
                    }}
                    className={`absolute z-20 group cursor-move select-none p-1 border border-transparent hover:border-blue-300 rounded ${
                      isSelected ? "ring-2 ring-blue-500 bg-blue-50/20" : ""
                    }`}
                  >
                    <img 
                      src={anno.dataUrl} 
                      alt="Signature" 
                      className="w-full h-full object-contain pointer-events-none" 
                    />

                    {/* Delete button */}
                    <button
                      onClick={(e) => deleteAnnotation(anno.id, e)}
                      className="absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity z-30"
                      title="Delete signature"
                    >
                      ✕
                    </button>

                    {/* Resize Handle */}
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(anno.id, e)}
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-blue-500 cursor-nwse-resize opacity-0 group-hover:opacity-100 z-30"
                      title="Drag to resize signature"
                    />
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      {/* 4. Signature Draw Modal */}
      {showSigModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#1e2229] border border-[#3b404d] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span>✍️</span> Draw Your Signature
              </h3>
              <button onClick={() => setShowSigModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="bg-white rounded-xl overflow-hidden border border-slate-600 relative">
              <canvas
                ref={sigCanvasRef}
                width={400}
                height={160}
                onMouseDown={startSigDraw}
                onMouseMove={moveSigDraw}
                onMouseUp={endSigDraw}
                onMouseLeave={endSigDraw}
                className="w-full h-40 cursor-crosshair block"
              />
              <span className="absolute bottom-2 left-3 text-[10px] text-slate-400 select-none pointer-events-none">
                Sign above with your mouse or finger
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <button
                onClick={clearSig}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Clear Pad
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSigModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={applySignature}
                  className="px-4 py-1.5 rounded-lg bg-[#eb1000] hover:bg-[#d00e00] text-white font-bold"
                >
                  Place Signature on PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
