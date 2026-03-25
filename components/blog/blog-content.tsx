'use client';

import { TerminalBlock } from './terminal-block';
import parse, { HTMLReactParserOptions, Element } from 'html-react-parser';

interface BlogContentProps {
  content: string;
}

export const BlogContent = ({ content }: BlogContentProps) => {
  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element && domNode.attribs.class === 'terminal-block-placeholder') {
        const command = domNode.attribs['data-command'];
        const terminalContent = domNode.attribs['data-content'];

        return <TerminalBlock content={terminalContent} command={command} />;
      }
    }
  };

  return (
    <div
      className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none 
                    prose-headings:text-slate-900 dark:prose-headings:text-white
                    prose-a:text-sky-600 dark:prose-a:text-sky-400
                    prose-code:text-rose-500 dark:prose-code:text-rose-400
                    prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950
                    prose-img:rounded-2xl"
    >
      {parse(content, options)}
    </div>
  );
};
