"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Plus } from "@/components/Icons";

interface DropzoneProps {
  accept?: string;
  multiple?: boolean;
  title?: string;
  subtitle?: string;
  buttonText?: string;
  onFilesSelected: (files: File[]) => void;
}

export default function Dropzone({
  accept = "application/pdf",
  multiple = true,
  title = "Select PDF files",
  subtitle = "or drop PDFs here",
  buttonText = "Select PDF files",
  onFilesSelected,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected(droppedFiles);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      onFilesSelected(selected);
      // Reset input value so re-selecting same file triggers change
      e.target.value = "";
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative w-full rounded-3xl border-2 border-dashed p-10 sm:p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
        isDragging
          ? "border-brand-500 bg-brand-50/50 scale-[1.01]"
          : "border-slate-300 hover:border-brand-400 bg-white hover:bg-slate-50/70 shadow-sm"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="w-20 h-20 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-6 shadow-sm shadow-brand-500/10">
        <UploadCloud className="w-10 h-10 stroke-[1.75]" />
      </div>

      <button
        type="button"
        className="px-8 py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-base shadow-lg shadow-brand-600/30 hover:shadow-brand-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 mb-3"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
        {buttonText}
      </button>

      <p className="text-sm font-medium text-slate-500">
        {subtitle}
      </p>

      <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>Runs 100% locally in your browser. Maximum privacy.</span>
      </div>
    </div>
  );
}
