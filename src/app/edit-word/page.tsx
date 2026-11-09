"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { 
  FileText, 
  FileWord, 
  Download, 
  Loader2, 
  Check, 
  Plus, 
  UploadCloud, 
  Archive 
} from "@/components/Icons";

export default function DocumentEditorPage() {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docTitle, setDocTitle] = useState("Untitled Document");
  const [status, setStatus] = useState<"idle" | "loading" | "exporting">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [saved, setSaved] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Load saved document from localStorage on mount
  useEffect(() => {
    const savedContent = localStorage.getItem("edftar-doc-content");
    const savedTitle = localStorage.getItem("edftar-doc-title");
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
    localStorage.setItem("edftar-doc-content", editorRef.current.innerHTML);
    localStorage.setItem("edftar-doc-title", docTitle);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [docTitle]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (editorRef.current) {
        localStorage.setItem("edftar-doc-content", editorRef.current.innerHTML);
        localStorage.setItem("edftar-doc-title", docTitle);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [docTitle]);

  const newDocument = () => {
    if (window.confirm("Start a new document? Any unsaved edits will be cleared.")) {
      if (editorRef.current) {
        editorRef.current.innerHTML = `
          <h1>Untitled Document</h1>
          <p>Start typing your content here...</p>
        `;
      }
      setDocTitle("Untitled Document");
      localStorage.removeItem("edftar-doc-content");
      localStorage.removeItem("edftar-doc-title");
      updateCounts();
    }
  };

  // Import existing .docx file
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
      localStorage.setItem("edftar-doc-content", result.value);
      localStorage.setItem("edftar-doc-title", title);
      updateCounts();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Failed to read the Word file. Please verify it is a valid .docx file.");
    } finally {
      setStatus("idle");
      setStatusMsg("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Export as PDF via styled browser print preview
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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 12pt;
      line-height: 1.7;
      color: #1a1a1a;
      background: #fff;
      padding: 2.54cm;
      max-width: 21cm;
      margin: 0 auto;
    }
    h1 { font-size: 22pt; font-weight: 700; margin: 18pt 0 10pt; color: #111; }
    h2 { font-size: 17pt; font-weight: 600; margin: 14pt 0 8pt; color: #222; }
    h3 { font-size: 13pt; font-weight: 600; margin: 12pt 0 6pt; color: #333; }
    p { margin: 6pt 0; }
    ul, ol { padding-left: 24pt; margin: 6pt 0; }
    li { margin: 3pt 0; }
    blockquote {
      border-left: 3pt solid #cbd5e1;
      padding-left: 12pt;
      color: #475569;
      margin: 8pt 0;
      font-style: italic;
    }
    table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
    td, th { border: 1px solid #cbd5e1; padding: 6pt 8pt; }
    th { background: #f1f5f9; font-weight: 600; }
    img { max-width: 100%; height: auto; margin: 8pt 0; border-radius: 4px; }
    a { color: #2563eb; text-decoration: underline; }
    @media print {
      body { padding: 0; }
      @page { margin: 2.54cm; size: A4; }
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
  };

  // Export as Word .docx
  const exportAsDocx = async () => {
    if (!editorRef.current) return;
    setStatus("exporting");
    setStatusMsg("Generating .docx file...");

    try {
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = editorRef.current.innerHTML;
      const blocks = tempDiv.querySelectorAll("p, h1, h2, h3, div, li, blockquote");

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
              children: [new TextRun({ text, bold: true, size: 44 })],
            }));
          } else if (tag === "h2") {
            docParagraphs.push(new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun({ text, bold: true, size: 34 })],
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
      a.download = `${docTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "document"}.docx`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error(err);
      alert("Failed to export Word document.");
    } finally {
      setStatus("idle");
      setStatusMsg("");
    }
  };

  const exportAsHtml = () => {
    if (!editorRef.current) return;
    const blob = new Blob([editorRef.current.innerHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "document"}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const exportAsTxt = () => {
    if (!editorRef.current) return;
    const blob = new Blob([editorRef.current.innerText || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docTitle.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "document"}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3 flex-1 min-w-[240px]">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <FileWord className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="text-lg font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none px-1 py-0.5 w-full transition-all"
              placeholder="Document title..."
            />
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{charCount} characters</span>
              {saved && (
                <span className="text-emerald-600 font-semibold flex items-center gap-1 ml-2">
                  <Check className="w-3 h-3" /> Saved locally
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden input for opening Word documents */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx"
            className="hidden"
            onChange={handleOpenDocx}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={status !== "idle"}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
            title="Import an existing .docx Word file"
          >
            <UploadCloud className="w-4 h-4 text-blue-600" />
            Open .docx
          </button>

          <button
            onClick={newDocument}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New
          </button>

          <button
            onClick={saveToLocal}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
          >
            💾 Save
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={status !== "idle"}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-sm shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              {status === "exporting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export / Download
                </>
              )}
            </button>

            {showExportMenu && (
              <div 
                className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 divide-y divide-slate-100"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                <div className="py-1">
                  <button 
                    onClick={() => { exportAsDocx(); setShowExportMenu(false); }} 
                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center gap-2.5 font-medium transition-colors"
                  >
                    <FileWord className="w-4 h-4 text-blue-600" />
                    Word Document (.docx)
                  </button>
                  <button 
                    onClick={() => { exportAsPdf(); setShowExportMenu(false); }} 
                    className="w-full px-4 py-2 text-left text-sm hover:bg-rose-50 text-slate-700 hover:text-rose-600 flex items-center gap-2.5 font-medium transition-colors"
                  >
                    <FileText className="w-4 h-4 text-rose-600" />
                    PDF Document (.pdf)
                  </button>
                </div>
                <div className="py-1">
                  <button 
                    onClick={() => { exportAsHtml(); setShowExportMenu(false); }} 
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 font-medium transition-colors"
                  >
                    🌐 Webpage (.html)
                  </button>
                  <button 
                    onClick={() => { exportAsTxt(); setShowExportMenu(false); }} 
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2.5 font-medium transition-colors"
                  >
                    📃 Plain Text (.txt)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className="flex items-center gap-2 p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 text-sm">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Editor Toolbar */}
      <div className="sticky top-20 z-30 bg-white/95 backdrop-blur border border-slate-200 rounded-2xl shadow-sm p-2 flex flex-wrap items-center gap-1 text-slate-700">
        {/* Paragraph style */}
        <select
          onChange={(e) => execCmd("formatBlock", e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          defaultValue="p"
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
        </select>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Font size */}
        <select
          onChange={(e) => execCmd("fontSize", e.target.value)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          defaultValue="3"
        >
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="7">Huge</option>
        </select>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Formatting buttons */}
        <button
          onClick={() => execCmd("bold")}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center font-bold text-sm"
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          onClick={() => execCmd("italic")}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center italic font-serif text-sm"
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          onClick={() => execCmd("underline")}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center underline text-sm"
          title="Underline (Ctrl+U)"
        >
          U
        </button>
        <button
          onClick={() => execCmd("strikeThrough")}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center line-through text-sm"
          title="Strikethrough"
        >
          S
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Color pickers */}
        <label className="h-8 px-2 rounded-lg hover:bg-slate-100 flex items-center gap-1 cursor-pointer text-xs font-semibold" title="Font Color">
          <span>A</span>
          <input
            type="color"
            className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
            onChange={(e) => execCmd("foreColor", e.target.value)}
            defaultValue="#0f172a"
          />
        </label>
        <label className="h-8 px-2 rounded-lg hover:bg-slate-100 flex items-center gap-1 cursor-pointer text-xs font-semibold" title="Highlight Color">
          <span>🖍️</span>
          <input
            type="color"
            className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
            onChange={(e) => execCmd("hiliteColor", e.target.value)}
            defaultValue="#fef08a"
          />
        </label>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Text align */}
        <button onClick={() => execCmd("justifyLeft")} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs" title="Align Left">
          ⬅
        </button>
        <button onClick={() => execCmd("justifyCenter")} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs" title="Align Center">
          ↔
        </button>
        <button onClick={() => execCmd("justifyRight")} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs" title="Align Right">
          ➡
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Lists */}
        <button onClick={() => execCmd("insertUnorderedList")} className="px-2.5 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs font-medium" title="Bullet List">
          • List
        </button>
        <button onClick={() => execCmd("insertOrderedList")} className="px-2.5 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs font-medium" title="Numbered List">
          1. List
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Inserts */}
        <button 
          onClick={() => { const url = prompt("Enter hyperlink URL (e.g. https://google.com):"); if (url) execCmd("createLink", url); }} 
          className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs" 
          title="Insert Link"
        >
          🔗
        </button>
        <button onClick={insertImage} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs" title="Insert Image">
          🖼️
        </button>
        <button onClick={() => execCmd("insertHorizontalRule")} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs font-bold" title="Insert Horizontal Rule">
          —
        </button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Undo / Redo */}
        <button onClick={() => execCmd("undo")} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs" title="Undo (Ctrl+Z)">
          ↩
        </button>
        <button onClick={() => execCmd("redo")} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs" title="Redo (Ctrl+Y)">
          ↪
        </button>
        <button onClick={() => execCmd("removeFormat")} className="px-2 h-8 rounded-lg hover:bg-slate-100 text-xs font-medium text-slate-500" title="Clear Formatting">
          Clear Format
        </button>
      </div>

      {/* Document Sheet Canvas */}
      <div className="bg-slate-100/80 p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-inner flex justify-center min-h-[750px]">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={updateCounts}
          onClick={() => setShowExportMenu(false)}
          className="w-full max-w-[850px] min-h-[700px] bg-white rounded-2xl shadow-lg border border-slate-200/80 p-8 sm:p-14 outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 text-base leading-relaxed"
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}
        >
          <h1>Welcome to Edftar Online Word &amp; Document Editor</h1>
          <p>
            You can now create, open, and edit Word documents completely free and <strong>100% in your browser</strong>.
          </p>
          <h2>Key Features</h2>
          <ul>
            <li><strong>Open Word Files:</strong> Click &quot;Open .docx&quot; above to load any existing Word document.</li>
            <li><strong>Rich Text Formatting:</strong> Headings, fonts, bold, italic, underline, custom text colors, and highlights.</li>
            <li><strong>Insert Media:</strong> Add images, hyperlinks, bulleted/numbered lists, and divider rules.</li>
            <li><strong>Auto-Save:</strong> Content is securely preserved locally in your browser so you never lose progress.</li>
            <li><strong>Export Everywhere:</strong> Export as clean Word (.docx), print-ready PDF (.pdf), HTML, or text.</li>
          </ul>
          <p>
            Start typing above or replace this text with your own content!
          </p>
        </div>
      </div>
    </div>
  );
}
