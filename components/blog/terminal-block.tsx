import { Terminal } from 'lucide-react';

interface TerminalBlockProps {
  content: string;
  command?: string;
  title?: string;
}

export const TerminalBlock = ({ content, command, title }: TerminalBlockProps) => {
  return (
    <div className="my-8 rounded-lg overflow-hidden border border-slate-700 bg-[#0f111a] shadow-2xl font-mono text-sm leading-relaxed">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e212f] border-b border-slate-700">
        <div className="flex items-center gap-x-2">
          <div className="flex gap-x-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-[#ff5f56]" />
            <div className="w-3.5 h-3.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-3.5 h-3.5 rounded-full bg-[#27c93f]" />
          </div>
          <span className="ml-3 text-slate-400 text-xs font-medium flex items-center gap-x-1.5">
            <Terminal className="h-3 w-3" />
            {title || 'bash'}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Terminal</div>
      </div>

      {/* Terminal Content */}
      <div className="p-4 overflow-x-auto custom-scrollbar">
        {command && (
          <div className="flex gap-x-2 mb-2">
            <span className="text-emerald-400 font-bold">$</span>
            <span className="text-slate-200">{command}</span>
          </div>
        )}
        <pre className="text-slate-300 whitespace-pre">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
};
