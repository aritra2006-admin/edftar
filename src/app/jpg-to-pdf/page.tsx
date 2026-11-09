"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import { imagesToPDF, downloadFile } from "@/lib/pdf-utils";
import confetti from "canvas-confetti";
import { 
  Image as ImageIcon, 
  Download, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Sparkles, 
  Loader2 
} from "@/components/Icons";

interface ImageItem {
  file: File;
  previewUrl: string;
}

export default function JpgToPdfPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | "auto">("auto");
  const [pageSize, setPageSize] = useState<"fit" | "a4" | "letter">("fit");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  const handleFiles = (files: File[]) => {
    const valid = files.filter(
      (f) =>
        f.type.startsWith("image/") ||
        f.name.toLowerCase().endsWith(".jpg") ||
        f.name.toLowerCase().endsWith(".jpeg") ||
        f.name.toLowerCase().endsWith(".png")
    );

    const items: ImageItem[] = valid.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...items]);
    setPdfBytes(null);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  };

  const moveLeft = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  };

  const moveRight = (index: number) => {
    if (index === images.length - 1) return;
    setImages((prev) => {
      const copy = [...prev];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  };

  const handleConvert = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      const result = await imagesToPDF(
        images.map((img) => img.file),
        { orientation, pageSize, margin: 20 }
      );
      setPdfBytes(result);
      downloadFile(result, "edftar_images.pdf");
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    } catch (err) {
      console.error("Failed to convert images to PDF:", err);
      alert("Failed to convert images. Please make sure they are standard JPEG or PNG files.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-200">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Image to PDF Converter</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Convert JPG & PNG Images to PDF
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Turn your photos and scans into a single organized, high-resolution PDF document.
        </p>
      </div>

      {images.length === 0 ? (
        <Dropzone
          accept="image/jpeg,image/png,image/webp"
          title="Select image files"
          subtitle="or drop JPG or PNG photos here"
          buttonText="Select Images"
          onFilesSelected={handleFiles}
        />
      ) : (
        <div className="space-y-6">
          {/* Options & Header Bar */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
            <div className="flex items-center gap-4">
              <span className="font-bold text-slate-900 text-sm">
                Images ({images.length})
              </span>
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition">
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Images</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(Array.from(e.target.files));
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {/* Layout Options */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Orientation:</span>
                <select
                  value={orientation}
                  onChange={(e: any) => setOrientation(e.target.value)}
                  className="p-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="auto">Auto (Match Image)</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Page Size:</span>
                <select
                  value={pageSize}
                  onChange={(e: any) => setPageSize(e.target.value)}
                  className="p-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="fit">Fit to Image Size</option>
                  <option value="a4">Standard A4</option>
                  <option value="letter">US Letter</option>
                </select>
              </div>
            </div>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img, idx) => (
              <div
                key={`${img.file.name}-${idx}`}
                className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center gap-2"
              >
                <div className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center relative">
                  <img
                    src={img.previewUrl}
                    alt={img.file.name}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-slate-900/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur">
                    #{idx + 1}
                  </span>
                </div>

                <div className="w-full flex items-center justify-between text-xs px-1">
                  <div className="truncate text-slate-600 text-[11px] font-medium max-w-[80px]">
                    {img.file.name}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveLeft(idx)}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move earlier"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => moveRight(idx)}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move later"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Ready to convert {images.length} image{images.length > 1 ? "s" : ""} to PDF
              </p>
              <p className="text-xs text-slate-400">
                Output: <span className="font-semibold text-slate-600">edftar_images.pdf</span>
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {pdfBytes ? (
                <button
                  type="button"
                  onClick={() => downloadFile(pdfBytes, "edftar_images.pdf")}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Converted PDF
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleConvert}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating PDF...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Convert to PDF Now
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
