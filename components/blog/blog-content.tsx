import { TerminalBlock } from './terminal-block';

interface BlogContentProps {
  content: string;
}

function renderContentParts(html: string) {
  const placeholder = 'terminal-block-placeholder';
  const regex = new RegExp(
    `<div\\s+class="${placeholder}"\\s+data-command="([^"]*)"\\s+data-content="([^"]*)"[^>]*>\\s*</div>`,
    'g'
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span
          key={`html-${lastIndex}`}
          dangerouslySetInnerHTML={{ __html: html.slice(lastIndex, match.index) }}
        />
      );
    }
    parts.push(<TerminalBlock key={`term-${match.index}`} command={match[1]} content={match[2]} />);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < html.length) {
    parts.push(
      <span key={`html-${lastIndex}`} dangerouslySetInnerHTML={{ __html: html.slice(lastIndex) }} />
    );
  }

  return parts;
}

export const BlogContent = ({ content }: BlogContentProps) => {
  const hasTerminalBlocks = content.includes('terminal-block-placeholder');

  return (
    <div
      className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none 
                    prose-headings:text-slate-900 dark:prose-headings:text-white
                    prose-a:text-sky-600 dark:prose-a:text-sky-400
                    prose-code:text-rose-500 dark:prose-code:text-rose-400
                    prose-pre:bg-slate-900 dark:prose-pre:bg-slate-950
                    prose-img:rounded-2xl"
    >
      {hasTerminalBlocks ? (
        renderContentParts(content)
      ) : (
        <div dangerouslySetInnerHTML={{ __html: content }} />
      )}
    </div>
  );
};
