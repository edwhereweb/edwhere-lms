'use client';

import { useRef, useState, useEffect } from 'react';
import { FileText, Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfViewerProps {
  url: string;
  title?: string;
}

const ZOOM_LEVELS = [50, 67, 75, 90, 100, 110, 125, 150, 175, 200];

export const PdfViewer = ({ url, title = 'PDF Document' }: PdfViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(4); // 100% default

  const zoom = ZOOM_LEVELS[zoomIndex];
  const zoomIn = () => setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
  const zoomOut = () => setZoomIndex((i) => Math.max(i - 1, 0));

  // Keep isFullscreen in sync with the browser's native fullscreen state
  // (handles ESC key exit as well as our button)
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

  // #toolbar=0 hides the browser's native PDF toolbar (download/print).
  // #zoom=N drives the initial zoom via the PDF viewer's own param.
  const iframeSrc = `${url}#toolbar=0&navpanes=0&scrollbar=1&zoom=${zoom}`;

  return (
    // containerRef is the fullscreen target — it fills whatever space it's given
    // in normal mode, and fills the entire screen in native fullscreen mode.
    <div
      ref={containerRef}
      className="flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-900"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-rose-600 dark:bg-rose-700 text-white flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={zoomIndex === 0}
            className="text-white hover:text-white hover:bg-rose-500 disabled:opacity-40 h-8 px-2"
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
            className="text-white hover:text-white hover:bg-rose-500 disabled:opacity-40 h-8 px-2"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:text-white hover:bg-rose-500 h-8 px-2 ml-1"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* iframe fills all remaining height — no position:fixed, no transforms */}
      <iframe
        key={iframeSrc}
        src={iframeSrc}
        title={title}
        className="w-full flex-1 border-0"
        style={{
          height: isFullscreen ? 'calc(100vh - 44px)' : 'calc(100vh - 200px)',
          minHeight: '500px'
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
};
