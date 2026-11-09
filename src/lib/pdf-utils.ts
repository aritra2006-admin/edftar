import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Download a Blob or Uint8Array to the user's computer
 */
export function downloadFile(data: Uint8Array | Blob, fileName: string, mimeType = 'application/pdf') {
  const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Merge multiple PDF files into a single PDF
 */
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const fileBytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(fileBytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Split a PDF into individual pages or specific ranges
 */
export async function splitPDF(
  file: File,
  mode: 'all' | 'range',
  ranges?: { from: number; to: number }[]
): Promise<{ name: string; bytes: Uint8Array }[]> {
  const fileBytes = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(fileBytes);
  const totalPages = srcPdf.getPageCount();
  const results: { name: string; bytes: Uint8Array }[] = [];

  const baseName = file.name.replace(/\.[^/.]+$/, '');

  if (mode === 'all') {
    for (let i = 0; i < totalPages; i++) {
      const subPdf = await PDFDocument.create();
      const [copiedPage] = await subPdf.copyPages(srcPdf, [i]);
      subPdf.addPage(copiedPage);
      const bytes = await subPdf.save();
      results.push({
        name: `${baseName}_page_${i + 1}.pdf`,
        bytes,
      });
    }
  } else if (ranges && ranges.length > 0) {
    let partIndex = 1;
    for (const r of ranges) {
      const start = Math.max(1, Math.min(r.from, totalPages));
      const end = Math.max(start, Math.min(r.to, totalPages));
      const pageIndices: number[] = [];
      for (let p = start; p <= end; p++) {
        pageIndices.push(p - 1);
      }

      const subPdf = await PDFDocument.create();
      const copiedPages = await subPdf.copyPages(srcPdf, pageIndices);
      copiedPages.forEach((page) => subPdf.addPage(page));
      const bytes = await subPdf.save();
      results.push({
        name: `${baseName}_range_${start}-${end}.pdf`,
        bytes,
      });
      partIndex++;
    }
  }

  return results;
}

/**
 * Rotate all or selected pages of a PDF
 */
export async function rotatePDF(
  file: File,
  rotations: Record<number, number> // pageIndex -> rotation in degrees (e.g. 90, 180, 270)
): Promise<Uint8Array> {
  const fileBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(fileBytes);
  const pages = pdfDoc.getPages();

  pages.forEach((page, index) => {
    const additionalRotation = rotations[index] || 0;
    if (additionalRotation !== 0) {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + additionalRotation) % 360));
    }
  });

  return await pdfDoc.save();
}

/**
 * Organize PDF: reorder pages, rotate individual pages, or delete pages
 */
export async function organizePDF(
  file: File,
  orderedPages: { originalIndex: number; rotation: number }[]
): Promise<Uint8Array> {
  const fileBytes = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(fileBytes);
  const newPdf = await PDFDocument.create();

  const originalIndices = orderedPages.map((p) => p.originalIndex);
  const copiedPages = await newPdf.copyPages(srcPdf, originalIndices);

  copiedPages.forEach((page, i) => {
    const rot = orderedPages[i].rotation || 0;
    if (rot !== 0) {
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + rot) % 360));
    }
    newPdf.addPage(page);
  });

  return await newPdf.save();
}

/**
 * Convert Image files (JPG, PNG, WebP) to a single PDF document
 */
export async function imagesToPDF(
  files: File[],
  options: {
    orientation?: 'portrait' | 'landscape' | 'auto';
    pageSize?: 'fit' | 'a4' | 'letter';
    margin?: number;
  } = {}
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const margin = options.margin ?? 20;

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');

    let embeddedImage;
    if (isPng) {
      embeddedImage = await pdfDoc.embedPng(arrayBuffer);
    } else {
      embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
    }

    const imgWidth = embeddedImage.width;
    const imgHeight = embeddedImage.height;

    let pageWidth: number;
    let pageHeight: number;

    if (options.pageSize === 'a4') {
      pageWidth = 595.28;
      pageHeight = 841.89;
    } else if (options.pageSize === 'letter') {
      pageWidth = 612.0;
      pageHeight = 792.0;
    } else {
      // 'fit' matches image aspect ratio plus margin
      pageWidth = imgWidth + margin * 2;
      pageHeight = imgHeight + margin * 2;
    }

    if (options.orientation === 'landscape' && pageWidth < pageHeight) {
      [pageWidth, pageHeight] = [pageHeight, pageWidth];
    } else if (options.orientation === 'portrait' && pageWidth > pageHeight) {
      [pageWidth, pageHeight] = [pageHeight, pageWidth];
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Calculate scaled dimensions to fit inside margin
    const maxWidth = pageWidth - margin * 2;
    const maxHeight = pageHeight - margin * 2;
    const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);

    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return await pdfDoc.save();
}

/**
 * Initialize PDF.js library dynamically in browser
 */
let pdfjsLibInstance: any = null;
export async function getPdfJs() {
  if (typeof window === 'undefined') return null;
  if (pdfjsLibInstance) return pdfjsLibInstance;

  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  pdfjsLibInstance = pdfjs;
  return pdfjs;
}

/**
 * Render a thumbnail canvas / image data URL for a given PDF page
 */
export async function renderPageThumbnail(
  fileOrBuffer: File | ArrayBuffer,
  pageNumber: number,
  scale = 0.5
): Promise<string> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) return '';

  const buffer = fileOrBuffer instanceof File ? await fileOrBuffer.arrayBuffer() : fileOrBuffer;
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNumber);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  if (!context) return '';

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Convert all pages of a PDF to high-resolution JPEG images
 */
export async function pdfToImages(
  file: File,
  quality = 0.92,
  dpiScale = 2.0
): Promise<{ pageNumber: number; dataUrl: string; blob: Blob }[]> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) return [];

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const images: { pageNumber: number; dataUrl: string; blob: Blob }[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: dpiScale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext('2d');

    if (context) {
      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', quality);
      });

      images.push({
        pageNumber: i,
        dataUrl,
        blob,
      });
    }
  }

  return images;
}
