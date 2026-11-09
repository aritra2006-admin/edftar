"use client";

import { useState, useCallback } from "react";
import { Image as ImageIcon, Download, Loader2, Check, UploadCloud, X, Trash2, Plus } from "@/components/Icons";
import JSZip from "jszip";

type Mode = "target" | "manual";
type SizeUnit = "KB" | "MB";

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  compressedBlob?: Blob;
  originalSize: number;
  compressedSize?: number;
}

export default function CompressImagePage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [status, setStatus] = useState<"idle" | "compressing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Mode
  const [mode, setMode] = useState<Mode>("target");

  // Target mode
  const [targetSize, setTargetSize] = useState<number>(200);
  const [targetUnit, setTargetUnit] = useState<SizeUnit>("KB");

  // Manual mode
  const [quality, setQuality] = useState(70);
  const [maxWidth, setMaxWidth] = useState(1920);

  const addFiles = useCallback((files: FileList) => {
    const newImages: ImageFile[] = [];
    Array.from(files).forEach((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      if (!["jpg", "jpeg", "png", "webp", "bmp"].includes(ext || "")) return;
      newImages.push({
        id: Math.random().toString(36).slice(2),
        file: f,
        preview: URL.createObjectURL(f),
        originalSize: f.size,
      });
    });
    if (newImages.length === 0) {
      setErrorMsg("Please upload image files (JPG, PNG, WebP, BMP).");
      setStatus("error");
      return;
    }
    setImages((prev) => [...prev, ...newImages]);
    setStatus("idle");
    setErrorMsg("");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeImage = (id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
    setStatus("idle");
  };

  const compressImage = async (
    file: File,
    targetBytes: number | null,
    manualQuality: number,
    manualMaxWidth: number
  ): Promise<Blob> => {
    const bitmap = await createImageBitmap(file);

    if (targetBytes !== null) {
      // Binary search for the right quality + dimensions
      let bestBlob: Blob | null = null;
      const scales = [1.0, 0.8, 0.6, 0.5, 0.4, 0.3];
      const qualities = [0.85, 0.7, 0.55, 0.4, 0.3, 0.2, 0.12, 0.08];

      for (const scale of scales) {
        for (const q of qualities) {
          const w = Math.round(bitmap.width * scale);
          const h = Math.round(bitmap.height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(bitmap, 0, 0, w, h);

          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed"))), "image/jpeg", q);
          });

          if (blob.size <= targetBytes) {
            // Find the best quality that still meets the target
            if (!bestBlob || blob.size > bestBlob.size) {
              bestBlob = blob;
            }
            break; // This scale works at this quality, no need to go lower quality
          }
          bestBlob = blob; // Keep as fallback
        }
        if (bestBlob && bestBlob.size <= targetBytes) break;
      }

      return bestBlob || new Blob([await file.arrayBuffer()], { type: file.type });
    } else {
      // Manual mode
      let w = bitmap.width;
      let h = bitmap.height;
      if (w > manualMaxWidth) {
        const ratio = manualMaxWidth / w;
        w = manualMaxWidth;
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, w, h);

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed"))), "image/jpeg", manualQuality / 100);
      });
    }
  };

  const compressAll = async () => {
    if (images.length === 0) return;
    setStatus("compressing");
    setErrorMsg("");

    try {
      const targetBytes = mode === "target" ? (targetUnit === "MB" ? targetSize * 1048576 : targetSize * 1024) : null;
      const compressed: ImageFile[] = [];

      for (const img of images) {
        const blob = await compressImage(img.file, targetBytes, quality, maxWidth);
        compressed.push({
          ...img,
          compressedBlob: blob,
          compressedSize: blob.size,
        });
      }

      setImages(compressed);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("Compression failed for one or more images.");
      setStatus("error");
    }
  };

  const downloadSingle = (img: ImageFile) => {
    if (!img.compressedBlob) return;
    const url = URL.createObjectURL(img.compressedBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = img.file.name.replace(/\.[^.]+$/, "") + "_compressed.jpg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const downloadAll = async () => {
    const compressedImages = images.filter((i) => i.compressedBlob);
    if (compressedImages.length === 0) return;

    if (compressedImages.length === 1) {
      downloadSingle(compressedImages[0]);
      return;
    }

    const zip = new JSZip();
    compressedImages.forEach((img) => {
      const name = img.file.name.replace(/\.[^.]+$/, "") + "_compressed.jpg";
      zip.file(name, img.compressedBlob!);
    });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compressed_images.zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  };

  const totalOriginal = images.reduce((sum, i) => sum + i.originalSize, 0);
  const totalCompressed = images.reduce((sum, i) => sum + (i.compressedSize || 0), 0);

  const reset = () => {
    images.forEach((i) => URL.revokeObjectURL(i.preview));
    setImages([]);
    setStatus("idle");
    setErrorMsg("");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md">
          <ImageIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Compress Images</h1>
          <p className="text-sm text-slate-500">Set a target file size or adjust quality manually</p>
        </div>
      </div>

      {/* Dropzone */}
      {images.length === 0 ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer ${
            dragOver ? "border-pink-500 bg-pink-50" : "border-slate-300 bg-slate-50 hover:border-pink-400 hover:bg-pink-50/50"
          }`}
          onClick={() => document.getElementById("img-compress-input")?.click()}
        >
          <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <p className="text-slate-700 font-semibold text-lg">Drop your images here</p>
          <p className="text-slate-500 text-sm mt-1">or click to browse • select multiple files</p>
          <p className="text-xs text-slate-400 mt-3">Supports JPG, PNG, WebP, BMP</p>
          <input
            id="img-compress-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mode toggle */}
          <div className="flex rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => { setMode("target"); setStatus("idle"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === "target" ? "bg-white text-pink-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              🎯 Target Size
            </button>
            <button
              onClick={() => { setMode("manual"); setStatus("idle"); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === "manual" ? "bg-white text-pink-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              ⚙️ Manual Quality
            </button>
          </div>

          {/* Target mode settings */}
          {mode === "target" && (
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
              <label className="text-sm font-semibold text-slate-700">Compress each image to under:</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  value={targetSize}
                  onChange={(e) => { setTargetSize(Math.max(1, Number(e.target.value))); setStatus("idle"); }}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-lg font-bold text-slate-900 focus:border-pink-500 focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                />
                <div className="flex rounded-xl border border-slate-300 overflow-hidden">
                  <button
                    onClick={() => { setTargetUnit("KB"); setStatus("idle"); }}
                    className={`px-4 py-3 text-sm font-bold transition-all ${
                      targetUnit === "KB" ? "bg-pink-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    KB
                  </button>
                  <button
                    onClick={() => { setTargetUnit("MB"); setStatus("idle"); }}
                    className={`px-4 py-3 text-sm font-bold transition-all ${
                      targetUnit === "MB" ? "bg-pink-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    MB
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Each image will be automatically adjusted to fit under {targetSize} {targetUnit}
              </p>
            </div>
          )}

          {/* Manual mode settings */}
          {mode === "manual" && (
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Quality: <span className="text-pink-600">{quality}%</span>
                </label>
                <input
                  type="range"
                  min={10}
                  max={95}
                  value={quality}
                  onChange={(e) => { setQuality(Number(e.target.value)); setStatus("idle"); }}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Smallest file</span>
                  <span>Best quality</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Max Width (px)</label>
                <div className="flex gap-2">
                  {[640, 1280, 1920, 3840].map((w) => (
                    <button
                      key={w}
                      onClick={() => { setMaxWidth(w); setStatus("idle"); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        maxWidth === w
                          ? "border-pink-500 bg-pink-50 text-pink-700"
                          : "border-slate-200 text-slate-600 hover:border-pink-300"
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Image list */}
          <div className="space-y-3">
            {images.map((img) => (
              <div key={img.id} className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <img
                  src={img.preview}
                  alt={img.file.name}
                  className="w-14 h-14 rounded-xl object-cover bg-slate-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{img.file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{formatSize(img.originalSize)}</span>
                    {img.compressedSize != null && (
                      <>
                        <span>→</span>
                        <span className="text-emerald-600 font-semibold">{formatSize(img.compressedSize)}</span>
                        <span className="text-orange-600 font-semibold">
                          (-{Math.round(((img.originalSize - img.compressedSize) / img.originalSize) * 100)}%)
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {img.compressedBlob && (
                  <button
                    onClick={() => downloadSingle(img)}
                    className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => removeImage(img.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Add more */}
            <button
              onClick={() => document.getElementById("img-compress-add")?.click()}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 text-sm font-semibold hover:border-pink-400 hover:text-pink-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add More Images
            </button>
            <input
              id="img-compress-add"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
            />
          </div>

          {/* Error */}
          {status === "error" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <Trash2 className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Summary */}
          {status === "done" && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                <Check className="w-4 h-4" />
                All {images.length} image{images.length > 1 ? "s" : ""} compressed!
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="text-slate-500 text-xs">Total Original</div>
                  <div className="font-bold text-slate-700">{formatSize(totalOriginal)}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Total Compressed</div>
                  <div className="font-bold text-emerald-700">{formatSize(totalCompressed)}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Total Saved</div>
                  <div className="font-bold text-orange-600">
                    {totalOriginal > 0 ? Math.round(((totalOriginal - totalCompressed) / totalOriginal) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {status === "done" ? (
              <>
                <button
                  onClick={downloadAll}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-md hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {images.length > 1 ? "Download All (ZIP)" : "Download"}
                </button>
                <button
                  onClick={reset}
                  className="py-3.5 px-6 rounded-2xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
                >
                  Reset
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={compressAll}
                  disabled={status === "compressing"}
                  className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold text-sm shadow-md shadow-pink-500/25 hover:opacity-90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  {status === "compressing" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Compressing…
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4" />
                      {mode === "target"
                        ? `Compress to under ${targetSize} ${targetUnit} each`
                        : `Compress ${images.length} Image${images.length > 1 ? "s" : ""}`}
                    </>
                  )}
                </button>
                <button
                  onClick={reset}
                  className="py-3.5 px-6 rounded-2xl border border-slate-300 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-all"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
