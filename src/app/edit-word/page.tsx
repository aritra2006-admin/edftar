"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { 
  FileWord, 
  FileText, 
  Download, 
  Loader2, 
  Check, 
  Plus, 
  UploadCloud, 
  Printer, 
  Undo, 
  Redo, 
  Search, 
  ZoomIn, 
  ZoomOut,
  Maximize2
} from "@/components/Icons";

type ActiveTab = "home" | "insert" | "layout" | "view";

export default function MSWordEditorPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Document state
  const [docTitle, setDocTitle] = useState("Document1");
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [status, setStatus] = useState<"idle" | "loading" | "exporting">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [saved, setSaved] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  
  // Document stats
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  
  // Formatting state
  const [fontFamily, setFontFamily] = useState("Calibri, sans-serif");
  const [fontSize, setFontSize] = useState("3");
  const [pageOrientation, setPageOrientation] = useState<"portrait" | "landscape">("portrait");
  const [pageMargin, setPageMargin] = useState<"normal" | "narrow" | "wide">("normal");
  const [showRuler, setShowRuler] = useState(true);

  // Load saved document from localStorage
  useEffect(() => {
    const savedContent = localStorage.getItem("edftar-msword-content");
    const savedTitle = localStorage.getItem("edftar-msword-title");
    if (savedContent && editorRef.current) {
      editorRef.current.innerHTML = savedContent;
    }
    if (savedTitle) setDocTitle(savedTitle);
    updateCounts();
  }, []);

  const updateCounts = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || "";
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(words);
    setCharCount(text.length);
  };

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateCounts();
  };

  const saveToLocal = useCallback(() => {
    if (!editorRef.current) return;
    localStorage.setItem("edftar-msword-content", editorRef.current.innerHTML);
    localStorage.setItem("edftar-msword-title", docTitle);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [docTitle]);

  // Auto-save every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (editorRef.current) {
        localStorage.setItem("edftar-msword-content", editorRef.current.innerHTML);
        localStorage.setItem("edftar-msword-title", docTitle);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [docTitle]);

  const newDocument = () => {
    if (window.confirm("Create a new document? Unsaved changes will be cleared.")) {
      if (editorRef.current) {
        editorRef.current.innerHTML = `
          <h1 style="font-size: 22pt; font-weight: bold; margin-bottom: 12pt; color: #1f2937;">Heading 1</h1>
          <p style="margin-bottom: 8pt; line-height: 1.6;">Type your document text here...</p>
        `;
      }
      setDocTitle("Document1");
      localStorage.removeItem("edftar-msword-content");
      localStorage.removeItem("edftar-msword-title");
      updateCounts();
    }
    setShowFileMenu(false);
  };

  // Import existing Word doc
  const handleOpenDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("loading");
    setStatusMsg("Opening Word file...");

    try {
      const mammoth = (await import("mammoth")).default;
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      if (editorRef.current) {
        editorRef.current.innerHTML = result.value || "<p></p>";
      }
      const title = file.name.replace(/\.[^.]+$/, "");
      setDocTitle(title);
      localStorage.setItem("edftar-msword-content", result.value);
      localStorage.setItem("edftar-msword-title", title);
      updateCounts();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Could not open this Word file. Please verify it is a valid .docx file.");
    } finally {
      setStatus("idle");
      setStatusMsg("");
      setShowFileMenu(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Export as Word (.docx)
  const exportAsDocx = async () => {
    if (!editorRef.current) return;
    setStatus("exporting");
    setStatusMsg("Building Word .docx...");

    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = editorRef.current.innerHTML;
      const blocks = tempDiv.querySelectorAll("p, h1, h2, h3, h4, div, li, blockquote");

      const docParagraphs: any[] = [];

      if (blocks.length === 0) {
        const lines = (editorRef.current.innerText || "").split("\n");
        lines.forEach((line) => {
          docParagraphs.push(new Paragraph({ children: [new TextRun(line)] }));
        });
      } else {
        blocks.forEach((block) => {
          const text = block.textContent || "";
          const tag = block.tagName.toLowerCase();
          const isBold = block.querySelector("b, strong") !== null;
          const isItalic = block.querySelector("i, em") !== null;

          if (tag === "h1") {
            docParagraphs.push(new Paragraph({
              heading: HeadingLevel.HEADING_1,
              children: [new TextRun({ text, bold: true, size: 40 })],
            }));
          } else if (tag === "h2") {
            docParagraphs.push(new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text, bold: true, size: 32 })],
            }));
          } else if (tag === "h3") {
            docParagraphs.push(new Paragraph({
              heading: HeadingLevel.HEADING_3,
              children: [new TextRun({ text, bold: true, size: 28 })],
            }));
          } else {
            docParagraphs.push(new Paragraph({
              children: [new TextRun({ text, bold: isBold, italics: isItalic })],
            }));
          }
        });
      }

      const doc = new Document({
        sections: [{ children: docParagraphs }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${docTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "Document"}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error(err);
      alert("Error generating .docx file.");
    } finally {
      setStatus("idle");
      setStatusMsg("");
      setShowFileMenu(false);
    }
  };

  // Export as PDF via Print
  const exportAsPdf = () => {
    if (!editorRef.current) return;
    setStatus("exporting");

    const content = editorRef.current.innerHTML;
    const styledHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${fontFamily};
      font-size: 11pt;
      line-height: 1.6;
      color: #111;
      background: #fff;
      padding: ${pageMargin === "narrow" ? "1.27cm" : pageMargin === "wide" ? "3.8cm" : "2.54cm"};
      max-width: 21cm;
      margin: 0 auto;
    }
    h1 { font-size: 20pt; font-weight: bold; margin: 16pt 0 8pt; color: #1e3a8a; }
    h2 { font-size: 16pt; font-weight: bold; margin: 12pt 0 6pt; color: #1e40af; }
    h3 { font-size: 13pt; font-weight: bold; margin: 10pt 0 4pt; color: #374151; }
    p { margin-bottom: 6pt; }
    ul, ol { padding-left: 20pt; margin-bottom: 6pt; }
    li { margin-bottom: 2pt; }
    table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
    td, th { border: 1px solid #94a3b8; padding: 5pt 7pt; }
    th { background: #f1f5f9; font-weight: bold; }
    img { max-width: 100%; height: auto; }
    @media print {
      body { padding: 0; }
      @page { 
        size: A4 ${pageOrientation};
        margin: ${pageMargin === "narrow" ? "1.27cm" : pageMargin === "wide" ? "3.8cm" : "2.54cm"}; 
      }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;

    const blob = new Blob([styledHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.onload = () => win.print();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setStatus("idle");
    setShowFileMenu(false);
  };

  // Insert Table Modal / Prompt
  const insertTable = () => {
    const rows = parseInt(prompt("Number of rows:", "3") || "3", 10);
    const cols = parseInt(prompt("Number of columns:", "3") || "3", 10);
    if (!rows || !cols) return;

    let html = '<table style="border-collapse: collapse; width: 100%; margin: 12px 0;"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += `<td style="border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 60px;">Cell</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table><p><br></p>";
    execCmd("insertHTML", html);
  };

  // Insert Image
  const insertImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        execCmd("insertImage", reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f3f2f1] text-[#242424] select-none">
      {/* 1. Office Top Header (Word Blue #185abd) */}
      <header className="bg-[#185abd] text-white px-3 py-1.5 flex items-center justify-between text-xs sm:text-sm shadow-sm select-none">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-white text-[#185abd] flex items-center justify-center font-black shadow-xs">
            <span className="text-base font-bold">W</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="bg-transparent hover:bg-white/10 focus:bg-white focus:text-[#185abd] text-white px-2 py-0.5 rounded font-semibold text-sm outline-none transition-all"
              title="Click to rename document"
            />
            <span className="text-white/70 text-xs hidden sm:inline">- Word Online</span>
          </div>
          <span className="text-xs text-white/80 hidden md:inline-flex items-center gap-1">
            {saved ? "✓ Saved" : "Auto-saving..."}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> {statusMsg}
            </span>
          )}
          <button
            onClick={() => exportAsDocx()}
            className="bg-white text-[#185abd] hover:bg-white/90 font-bold px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download .docx
          </button>
        </div>
      </header>

      {/* 2. Ribbon Tabs Bar */}
      <div className="bg-[#f3f2f1] border-b border-[#e1dfdd] px-2 flex items-center gap-1 text-xs select-none">
        <button
          onClick={() => setShowFileMenu(!showFileMenu)}
          className={`px-3 py-1.5 font-bold uppercase tracking-wider transition-colors ${
            showFileMenu ? "bg-[#185abd] text-white" : "bg-[#185abd] text-white hover:bg-[#114b9c]"
          }`}
        >
          File
        </button>
        {(["home", "insert", "layout", "view"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setShowFileMenu(false); }}
            className={`px-3 py-1.5 capitalize font-medium border-b-2 transition-all ${
              activeTab === tab && !showFileMenu
                ? "border-[#185abd] text-[#185abd] font-bold bg-white"
                : "border-transparent text-[#323130] hover:bg-[#edebe9]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* File Dropdown / Modal */}
      {showFileMenu && (
        <div 
          className="bg-white border-b border-[#e1dfdd] p-4 shadow-lg flex flex-wrap items-center gap-3 text-xs select-none z-50"
          onMouseLeave={() => setShowFileMenu(false)}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleOpenDocx}
          />
          <button
            onClick={newDocument}
            className="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-blue-600" /> New Document
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4 text-blue-600" /> Open .docx File
          </button>
          <button
            onClick={saveToLocal}
            className="px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center gap-1.5"
          >
            💾 Save to Browser
          </button>
          <button
            onClick={exportAsDocx}
            className="px-3 py-2 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1.5"
          >
            <FileWord className="w-4 h-4 text-blue-600" /> Export as Word (.docx)
          </button>
          <button
            onClick={exportAsPdf}
            className="px-3 py-2 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-rose-600" /> Export / Print as PDF
          </button>
        </div>
      )}

      {/* 3. Ribbon Controls Toolbar (MS Word Style) */}
      <div className="bg-white border-b border-[#e1dfdd] px-3 py-2 flex flex-wrap items-center gap-2 text-xs shadow-xs min-h-[48px] select-none">
        {/* HOME TAB */}
        {activeTab === "home" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 border-r border-[#e1dfdd] pr-2">
              <button onClick={() => execCmd("undo")} className="p-1.5 hover:bg-[#edebe9] rounded text-slate-700" title="Undo (Ctrl+Z)">
                ↩
              </button>
              <button onClick={() => execCmd("redo")} className="p-1.5 hover:bg-[#edebe9] rounded text-slate-700" title="Redo (Ctrl+Y)">
                ↪
              </button>
            </div>

            {/* Font Family & Size */}
            <div className="flex items-center gap-1 border-r border-[#e1dfdd] pr-2">
              <select
                value={fontFamily}
                onChange={(e) => {
                  setFontFamily(e.target.value);
                  execCmd("fontName", e.target.value);
                }}
                className="bg-transparent border border-[#d1d5db] rounded px-2 py-1 text-xs outline-none cursor-pointer"
              >
                <option value="Calibri, sans-serif">Calibri</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="'Segoe UI', sans-serif">Segoe UI</option>
              </select>

              <select
                value={fontSize}
                onChange={(e) => {
                  setFontSize(e.target.value);
                  execCmd("fontSize", e.target.value);
                }}
                className="bg-transparent border border-[#d1d5db] rounded px-1.5 py-1 text-xs outline-none cursor-pointer"
              >
                <option value="1">8pt</option>
                <option value="2">10pt</option>
                <option value="3">12pt</option>
                <option value="4">14pt</option>
                <option value="5">18pt</option>
                <option value="6">24pt</option>
                <option value="7">36pt</option>
              </select>
            </div>

            {/* B / I / U / S */}
            <div className="flex items-center gap-0.5 border-r border-[#e1dfdd] pr-2">
              <button onClick={() => execCmd("bold")} className="w-7 h-7 hover:bg-[#edebe9] rounded font-bold text-sm" title="Bold">
                B
              </button>
              <button onClick={() => execCmd("italic")} className="w-7 h-7 hover:bg-[#edebe9] rounded italic font-serif text-sm" title="Italic">
                I
              </button>
              <button onClick={() => execCmd("underline")} className="w-7 h-7 hover:bg-[#edebe9] rounded underline text-sm" title="Underline">
                U
              </button>
              <button onClick={() => execCmd("strikeThrough")} className="w-7 h-7 hover:bg-[#edebe9] rounded line-through text-sm" title="Strikethrough">
                ab
              </button>
              <button onClick={() => execCmd("subscript")} className="w-7 h-7 hover:bg-[#edebe9] rounded text-xs" title="Subscript">
                X₂
              </button>
              <button onClick={() => execCmd("superscript")} className="w-7 h-7 hover:bg-[#edebe9] rounded text-xs" title="Superscript">
                X²
              </button>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1 border-r border-[#e1dfdd] pr-2">
              <label className="flex items-center gap-0.5 p-1 hover:bg-[#edebe9] rounded cursor-pointer" title="Font Color">
                <span className="font-bold underline decoration-red-500">A</span>
                <input
                  type="color"
                  defaultValue="#1e293b"
                  onChange={(e) => execCmd("foreColor", e.target.value)}
                  className="w-3.5 h-3.5 border-0 bg-transparent cursor-pointer p-0"
                />
              </label>
              <label className="flex items-center gap-0.5 p-1 hover:bg-[#edebe9] rounded cursor-pointer" title="Highlight Color">
                <span>🖍️</span>
                <input
                  type="color"
                  defaultValue="#fef08a"
                  onChange={(e) => execCmd("hiliteColor", e.target.value)}
                  className="w-3.5 h-3.5 border-0 bg-transparent cursor-pointer p-0"
                />
              </label>
            </div>

            {/* Alignment & Lists */}
            <div className="flex items-center gap-0.5 border-r border-[#e1dfdd] pr-2">
              <button onClick={() => execCmd("justifyLeft")} className="w-7 h-7 hover:bg-[#edebe9] rounded text-xs" title="Align Left">
                ⬅
              </button>
              <button onClick={() => execCmd("justifyCenter")} className="w-7 h-7 hover:bg-[#edebe9] rounded text-xs" title="Center">
                ↔
              </button>
              <button onClick={() => execCmd("justifyRight")} className="w-7 h-7 hover:bg-[#edebe9] rounded text-xs" title="Align Right">
                ➡
              </button>
              <button onClick={() => execCmd("justifyFull")} className="w-7 h-7 hover:bg-[#edebe9] rounded text-xs" title="Justify">
                ☰
              </button>
              <button onClick={() => execCmd("insertUnorderedList")} className="px-1.5 h-7 hover:bg-[#edebe9] rounded text-xs" title="Bullet List">
                • List
              </button>
              <button onClick={() => execCmd("insertOrderedList")} className="px-1.5 h-7 hover:bg-[#edebe9] rounded text-xs" title="Numbered List">
                1. List
              </button>
            </div>

            {/* Heading Style Quick Dropdown */}
            <div className="flex items-center gap-1">
              <button onClick={() => execCmd("formatBlock", "p")} className="px-2 py-1 border border-slate-200 hover:bg-slate-50 rounded text-xs">
                Normal
              </button>
              <button onClick={() => execCmd("formatBlock", "h1")} className="px-2 py-1 border border-slate-200 hover:bg-slate-50 rounded text-xs font-bold text-blue-700">
                Heading 1
              </button>
              <button onClick={() => execCmd("formatBlock", "h2")} className="px-2 py-1 border border-slate-200 hover:bg-slate-50 rounded text-xs font-semibold text-blue-600">
                Heading 2
              </button>
              <button onClick={() => execCmd("removeFormat")} className="px-2 py-1 border border-slate-200 hover:bg-slate-50 rounded text-xs text-slate-500">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* INSERT TAB */}
        {activeTab === "insert" && (
          <div className="flex items-center gap-2">
            <button onClick={insertTable} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded flex items-center gap-1.5">
              <span>▦</span> Table
            </button>
            <button onClick={insertImage} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded flex items-center gap-1.5">
              <span>🖼️</span> Pictures
            </button>
            <button 
              onClick={() => { const url = prompt("Enter hyperlink URL:"); if (url) execCmd("createLink", url); }} 
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded flex items-center gap-1.5"
            >
              <span>🔗</span> Link
            </button>
            <button onClick={() => execCmd("insertHorizontalRule")} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded flex items-center gap-1.5">
              <span>—</span> Divider Line
            </button>
            <button 
              onClick={() => execCmd("insertHTML", '<div style="page-break-after: always; border-bottom: 2px dashed #cbd5e1; margin: 24px 0; color: #94a3b8; font-size: 10px; text-align: center;">--- Page Break ---</div>')} 
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded flex items-center gap-1.5"
            >
              <span>📄</span> Page Break
            </button>
          </div>
        )}

        {/* LAYOUT TAB */}
        {activeTab === "layout" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-500">Margins:</span>
              {(["normal", "narrow", "wide"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPageMargin(m)}
                  className={`px-2.5 py-1 rounded capitalize ${
                    pageMargin === m ? "bg-[#185abd] text-white" : "border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-slate-200" />

            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-500">Orientation:</span>
              <button
                onClick={() => setPageOrientation("portrait")}
                className={`px-2.5 py-1 rounded ${
                  pageOrientation === "portrait" ? "bg-[#185abd] text-white" : "border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Portrait
              </button>
              <button
                onClick={() => setPageOrientation("landscape")}
                className={`px-2.5 py-1 rounded ${
                  pageOrientation === "landscape" ? "bg-[#185abd] text-white" : "border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Landscape
              </button>
            </div>
          </div>
        )}

        {/* VIEW TAB */}
        {activeTab === "view" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="p-1.5 hover:bg-slate-100 rounded">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-bold">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(200, zoom + 10))} className="p-1.5 hover:bg-slate-100 rounded">
                <ZoomIn className="w-4 h-4" />
              </button>
              <button onClick={() => setZoom(100)} className="px-2 py-1 text-xs border border-slate-200 hover:bg-slate-50 rounded ml-1">
                100%
              </button>
            </div>

            <div className="w-px h-5 bg-slate-200" />

            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showRuler}
                onChange={(e) => setShowRuler(e.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Ruler</span>
            </label>

            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen();
                } else {
                  document.exitFullscreen();
                }
              }}
              className="px-2.5 py-1 border border-slate-200 hover:bg-slate-50 rounded flex items-center gap-1 text-xs"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Full Screen
            </button>
          </div>
        )}
      </div>

      {/* 4. Top Ruler (Optional) */}
      {showRuler && (
        <div className="bg-[#edebe9] border-b border-[#d2d0ce] h-4 flex items-center justify-center overflow-hidden text-[9px] text-[#605e5c] select-none">
          <div className="w-[816px] flex justify-between px-8 border-x border-[#c8c6c4]">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
            <span>6</span>
            <span>7</span>
            <span>8</span>
          </div>
        </div>
      )}

      {/* 5. Document Stage (Realistic Page Canvas) */}
      <div className="flex-1 overflow-auto p-4 sm:p-10 flex justify-center items-start bg-[#e5e5e5]">
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease",
            width: pageOrientation === "portrait" ? "816px" : "1056px",
            minHeight: pageOrientation === "portrait" ? "1056px" : "816px",
            padding: pageMargin === "narrow" ? "48px" : pageMargin === "wide" ? "144px" : "96px",
            fontFamily: fontFamily,
          }}
          className="bg-white shadow-2xl rounded-xs border border-[#d1d5db] outline-none text-[#1e293b] leading-relaxed cursor-text selection:bg-[#c7d2fe]"
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={updateCounts}
        >
          <h1 style={{ fontSize: "22pt", fontWeight: "bold", marginBottom: "12pt", color: "#185abd" }}>
            Welcome to MS Word Online
          </h1>
          <p style={{ marginBottom: "8pt", lineHeight: "1.6" }}>
            This is a full-featured online Microsoft Word document editor running directly inside your browser.
          </p>
          <h2 style={{ fontSize: "16pt", fontWeight: "bold", marginTop: "14pt", marginBottom: "8pt", color: "#1e3a8a" }}>
            Features Included:
          </h2>
          <ul style={{ paddingLeft: "24px", marginBottom: "8pt" }}>
            <li style={{ marginBottom: "4pt" }}><strong>Full Office Ribbon:</strong> Home, Insert, Layout, and View tabs.</li>
            <li style={{ marginBottom: "4pt" }}><strong>Import Existing .docx:</strong> Open and edit your local Word documents.</li>
            <li style={{ marginBottom: "4pt" }}><strong>Tables &amp; Images:</strong> Insert tables, pictures, links, and page breaks.</li>
            <li style={{ marginBottom: "4pt" }}><strong>Custom Margins &amp; Orientation:</strong> Portrait and Landscape layout support.</li>
            <li style={{ marginBottom: "4pt" }}><strong>Instant Export:</strong> Download as real Word <code>.docx</code> or print to PDF.</li>
          </ul>
          <p style={{ marginTop: "12pt", lineHeight: "1.6" }}>
            Select any text to begin formatting, or click <strong>File &gt; New</strong> to start with a blank page!
          </p>
        </div>
      </div>

      {/* 6. Office Bottom Status Bar */}
      <footer className="bg-[#185abd] text-white px-4 py-1 text-xs flex items-center justify-between select-none">
        <div className="flex items-center gap-4">
          <span>Page 1 of 1</span>
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
          <span className="hidden sm:inline">English (US)</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="hover:text-white/80 font-bold px-1">
            -
          </button>
          <input
            type="range"
            min="50"
            max="180"
            step="5"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-20 accent-white h-1.5 cursor-pointer"
          />
          <button onClick={() => setZoom(Math.min(180, zoom + 10))} className="hover:text-white/80 font-bold px-1">
            +
          </button>
          <span className="w-10 text-right">{zoom}%</span>
        </div>
      </footer>
    </div>
  );
}
