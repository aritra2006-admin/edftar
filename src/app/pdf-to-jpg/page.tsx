"use client";

import { useState } from "react";
import Dropzone from "@/components/Dropzone";
import { pdfToImages, downloadFile } from "@/lib/pdf-utils";
import JSZip from "jszip";
import confetti from "canvas-confetti";
import { 
  FileImage, 
  Download, 
  Sparkles, 
  Loader2, 
  Archive, 
  FileText 
} from "@/components/Icons";

interface ExtractedImage {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
}

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<"standard" | "high">("high");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedImages, setExtractedImages] = useState<ExtractedImage[]>([]);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  const handleFiles = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setExtractedImages([]);
      setZipBlob(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setIsProcessing(true);
    try {
      const dpiScale = quality === "high" ? 2.0 : 1.25;
      const results = await pdfToImages(file, 0.92, dpiScale);
      setExtractedImages(results);

      // Create ZIP bundle
      const zip = new JSZip();
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      results.forEach((img) => {
        zip.file(`${baseName}_page_${img.pageNumber}.jpg`, img.blob);
      });
      const generatedZip = await zip.generateAsync({ type: "blob" });
      setZipBlob(generatedZip);

      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      downloadFile(generatedZip, `${baseName}_images.zip`, "application/zip");
    } catch (err) {
      console.error("Failed to extract images from PDF:", err);
      alert("Failed to convert PDF pages to images. Please ensure the document is not encrypted.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-cyan-600 text-xs font-bold border border-cyan-200">
          <FileImage className="w-3.5 h-3.5" />
          <span>PDF to JPG Converter</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Convert PDF Pages to JPG Images
        </h1>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Extract every page of your PDF into crisp, high-resolution JPEG images.
        </p>
      </div>

      {!file ? (
        <Dropzone
          title="Select PDF file"
          subtitle="or drop a PDF file here to extract images"
          buttonText="Select PDF file"
          multiple={false}
          onFilesSelected={handleFiles}
        />
      ) : (
        <div className="space-y-6">
          {/* File Selected Card */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Resolution:</span>
                <select
                  value={quality}
                  onChange={(e: any) => setQuality(e.target.value)}
                  className="p-2 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="high">High Resolution (300 DPI equivalent)</option>
                  <option value="standard">Standard (Web optimized)</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setFile(null);
                  setExtractedImages([]);
                  setZipBlob(null);
                }}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50"
              >
                Change
              </button>
            </div>
          </div>

          {/* Extracted Images Preview */}
          {extractedImages.length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {extractedImages.map((img) => (
                  <div
                    key={img.pageNumber}
                    className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center gap-2"
                  >
                    <div className="w-full aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                      <img
                        src={img.dataUrl}
                        alt={`Page ${img.pageNumber}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="w-full flex items-center justify-between text-xs px-1">
                      <span className="font-bold text-slate-700">Page {img.pageNumber}</span>
                      <button
                        type="button"
                        onClick={() =>
                          downloadFile(img.blob, `page_${img.pageNumber}.jpg`, "image/jpeg")
                        }
                        className="text-cyan-600 hover:underline font-semibold"
                      >
                        Download JPG
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-white rounded-3xl border border-slate-200 flex justify-between items-center shadow-xs">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Extracted {extractedImages.length} images successfully
                  </p>
                  <p className="text-xs text-slate-400">All images are saved in a single .ZIP archive.</p>
                </div>

                {zipBlob && (
                  <button
                    type="button"
                    onClick={() =>
                      downloadFile(zipBlob, `${file.name.replace(/\.[^/.]+$/, "")}_images.zip`, "application/zip")
                    }
                    className="px-6 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm shadow-md shadow-cyan-600/25 transition-all flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download All Images (.ZIP)
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Action Button */
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConvert}
                className="px-8 py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm shadow-md shadow-cyan-600/25 transition-all flex items-center gap-2 disabled:opacity-75"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting Pages to Images...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Convert PDF to JPG Now
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
