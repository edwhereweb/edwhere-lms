'use client';

import { useEffect, useRef } from 'react';

interface HtmlEmbedPreviewProps {
  html: string;
  className?: string;
}

/**
 * Renders arbitrary HTML inside a sandboxed iframe.
 * The iframe height auto-expands to match its content.
 */
export const HtmlEmbedPreview = ({ html, className }: HtmlEmbedPreviewProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: #111;
    }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>${html}</body>
</html>`;

    doc.open();
    doc.write(fullHtml);
    doc.close();

    // Auto-resize iframe to content height
    const resize = () => {
      if (iframe && iframe.contentDocument) {
        iframe.style.height = iframe.contentDocument.documentElement.scrollHeight + 'px';
      }
    };

    iframe.addEventListener('load', resize);
    // Give embedded scripts a moment to render
    const t = setTimeout(resize, 200);
    return () => {
      iframe.removeEventListener('load', resize);
      clearTimeout(t);
    };
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      title="HTML Preview"
      sandbox="allow-scripts allow-same-origin"
      className={`w-full border-0 rounded-md ${className ?? ''}`}
      style={{ minHeight: '100px' }}
    />
  );
};
