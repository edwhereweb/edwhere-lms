'use client';

import { useRef, useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  FileText,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  url: string;
  title?: string;
}

const ZOOM_LEVELS = [50, 67, 75, 90, 100, 110, 125, 150, 175, 200];

export const PdfViewer = ({ url, title = 'PDF Document' }: PdfViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(4); // 100% default

  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState<number>(1);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const scale = zoom / 100;

  const zoomIn = () => setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
  const zoomOut = () => setZoomIndex((i) => Math.max(i - 1, 0));

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const previousPage = () => setPageNumber((prev) => Math.max(prev - 1, 1));
  const nextPage = () => setPageNumber((prev) => Math.min(prev + 1, numPages || 1));

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-900"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#F80602] dark:bg-[#F80602] text-white flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {numPages && (
            <div className="flex items-center gap-1 mr-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={previousPage}
                disabled={pageNumber <= 1}
                className="text-white hover:text-white hover:bg-[#d63a2b] disabled:opacity-40 h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-mono w-20 text-center select-none">
                {pageNumber} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={nextPage}
                disabled={pageNumber >= numPages}
                className="text-white hover:text-white hover:bg-[#d63a2b] disabled:opacity-40 h-8 px-2"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={zoomIndex === 0}
            className="text-white hover:text-white hover:bg-[#d63a2b] disabled:opacity-40 h-8 px-2"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <span className="text-xs font-mono w-10 text-center select-none">{zoom}%</span>

          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            className="text-white hover:text-white hover:bg-[#d63a2b] disabled:opacity-40 h-8 px-2"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:text-white hover:bg-[#d63a2b] h-8 px-2 ml-1"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* PDF Content Area */}
      <div
        className="flex-1 overflow-auto bg-slate-200 dark:bg-slate-800 flex justify-center py-4 relative"
        style={{
          height: isFullscreen ? 'calc(100vh - 44px)' : 'calc(100vh - 200px)',
          minHeight: '500px'
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Loading PDF...</p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <p>Failed to load PDF.</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 underline mt-2 text-sm"
              >
                Download PDF
              </a>
            </div>
          }
          className="flex justify-center"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-lg max-w-full"
          />
        </Document>
      </div>
    </div>
  );
};
