'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center bg-[#1e1e1e] rounded-md"
      style={{ height: '100%' }}
    >
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
    </div>
  )
});

interface HtmlCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
}

export const HtmlCodeEditor = ({ value, onChange, height = '400px' }: HtmlCodeEditorProps) => {
  return (
    <div
      className="rounded-md overflow-hidden border border-slate-300 dark:border-slate-700"
      style={{ height }}
    >
      <MonacoEditor
        height={height}
        language="html"
        theme="vs-dark"
        value={value}
        onChange={(val) => onChange(val ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
          tabSize: 2,
          scrollBeyondLastLine: false,
          formatOnPaste: true,
          formatOnType: false,
          suggestOnTriggerCharacters: true,
          quickSuggestions: true
        }}
      />
    </div>
  );
};
