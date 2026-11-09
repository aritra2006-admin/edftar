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

type RibbonTab = "home" | "insert" | "design" | "layout" | "view";

export default function FullMSWordEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Office Top Bar State
  const [docTitle, setDocTitle] = useState("Document1");
  const [activeTab, setActiveTab] = useState<RibbonTab>("home");
  const [autoSave, setAutoSave] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);

  // Status
  const [statusMsg, setStatusMsg] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  // Document Metrics
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [zoom, setZoom] = useState(100);

  // Font & Style State
  const [fontFamily, setFontFamily] = useState("Aptos, Calibri, sans-serif");
  const [fontSize, setFontSize] = useState("3");
  const [foreColor, setForeColor] = useState("#1f2937");
  const [highlightColor, setHighlightColor] = useState("#fef08a");

  // Design Tab State (Page Background & Borders)
  const [pageColor, setPageColor] = useState("#ffffff");
  const [watermark, setWatermark] = useState<string | null>(null);
  const [pageBorder, setPageBorder] = useState<"none" | "solid" | "double" | "dashed">("none");
  const [pageBorderColor, setPageBorderColor] = useState("#94a3b8");
  const [pageBorderWidth, setPageBorderWidth] = useState("2px");

  // Layout Tab State (Page Setup & Columns)
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [margins, setMargins] = useState<"normal" | "narrow" | "wide">("normal");
  const [columns, setColumns] = useState<1 | 2 | 3>(1);
  const [lineSpacing, setLineSpacing] = useState("1.6");

  // Header & Footer
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [showHeaderFooter, setShowHeaderFooter] = useState(false);

  // View Options
  const [showRuler, setShowRuler] = useState(true);
  const [showFindModal, setShowFindModal] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");

  // Modals
  const [showWordArtModal, setShowWordArtModal] = useState(false);
  const [showWatermarkModal, setShowWatermarkModal] = useState(false);
  const [showBorderModal, setShowBorderModal] = useState(false);

  // Load saved document on mount
  useEffect(() => {
    const savedContent = localStorage.getItem("edftar-fullword-content");
    const savedTitle = localStorage.getItem("edftar-fullword-title");
    const savedHeader = localStorage.getItem("edftar-fullword-header");
    const savedFooter = localStorage.getItem("edftar-fullword-footer");
    
    if (savedContent && editorRef.current) {
      editorRef.current.innerHTML = savedContent;
    }
    if (savedTitle) setDocTitle(savedTitle);
    if (savedHeader) { setHeaderText(savedHeader); setShowHeaderFooter(true); }
    if (savedFooter) { setFooterText(savedFooter); setShowHeaderFooter(true); }
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
    localStorage.setItem("edftar-fullword-content", editorRef.current.innerHTML);
    localStorage.setItem("edftar-fullword-title", docTitle);
    localStorage.setItem("edftar-fullword-header", headerText);
    localStorage.setItem("edftar-fullword-footer", footerText);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [docTitle, headerText, footerText]);

  // Auto-save periodically if enabled
  useEffect(() => {
    if (!autoSave) return;
    const timer = setInterval(() => {
      if (editorRef.current) {
        localStorage.setItem("edftar-fullword-content", editorRef.current.innerHTML);
        localStorage.setItem("edftar-fullword-title", docTitle);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [autoSave, docTitle]);

  // Open existing .docx
  const handleOpenDocx = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
      saveToLocal();
      updateCounts();
    } catch (err) {
      console.error(err);
      alert("Failed to parse this .docx file.");
    } finally {
      setStatusMsg("");
      setShowFileMenu(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Export as Word (.docx)
  const exportAsDocx = async () => {
    if (!editorRef.current) return;
    setIsExporting(true);
    setStatusMsg("Exporting Word .docx...");

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
      a.download = `${docTitle.trim() || "Document"}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error(err);
      alert("Error generating .docx file.");
    } finally {
      setIsExporting(false);
      setStatusMsg("");
      setShowFileMenu(false);
    }
  };

  // Export / Print as PDF
  const printOrPdf = () => {
    if (!editorRef.current) return;
    const content = editorRef.current.innerHTML;
    const paddingVal = margins === "narrow" ? "1.27cm" : margins === "wide" ? "3.8cm" : "2.54cm";

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ${fontFamily};
      background: ${pageColor};
      color: #111;
      padding: ${paddingVal};
      line-height: ${lineSpacing};
      position: relative;
    }
    ${watermark ? `
    body::before {
      content: "${watermark}";
      position: fixed;
      top: 45%;
      left: 10%;
      right: 10%;
      transform: rotate(-45deg);
      font-size: 72pt;
      font-weight: 900;
      color: rgba(203, 213, 225, 0.35);
      text-align: center;
      z-index: 9999;
      pointer-events: none;
    }` : ""}
    header { border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt; margin-bottom: 12pt; font-size: 9pt; color: #64748b; }
    footer { border-top: 1px solid #cbd5e1; padding-top: 4pt; margin-top: 12pt; font-size: 9pt; color: #64748b; }
    .content-area {
      column-count: ${columns};
      column-gap: 24pt;
    }
    table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
    td, th { border: 1px solid #cbd5e1; padding: 6pt; }
    th { background: #f8fafc; font-weight: bold; }
    img { max-width: 100%; height: auto; }
    @media print {
      @page { 
        size: A4 ${orientation};
        margin: ${paddingVal}; 
      }
    }
  </style>
</head>
<body>
  ${showHeaderFooter && headerText ? `<header>${headerText}</header>` : ""}
  <div class="content-area">
    ${content}
  </div>
  ${showHeaderFooter && footerText ? `<footer>${footerText}</footer>` : ""}
</body>
</html>`;

    const blob = new Blob([printHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.onload = () => win.print();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    setShowFileMenu(false);
  };

  // Insert Table
  const insertTable = () => {
    const rows = parseInt(prompt("Table Rows:", "3") || "3", 10);
    const cols = parseInt(prompt("Table Columns:", "3") || "3", 10);
    if (!rows || !cols) return;

    let html = '<table style="border-collapse: collapse; width: 100%; margin: 12px 0;"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += `<td style="border: 1px solid #cbd5e1; padding: 8px 12px; min-width: 60px;">${r === 0 ? "<b>Header</b>" : "Cell"}</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table><p><br></p>";
    execCmd("insertHTML", html);
  };

  // Insert Local Image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      execCmd("insertImage", reader.result as string);
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Insert WordArt
  const insertWordArt = (preset: { label: string; style: string }) => {
    const text = prompt("Enter your WordArt text:", "Awesome Title") || "WordArt";
    const html = `<div style="${preset.style}; display: inline-block; margin: 12px 0;">${text}</div><p><br></p>`;
    execCmd("insertHTML", html);
    setShowWordArtModal(false);
  };

  // Find & Replace
  const handleFindReplace = () => {
    if (!editorRef.current || !findQuery) return;
    const content = editorRef.current.innerHTML;
    const regex = new RegExp(findQuery, "gi");
    editorRef.current.innerHTML = content.replace(regex, replaceQuery);
    updateCounts();
    alert(`Replaced occurrences of "${findQuery}" with "${replaceQuery}".`);
    setShowFindModal(false);
  };

  // Padding based on margins setting
  const getPaddingClass = () => {
    if (margins === "narrow") return "p-8 sm:p-12";
    if (margins === "wide") return "p-16 sm:p-28";
    return "p-12 sm:p-20"; // normal
  };

  const wordArtPresets = [
    {
      label: "Classic Gradient",
      style: "font-size: 32pt; font-weight: 900; background: linear-gradient(to right, #2563eb, #9333ea); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 2px 2px 4px rgba(0,0,0,0.15);"
    },
    {
      label: "Retro 3D Gold",
      style: "font-size: 32pt; font-weight: 900; color: #f59e0b; text-shadow: 1px 1px 0 #d97706, 2px 2px 0 #b45309, 3px 3px 0 #92400e, 4px 4px 6px rgba(0,0,0,0.4);"
    },
    {
      label: "Neon Glow",
      style: "font-size: 32pt; font-weight: 900; color: #06b6d4; text-shadow: 0 0 10px #06b6d4, 0 0 20px #0891b2, 0 0 30px #0e7490;"
    },
    {
      label: "Sunset Rose",
      style: "font-size: 32pt; font-weight: 900; background: linear-gradient(to right, #f43f5e, #fb923c); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"
    },
    {
      label: "Elegant Outline",
      style: "font-size: 32pt; font-weight: 900; color: white; -webkit-text-stroke: 2px #1e293b; text-shadow: 3px 3px 0 #cbd5e1;"
    },
    {
      label: "Comic Pop",
      style: "font-size: 32pt; font-weight: 900; font-family: 'Comic Sans MS', cursive; color: #ef4444; text-shadow: 2px 2px 0 #000, 4px 4px 0 #fde047;"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#1f1f1f] text-slate-100 select-none">
      
      {/* 1. Word 365 Dark Fluent Title Bar */}
      <div className="bg-[#1f1f1f] border-b border-[#2d2d2d] px-3 py-1.5 flex items-center justify-between text-xs">
        {/* Left: Brand + Quick Access */}
        <div className="flex items-center gap-3">
          {/* Word Icon */}
          <div className="w-6 h-6 rounded bg-[#185abd] text-white flex items-center justify-center font-bold shadow-xs">
            W
          </div>

          {/* AutoSave Toggle */}
          <div className="flex items-center gap-1.5 bg-[#2a2a2a] px-2 py-0.5 rounded-full border border-[#3d3d3d]">
            <span className="text-[11px] text-slate-300">AutoSave</span>
            <button
              onClick={() => setAutoSave(!autoSave)}
              className={`w-7 h-3.5 rounded-full p-0.5 transition-colors ${autoSave ? "bg-[#185abd]" : "bg-slate-600"}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${autoSave ? "translate-x-3.5" : "translate-x-0"}`} />
            </button>
          </div>

          {/* Quick Access Icons */}
          <div className="flex items-center gap-1 text-slate-400">
            <button onClick={() => execCmd("undo")} className="p-1 hover:text-white hover:bg-[#333] rounded" title="Undo (Ctrl+Z)">
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => execCmd("redo")} className="p-1 hover:text-white hover:bg-[#333] rounded" title="Redo (Ctrl+Y)">
              <Redo className="w-3.5 h-3.5" />
            </button>
            <button onClick={saveToLocal} className="p-1 hover:text-white hover:bg-[#333] rounded" title="Save">
              💾
            </button>
          </div>

          {/* Document Title (Editable in-place) */}
          <div className="flex items-center gap-1 text-slate-200">
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="bg-transparent hover:bg-[#2c2c2c] focus:bg-[#333] px-2 py-0.5 rounded text-xs font-semibold outline-none border border-transparent focus:border-[#185abd] transition-all"
            />
            <span className="text-slate-500 text-[11px]">- Word</span>
            {saved && <span className="text-emerald-400 text-[10px] ml-1">✓ Saved</span>}
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden md:flex items-center bg-[#2d2d2d] hover:bg-[#383838] border border-[#3d3d3d] rounded-md px-3 py-1 w-64 text-slate-400 text-xs">
          <Search className="w-3.5 h-3.5 mr-2" />
          <input
            type="text"
            placeholder="Search commands or text..."
            className="bg-transparent text-slate-200 outline-none w-full placeholder:text-slate-500"
            onClick={() => setShowFindModal(true)}
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {statusMsg && (
            <span className="text-xs bg-[#2d2d2d] px-2 py-1 rounded text-blue-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> {statusMsg}
            </span>
          )}
          <button
            onClick={printOrPdf}
            className="px-2.5 py-1 rounded bg-[#2a2a2a] hover:bg-[#333] text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-[#3d3d3d]"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
          <button
            onClick={exportAsDocx}
            disabled={isExporting}
            className="px-3 py-1 rounded bg-[#185abd] hover:bg-[#114b9c] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Share / Export
          </button>
        </div>
      </div>

      {/* 2. Ribbon Tabs Bar */}
      <div className="bg-[#242424] border-b border-[#2d2d2d] px-2 flex items-center gap-1 text-xs">
        <button
          onClick={() => setShowFileMenu(!showFileMenu)}
          className="px-3.5 py-1.5 font-bold uppercase tracking-wider bg-[#185abd] text-white rounded-t hover:bg-[#154e99] transition-colors"
        >
          File
        </button>
        {(["home", "insert", "design", "layout", "view"] as RibbonTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setShowFileMenu(false); }}
            className={`px-3 py-1.5 capitalize font-semibold border-b-2 transition-all ${
              activeTab === tab && !showFileMenu
                ? "border-[#185abd] text-white bg-[#2b2b2b]"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#2a2a2a]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Backstage File Menu */}
      {showFileMenu && (
        <div 
          className="bg-[#2b2b2b] border-b border-[#3d3d3d] p-4 shadow-2xl flex flex-wrap items-center gap-3 text-xs z-50 animate-fadeIn"
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
            onClick={() => {
              if (confirm("Create a blank new document?")) {
                if (editorRef.current) editorRef.current.innerHTML = "<p></p>";
                setDocTitle("Document1");
                updateCounts();
              }
              setShowFileMenu(false);
            }}
            className="px-4 py-2.5 rounded-lg bg-[#333] hover:bg-[#3d3d3d] text-white font-semibold flex items-center gap-2 border border-[#444]"
          >
            <Plus className="w-4 h-4 text-blue-400" /> New Document
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-lg bg-[#333] hover:bg-[#3d3d3d] text-white font-semibold flex items-center gap-2 border border-[#444]"
          >
            <UploadCloud className="w-4 h-4 text-blue-400" /> Open .docx File
          </button>
          <button
            onClick={() => { saveToLocal(); setShowFileMenu(false); }}
            className="px-4 py-2.5 rounded-lg bg-[#333] hover:bg-[#3d3d3d] text-white font-semibold flex items-center gap-2 border border-[#444]"
          >
            💾 Save to Browser Storage
          </button>
          <button
            onClick={exportAsDocx}
            className="px-4 py-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-semibold flex items-center gap-2 border border-blue-500/40"
          >
            <FileWord className="w-4 h-4 text-blue-400" /> Export as Word (.docx)
          </button>
          <button
            onClick={printOrPdf}
            className="px-4 py-2.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold flex items-center gap-2 border border-rose-500/40"
          >
            <Printer className="w-4 h-4 text-rose-400" /> Print / Save as PDF
          </button>
        </div>
      )}

      {/* 3. The Rich Ribbon Bar (Dark Modern Theme) */}
      <div className="bg-[#2b2b2b] border-b border-[#383838] px-3 py-2 flex flex-wrap items-center gap-3 text-xs shadow-xs min-h-[58px]">
        
        {/* --- HOME TAB --- */}
        {activeTab === "home" && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Clipboard */}
            <div className="flex items-center gap-1 border-r border-[#3d3d3d] pr-2.5">
              <button 
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    execCmd("insertText", text);
                  } catch {
                    alert("Press Ctrl+V to paste.");
                  }
                }}
                className="px-2 py-1 hover:bg-[#383838] rounded text-slate-300 flex items-center gap-1"
                title="Paste"
              >
                📋 Paste
              </button>
              <button onClick={() => execCmd("cut")} className="p-1 hover:bg-[#383838] rounded text-slate-300" title="Cut">✂</button>
              <button onClick={() => execCmd("copy")} className="p-1 hover:bg-[#383838] rounded text-slate-300" title="Copy">📄</button>
            </div>

            {/* Font Family & Size */}
            <div className="flex items-center gap-1 border-r border-[#3d3d3d] pr-2.5">
              <select
                value={fontFamily}
                onChange={(e) => {
                  setFontFamily(e.target.value);
                  execCmd("fontName", e.target.value);
                }}
                className="bg-[#383838] border border-[#484848] text-slate-200 rounded px-2 py-1 text-xs outline-none cursor-pointer"
              >
                <option value="Aptos, Calibri, sans-serif">Aptos (Body)</option>
                <option value="Calibri, sans-serif">Calibri</option>
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="'Segoe UI', sans-serif">Segoe UI</option>
              </select>

              <select
                value={fontSize}
                onChange={(e) => {
                  setFontSize(e.target.value);
                  execCmd("fontSize", e.target.value);
                }}
                className="bg-[#383838] border border-[#484848] text-slate-200 rounded px-1.5 py-1 text-xs outline-none cursor-pointer"
              >
                <option value="1">9</option>
                <option value="2">10</option>
                <option value="3">12</option>
                <option value="4">14</option>
                <option value="5">18</option>
                <option value="6">24</option>
                <option value="7">36</option>
              </select>

              {/* Font Grow / Shrink */}
              <button 
                onClick={() => {
                  const next = Math.min(7, Number(fontSize) + 1).toString();
                  setFontSize(next);
                  execCmd("fontSize", next);
                }} 
                className="p-1 hover:bg-[#383838] rounded font-bold text-slate-300" 
                title="Increase Font Size"
              >
                A⁺
              </button>
              <button 
                onClick={() => {
                  const next = Math.max(1, Number(fontSize) - 1).toString();
                  setFontSize(next);
                  execCmd("fontSize", next);
                }} 
                className="p-1 hover:bg-[#383838] rounded text-xs text-slate-300" 
                title="Decrease Font Size"
              >
                A⁻
              </button>
            </div>

            {/* Font Formats: B, I, U, S, X2, X^2 */}
            <div className="flex items-center gap-0.5 border-r border-[#3d3d3d] pr-2.5">
              <button onClick={() => execCmd("bold")} className="w-7 h-7 hover:bg-[#383838] rounded font-bold text-slate-200" title="Bold (Ctrl+B)">B</button>
              <button onClick={() => execCmd("italic")} className="w-7 h-7 hover:bg-[#383838] rounded italic font-serif text-slate-200" title="Italic (Ctrl+I)">I</button>
              <button onClick={() => execCmd("underline")} className="w-7 h-7 hover:bg-[#383838] rounded underline text-slate-200" title="Underline (Ctrl+U)">U</button>
              <button onClick={() => execCmd("strikeThrough")} className="w-7 h-7 hover:bg-[#383838] rounded line-through text-slate-200" title="Strikethrough">ab</button>
              <button onClick={() => execCmd("subscript")} className="w-7 h-7 hover:bg-[#383838] rounded text-xs text-slate-300" title="Subscript">X₂</button>
              <button onClick={() => execCmd("superscript")} className="w-7 h-7 hover:bg-[#383838] rounded text-xs text-slate-300" title="Superscript">X²</button>

              {/* Font Color */}
              <label className="flex items-center gap-0.5 p-1 hover:bg-[#383838] rounded cursor-pointer ml-1" title="Font Color">
                <span className="font-bold underline decoration-red-500 text-slate-200">A</span>
                <input
                  type="color"
                  value={foreColor}
                  onChange={(e) => {
                    setForeColor(e.target.value);
                    execCmd("foreColor", e.target.value);
                  }}
                  className="w-3.5 h-3.5 border-0 bg-transparent cursor-pointer p-0"
                />
              </label>

              {/* Highlight */}
              <label className="flex items-center gap-0.5 p-1 hover:bg-[#383838] rounded cursor-pointer" title="Highlight Color">
                <span>🖍️</span>
                <input
                  type="color"
                  value={highlightColor}
                  onChange={(e) => {
                    setHighlightColor(e.target.value);
                    execCmd("hiliteColor", e.target.value);
                  }}
                  className="w-3.5 h-3.5 border-0 bg-transparent cursor-pointer p-0"
                />
              </label>
            </div>

            {/* Paragraph Alignment & Lists */}
            <div className="flex items-center gap-0.5 border-r border-[#3d3d3d] pr-2.5">
              <button onClick={() => execCmd("justifyLeft")} className="w-7 h-7 hover:bg-[#383838] rounded text-slate-300" title="Align Left">⬅</button>
              <button onClick={() => execCmd("justifyCenter")} className="w-7 h-7 hover:bg-[#383838] rounded text-slate-300" title="Align Center">↔</button>
              <button onClick={() => execCmd("justifyRight")} className="w-7 h-7 hover:bg-[#383838] rounded text-slate-300" title="Align Right">➡</button>
              <button onClick={() => execCmd("justifyFull")} className="w-7 h-7 hover:bg-[#383838] rounded text-slate-300" title="Justify">☰</button>
              <button onClick={() => execCmd("insertUnorderedList")} className="px-1.5 h-7 hover:bg-[#383838] rounded text-xs text-slate-300" title="Bullets">• List</button>
              <button onClick={() => execCmd("insertOrderedList")} className="px-1.5 h-7 hover:bg-[#383838] rounded text-xs text-slate-300" title="Numbering">1. List</button>
              <button onClick={() => execCmd("outdent")} className="p-1 hover:bg-[#383838] rounded text-slate-300" title="Decrease Indent">⇤</button>
              <button onClick={() => execCmd("indent")} className="p-1 hover:bg-[#383838] rounded text-slate-300" title="Increase Indent">⇥</button>
            </div>

            {/* Word 365 Style Cards (Normal, No Spacing, Heading 1, Heading 2) */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => execCmd("formatBlock", "p")}
                className="bg-[#383838] hover:bg-[#404040] border border-[#484848] rounded px-3 py-1 flex flex-col items-center shadow-xs"
              >
                <span className="font-semibold text-slate-200">Normal</span>
                <span className="text-[9px] text-slate-400">Regular text</span>
              </button>
              <button
                onClick={() => execCmd("formatBlock", "h1")}
                className="bg-[#383838] hover:bg-[#404040] border border-[#484848] rounded px-3 py-1 flex flex-col items-center shadow-xs text-blue-400"
              >
                <span className="font-bold text-sm">Heading 1</span>
                <span className="text-[9px] text-slate-400">Title style</span>
              </button>
              <button
                onClick={() => execCmd("formatBlock", "h2")}
                className="bg-[#383838] hover:bg-[#404040] border border-[#484848] rounded px-3 py-1 flex flex-col items-center shadow-xs text-indigo-300"
              >
                <span className="font-semibold">Heading 2</span>
                <span className="text-[9px] text-slate-400">Section style</span>
              </button>
              <button
                onClick={() => setShowFindModal(true)}
                className="px-2.5 py-2 hover:bg-[#383838] rounded text-slate-300 flex items-center gap-1 ml-1"
                title="Find & Replace"
              >
                <Search className="w-3.5 h-3.5" /> Find &amp; Replace
              </button>
            </div>
          </div>
        )}

        {/* --- INSERT TAB --- */}
        {activeTab === "insert" && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Table */}
            <button
              onClick={insertTable}
              className="px-3 py-1.5 rounded bg-[#383838] hover:bg-[#444] border border-[#484848] flex items-center gap-1.5 text-slate-200 font-semibold"
            >
              <span>▦</span> Table
            </button>

            {/* Pictures */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="px-3 py-1.5 rounded bg-[#383838] hover:bg-[#444] border border-[#484848] flex items-center gap-1.5 text-slate-200 font-semibold"
            >
              <span>🖼️</span> Pictures
            </button>

            {/* WordArt Button */}
            <button
              onClick={() => setShowWordArtModal(true)}
              className="px-3 py-1.5 rounded bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-xs"
            >
              <span>✨</span> WordArt
            </button>

            {/* Header & Footer Toggle */}
            <button
              onClick={() => setShowHeaderFooter(!showHeaderFooter)}
              className={`px-3 py-1.5 rounded border flex items-center gap-1.5 font-semibold transition-colors ${
                showHeaderFooter 
                  ? "bg-[#185abd] text-white border-blue-400" 
                  : "bg-[#383838] hover:bg-[#444] border-[#484848] text-slate-200"
              }`}
            >
              <span>📑</span> Header &amp; Footer
            </button>

            {/* Hyperlink */}
            <button
              onClick={() => {
                const url = prompt("Enter hyperlink URL:");
                if (url) execCmd("createLink", url);
              }}
              className="px-3 py-1.5 rounded bg-[#383838] hover:bg-[#444] border border-[#484848] flex items-center gap-1.5 text-slate-200"
            >
              <span>🔗</span> Link
            </button>

            {/* Page Break */}
            <button
              onClick={() => execCmd("insertHTML", '<div style="page-break-after: always; border-bottom: 2px dashed #94a3b8; margin: 24px 0; color: #94a3b8; font-size: 11px; text-align: center;">--- Page Break ---</div>')}
              className="px-3 py-1.5 rounded bg-[#383838] hover:bg-[#444] border border-[#484848] flex items-center gap-1.5 text-slate-200"
            >
              <span>📄</span> Page Break
            </button>

            {/* Date & Time */}
            <button
              onClick={() => {
                const now = new Date().toLocaleDateString(undefined, { dateStyle: "long" });
                execCmd("insertText", now);
              }}
              className="px-3 py-1.5 rounded bg-[#383838] hover:bg-[#444] border border-[#484848] flex items-center gap-1.5 text-slate-200"
            >
              <span>📅</span> Date &amp; Time
            </button>
          </div>
        )}

        {/* --- DESIGN TAB (Themes, Watermarks, Page Color & Borders) --- */}
        {activeTab === "design" && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Watermark Selector */}
            <div className="relative">
              <button
                onClick={() => setShowWatermarkModal(!showWatermarkModal)}
                className="px-3 py-1.5 rounded bg-[#383838] hover:bg-[#444] border border-[#484848] text-slate-200 flex items-center gap-1.5 font-semibold"
              >
                <span>🏷️</span> Watermark: <strong className="text-amber-400">{watermark || "None"}</strong>
              </button>

              {showWatermarkModal && (
                <div className="absolute left-0 top-full mt-2 w-48 bg-[#2d2d2d] border border-[#444] rounded-lg shadow-xl p-2 z-50">
                  {["None", "CONFIDENTIAL", "DRAFT", "DO NOT COPY", "SAMPLE", "URGENT"].map((w) => (
                    <button
                      key={w}
                      onClick={() => {
                        setWatermark(w === "None" ? null : w);
                        setShowWatermarkModal(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded hover:bg-[#3d3d3d] text-slate-200 font-medium"
                    >
                      {w}
                    </button>
                  ))}
                  <div className="border-t border-[#444] pt-1 mt-1">
                    <button
                      onClick={() => {
                        const custom = prompt("Enter custom watermark text:");
                        if (custom) setWatermark(custom);
                        setShowWatermarkModal(false);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded hover:bg-[#3d3d3d] text-blue-400 font-medium"
                    >
                      Custom Text...
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Page Color Picker */}
            <div className="flex items-center gap-2 bg-[#383838] px-2.5 py-1 rounded border border-[#484848]">
              <span className="text-slate-300 font-medium">Page Color:</span>
              <input
                type="color"
                value={pageColor}
                onChange={(e) => setPageColor(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
                title="Choose Page Color"
              />
              <button onClick={() => setPageColor("#ffffff")} className="text-[10px] text-slate-400 hover:text-white underline">
                Reset White
              </button>
              <button onClick={() => setPageColor("#fcfbf7")} className="text-[10px] text-amber-200 hover:underline">
                Ivory
              </button>
              <button onClick={() => setPageColor("#1e293b")} className="text-[10px] text-slate-300 hover:underline">
                Dark Mode
              </button>
            </div>

            {/* Page Borders */}
            <button
              onClick={() => setShowBorderModal(!showBorderModal)}
              className="px-3 py-1.5 rounded bg-[#383838] hover:bg-[#444] border border-[#484848] text-slate-200 flex items-center gap-1.5 font-semibold"
            >
              <span>🔲</span> Page Border: <strong className="capitalize text-blue-400">{pageBorder}</strong>
            </button>

            {showBorderModal && (
              <div className="absolute left-64 top-28 bg-[#2d2d2d] border border-[#444] rounded-lg shadow-xl p-3 z-50 space-y-2">
                <span className="text-slate-300 font-bold block mb-1">Select Border Style:</span>
                <div className="grid grid-cols-2 gap-2">
                  {(["none", "solid", "double", "dashed"] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() => setPageBorder(b)}
                      className={`px-3 py-1 rounded capitalize text-xs ${pageBorder === b ? "bg-[#185abd] text-white" : "bg-[#383838] text-slate-300"}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-[#444]">
                  <span className="text-xs text-slate-400">Color:</span>
                  <input
                    type="color"
                    value={pageBorderColor}
                    onChange={(e) => setPageBorderColor(e.target.value)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs text-slate-400 ml-2">Width:</span>
                  <select
                    value={pageBorderWidth}
                    onChange={(e) => setPageBorderWidth(e.target.value)}
                    className="bg-[#383838] border border-[#444] text-xs text-slate-200 rounded px-1"
                  >
                    <option value="1px">1 pt</option>
                    <option value="2px">2 pt</option>
                    <option value="4px">4 pt</option>
                    <option value="6px">6 pt</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- LAYOUT TAB (Margins, Orientation, Columns, Spacing) --- */}
        {activeTab === "layout" && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Margins */}
            <div className="flex items-center gap-1 bg-[#383838] px-2.5 py-1 rounded border border-[#484848]">
              <span className="text-slate-400">Margins:</span>
              {(["normal", "narrow", "wide"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMargins(m)}
                  className={`px-2 py-0.5 rounded capitalize ${margins === m ? "bg-[#185abd] text-white font-bold" : "hover:bg-[#444] text-slate-300"}`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Orientation */}
            <div className="flex items-center gap-1 bg-[#383838] px-2.5 py-1 rounded border border-[#484848]">
              <span className="text-slate-400">Orientation:</span>
              <button
                onClick={() => setOrientation("portrait")}
                className={`px-2 py-0.5 rounded ${orientation === "portrait" ? "bg-[#185abd] text-white font-bold" : "hover:bg-[#444] text-slate-300"}`}
              >
                Portrait
              </button>
              <button
                onClick={() => setOrientation("landscape")}
                className={`px-2 py-0.5 rounded ${orientation === "landscape" ? "bg-[#185abd] text-white font-bold" : "hover:bg-[#444] text-slate-300"}`}
              >
                Landscape
              </button>
            </div>

            {/* Columns (1, 2, 3) */}
            <div className="flex items-center gap-1 bg-[#383838] px-2.5 py-1 rounded border border-[#484848]">
              <span className="text-slate-400">Columns:</span>
              {[1, 2, 3].map((col) => (
                <button
                  key={col}
                  onClick={() => setColumns(col as 1 | 2 | 3)}
                  className={`px-2 py-0.5 rounded ${columns === col ? "bg-[#185abd] text-white font-bold" : "hover:bg-[#444] text-slate-300"}`}
                >
                  {col === 1 ? "One" : col === 2 ? "Two" : "Three"}
                </button>
              ))}
            </div>

            {/* Line Spacing */}
            <div className="flex items-center gap-1 bg-[#383838] px-2.5 py-1 rounded border border-[#484848]">
              <span className="text-slate-400">Spacing:</span>
              {["1.2", "1.6", "2.0"].map((s) => (
                <button
                  key={s}
                  onClick={() => setLineSpacing(s)}
                  className={`px-2 py-0.5 rounded ${lineSpacing === s ? "bg-[#185abd] text-white font-bold" : "hover:bg-[#444] text-slate-300"}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- VIEW TAB --- */}
        {activeTab === "view" && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Zoom Slider */}
            <div className="flex items-center gap-2 bg-[#383838] px-2.5 py-1 rounded border border-[#484848]">
              <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="range"
                min="50"
                max="180"
                step="5"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-24 accent-[#185abd]"
              />
              <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold w-10 text-center">{zoom}%</span>
              <button onClick={() => setZoom(100)} className="text-[10px] text-blue-400 hover:underline">100%</button>
            </div>

            {/* Ruler Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer bg-[#383838] px-2.5 py-1 rounded border border-[#484848] text-slate-300">
              <input
                type="checkbox"
                checked={showRuler}
                onChange={(e) => setShowRuler(e.target.checked)}
                className="rounded accent-[#185abd]"
              />
              <span>Ruler</span>
            </label>

            {/* Fullscreen */}
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen();
                } else {
                  document.exitFullscreen();
                }
              }}
              className="px-2.5 py-1 rounded bg-[#383838] hover:bg-[#444] text-slate-200 border border-[#484848] flex items-center gap-1"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
            </button>
          </div>
        )}
      </div>

      {/* 4. Optional Top Ruler */}
      {showRuler && (
        <div className="bg-[#242424] border-b border-[#333] h-4 flex items-center justify-center overflow-hidden text-[9px] text-slate-400 select-none">
          <div className="w-[816px] flex justify-between px-8 border-x border-[#3d3d3d]">
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

      {/* 5. Document Stage (Authentic Centered Canvas Sheet) */}
      <div className="flex-1 overflow-auto p-4 sm:p-10 flex justify-center items-start bg-[#121212] relative">
        
        {/* Document Sheet Container */}
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease",
            width: orientation === "portrait" ? "816px" : "1056px",
            minHeight: orientation === "portrait" ? "1056px" : "816px",
            backgroundColor: pageColor,
            borderStyle: pageBorder,
            borderColor: pageBorderColor,
            borderWidth: pageBorder !== "none" ? pageBorderWidth : "0px",
            color: pageColor === "#1e293b" ? "#f8fafc" : "#1f2937",
          }}
          className={`shadow-2xl rounded-xs border relative flex flex-col ${getPaddingClass()}`}
        >
          {/* Watermark Overlay (if active) */}
          {watermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 overflow-hidden">
              <span className="text-7xl sm:text-8xl font-black uppercase text-slate-400/20 transform -rotate-45 tracking-widest text-center">
                {watermark}
              </span>
            </div>
          )}

          {/* Header Area (Optional) */}
          {showHeaderFooter && (
            <div className="border-b border-dashed border-slate-300 pb-2 mb-4 text-xs text-slate-500 flex justify-between items-center z-20">
              <input
                type="text"
                placeholder="[Header: Click to add document header...]"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-xs text-slate-500 italic"
              />
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Header</span>
            </div>
          )}

          {/* Editable Document Body */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={updateCounts}
            style={{
              fontFamily: fontFamily,
              lineHeight: lineSpacing,
              columnCount: columns,
              columnGap: "32px",
            }}
            className="flex-1 outline-none text-base cursor-text selection:bg-blue-200 selection:text-slate-900 z-20 min-h-[600px]"
          >
            <h1 style={{ fontSize: "24pt", fontWeight: "bold", color: "#185abd", marginBottom: "12pt" }}>
              Welcome to Modern Word 365
            </h1>
            <p style={{ marginBottom: "10pt" }}>
              This is a full-featured online Microsoft Word editor inspired by the latest Office 365 release.
            </p>
            <h2 style={{ fontSize: "16pt", fontWeight: "bold", color: "#1e40af", marginTop: "14pt", marginBottom: "8pt" }}>
              Explore the Tabs:
            </h2>
            <ul style={{ paddingLeft: "24px", marginBottom: "12pt" }}>
              <li style={{ marginBottom: "4pt" }}><strong>Home:</strong> Fonts, Aptos typeface, styles gallery, alignments, find &amp; replace.</li>
              <li style={{ marginBottom: "4pt" }}><strong>Insert:</strong> Tables, local pictures, WordArt styles, header/footer, and page breaks.</li>
              <li style={{ marginBottom: "4pt" }}><strong>Design:</strong> Watermarks (DRAFT, CONFIDENTIAL), page background colors, and border styles.</li>
              <li style={{ marginBottom: "4pt" }}><strong>Layout:</strong> Margins, Orientation (Portrait / Landscape), multi-columns (1, 2, or 3).</li>
            </ul>
            <p>
              Start typing your document or replace this text with your own!
            </p>
          </div>

          {/* Footer Area (Optional) */}
          {showHeaderFooter && (
            <div className="border-t border-dashed border-slate-300 pt-2 mt-4 text-xs text-slate-500 flex justify-between items-center z-20">
              <input
                type="text"
                placeholder="[Footer: Click to add footer text...]"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-xs text-slate-500 italic"
              />
              <span className="text-[10px] text-slate-400">Page 1 of 1</span>
            </div>
          )}
        </div>
      </div>

      {/* 6. Office Bottom Status Bar */}
      <footer className="bg-[#1f1f1f] border-t border-[#2d2d2d] text-slate-400 px-4 py-1 text-xs flex items-center justify-between select-none">
        <div className="flex items-center gap-4">
          <span className="text-slate-300">Page 1 of 1</span>
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
          <span className="hidden sm:inline">English (United States)</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setZoom(Math.max(50, zoom - 10))} className="hover:text-white px-1 font-bold">-</button>
          <span className="w-10 text-center font-semibold text-slate-300">{zoom}%</span>
          <button onClick={() => setZoom(Math.min(180, zoom + 10))} className="hover:text-white px-1 font-bold">+</button>
        </div>
      </footer>

      {/* MODAL: WordArt Selector */}
      {showWordArtModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#2b2b2b] border border-[#3d3d3d] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3d3d3d] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>✨</span> WordArt Gallery
              </h3>
              <button onClick={() => setShowWordArtModal(false)} className="text-slate-400 hover:text-white text-lg">✕</button>
            </div>
            <p className="text-xs text-slate-400">Select a WordArt style preset to insert into your document:</p>
            <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
              {wordArtPresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => insertWordArt(preset)}
                  className="p-4 rounded-xl bg-[#333] hover:bg-[#383838] border border-[#444] text-center flex flex-col items-center justify-center transition-all hover:scale-105"
                >
                  <span style={{ fontSize: "16pt", fontWeight: 900 }} className="mb-2">Sample</span>
                  <span className="text-[11px] text-slate-400 font-semibold">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Find & Replace */}
      {showFindModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-[#2b2b2b] border border-[#3d3d3d] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#3d3d3d] pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Search className="w-4 h-4 text-blue-400" /> Find &amp; Replace
              </h3>
              <button onClick={() => setShowFindModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Find what:</label>
                <input
                  type="text"
                  value={findQuery}
                  onChange={(e) => setFindQuery(e.target.value)}
                  placeholder="Text to find..."
                  className="w-full bg-[#383838] border border-[#484848] rounded px-3 py-1.5 text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Replace with:</label>
                <input
                  type="text"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                  placeholder="Replacement text..."
                  className="w-full bg-[#383838] border border-[#484848] rounded px-3 py-1.5 text-slate-100 outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#3d3d3d]">
              <button
                onClick={() => setShowFindModal(false)}
                className="px-3 py-1.5 rounded bg-[#383838] hover:bg-[#444] text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleFindReplace}
                className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
              >
                Replace All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
