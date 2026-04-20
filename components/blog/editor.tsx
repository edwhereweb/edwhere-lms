'use client';

import {
  useEditor,
  EditorContent,
  Editor as TiptapEditor,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewProps
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Heading from '@tiptap/extension-heading';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Node, mergeAttributes } from '@tiptap/core';
import { lowlight } from '@/lib/editor-utils';
import { useState } from 'react';
import axios from 'axios';
import { TerminalBlock } from './terminal-block';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Undo,
  Redo,
  Code,
  Heading1,
  Heading2,
  Terminal,
  Image as ImageIcon,
  Loader2,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  Info,
  Table as TableIcon,
  Plus,
  Minus,
  Combine,
  SplitSquareHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// --- Custom Terminal Extension ---
const TerminalNodeView = (props: NodeViewProps) => {
  const { 'data-command': command, 'data-content': content } = props.node.attrs;
  return (
    <NodeViewWrapper className="terminal-node-view">
      <TerminalBlock content={content} command={command} />
    </NodeViewWrapper>
  );
};

const TerminalExtension = Node.create({
  name: 'terminal',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      'data-command': { default: '' },
      'data-content': { default: '' }
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div.terminal-block-placeholder',
        getAttrs: (dom) => ({
          'data-command': (dom as HTMLElement).getAttribute('data-command'),
          'data-content': (dom as HTMLElement).getAttribute('data-content')
        })
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'terminal-block-placeholder' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TerminalNodeView);
  }
});

export interface EditorProps {
  onChange: (value: string) => void;
  initialContent?: string;
  blogId?: string;
}

const Toolbar = ({ editor, blogId }: { editor: TiptapEditor | null; blogId?: string }) => {
  const [isUploading, setIsUploading] = useState(false);
  if (!editor) return null;

  const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const { data } = await axios.post('/api/upload/presign', {
        type: 'blogPostImage',
        filename: file.name,
        contentType: file.type,
        blogId
      });

      await axios.put(data.uploadUrl, file, {
        headers: { 'Content-Type': file.type }
      });

      const url = `/api/files/${data.key}`;
      const altText = window.prompt('Enter alt text for SEO (optional):', file.name.split('.')[0]);
      editor
        .chain()
        .focus()
        .setImage({ src: url, alt: altText || '' })
        .run();
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const addTerminalPrompt = () => {
    const command = window.prompt('Enter command (optional):', 'ls -la');
    const content = window.prompt(
      'Enter terminal output:',
      'total 0\ndrwxr-xr-x  2 user  staff   64 Mar 24 16:47 .'
    );
    if (content !== null) {
      editor
        .chain()
        .focus()
        .insertContent(
          `<div class="terminal-block-placeholder" data-command="${command || ''}" data-content="${content}"></div>`
        )
        .run();
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const isInTable = editor.isActive('table');

  return (
    <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1 rounded-t-lg flex items-center flex-wrap gap-1 sticky top-0 z-10">
      <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 border-r border-slate-200 dark:border-slate-800 mr-1">
        Rich Text
      </div>

      {/* ── Text formatting ── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-800' : ''}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-800' : ''}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'bg-slate-200 dark:bg-slate-800' : ''}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={setLink}
        className={editor.isActive('link') ? 'bg-slate-200 dark:bg-slate-800' : ''}
        title="Add Link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* ── Headings ── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 dark:bg-slate-800' : ''}
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 dark:bg-slate-800' : ''}
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* ── Lists ── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-800' : ''}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-800' : ''}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* ── Code & media ── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'bg-slate-200 dark:bg-slate-800' : ''}
      >
        <Code className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={addTerminalPrompt}
        title="Insert Terminal Block"
        className="hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
      >
        <Terminal className="h-4 w-4 text-emerald-600" />
      </Button>

      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          disabled={isUploading}
          onClick={() => document.getElementById('blog-editor-image-upload')?.click()}
          title="Insert Image"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4 text-sky-600" />
          )}
        </Button>
        <input
          id="blog-editor-image-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageUpload}
        />
      </div>

      {editor.isActive('image') && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const currentAlt = editor.getAttributes('image').alt || '';
            const newAlt = window.prompt('Enter Image Alt Text (for SEO):', currentAlt);
            if (newAlt !== null) {
              editor.chain().focus().updateAttributes('image', { alt: newAlt }).run();
            }
          }}
          title="Edit Image Alt Text"
          className="bg-emerald-50 dark:bg-emerald-900/20"
        >
          <Info className="h-4 w-4 text-emerald-600" />
          <span className="ml-1 text-[10px] text-emerald-600 font-bold">ALT</span>
        </Button>
      )}

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* ── Table ── */}
      <Button
        variant="ghost"
        size="sm"
        onClick={insertTable}
        title="Insert Table"
        className={isInTable ? 'bg-violet-100 dark:bg-violet-900/30' : ''}
      >
        <TableIcon className="h-4 w-4 text-violet-600" />
      </Button>

      {/* Context toolbar — only visible when cursor is inside a table */}
      {isInTable && (
        <>
          <div className="flex items-center gap-0.5 bg-violet-50 dark:bg-violet-900/20 rounded-md px-1.5 py-0.5">
            <span className="text-[9px] font-bold uppercase text-violet-500 mr-1">Row</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => editor.chain().focus().addRowAfter().run()}
              title="Add Row Below"
            >
              <Plus className="h-3 w-3 text-violet-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => editor.chain().focus().deleteRow().run()}
              title="Delete Row"
            >
              <Minus className="h-3 w-3 text-violet-600" />
            </Button>
          </div>

          <div className="flex items-center gap-0.5 bg-violet-50 dark:bg-violet-900/20 rounded-md px-1.5 py-0.5">
            <span className="text-[9px] font-bold uppercase text-violet-500 mr-1">Col</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => editor.chain().focus().addColumnAfter().run()}
              title="Add Column After"
            >
              <Plus className="h-3 w-3 text-violet-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => editor.chain().focus().deleteColumn().run()}
              title="Delete Column"
            >
              <Minus className="h-3 w-3 text-violet-600" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().mergeCells().run()}
            title="Merge Selected Cells"
            className="h-7 px-2"
          >
            <Combine className="h-3.5 w-3.5 text-violet-600" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().splitCell().run()}
            title="Split Cell"
            className="h-7 px-2"
          >
            <SplitSquareHorizontal className="h-3.5 w-3.5 text-violet-600" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().deleteTable().run()}
            title="Delete Table"
            className="h-7 px-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <TableIcon className="h-3.5 w-3.5" />
            <Minus className="h-3 w-3 ml-0.5" />
          </Button>
        </>
      )}

      {/* ── Undo / Redo ── */}
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()}>
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const Editor = ({ onChange, initialContent, blogId }: EditorProps) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false
      }),
      Heading.configure({
        levels: [1, 2, 3]
      }),
      Placeholder.configure({
        placeholder: 'Write something amazing...'
      }),
      Underline,
      Link.configure({
        openOnClick: false
      }),
      CodeBlockLowlight.configure({
        lowlight
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg border border-slate-200 max-w-full h-auto my-4'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4'
        }
      }),
      TableRow,
      TableHeader,
      TableCell,
      TerminalExtension
    ],
    content: initialContent || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm md:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[400px] p-6 border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-lg bg-white dark:bg-slate-950 shadow-sm'
      }
    }
  });

  return (
    <div className="flex flex-col w-full">
      <Toolbar editor={editor} blogId={blogId} />
      <EditorContent editor={editor} />
      <style>{`
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          overflow: hidden;
        }
        .ProseMirror table td,
        .ProseMirror table th {
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          vertical-align: top;
          position: relative;
          min-width: 80px;
          box-sizing: border-box;
        }
        .dark .ProseMirror table td,
        .dark .ProseMirror table th {
          border-color: #334155;
        }
        .ProseMirror table th {
          background-color: #f8fafc;
          font-weight: 600;
          text-align: left;
        }
        .dark .ProseMirror table th {
          background-color: #1e293b;
        }
        .ProseMirror table tr:nth-child(even) td {
          background-color: #f8fafc;
        }
        .dark .ProseMirror table tr:nth-child(even) td {
          background-color: #0f172a;
        }
        .ProseMirror table .selectedCell::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(139, 92, 246, 0.15);
          pointer-events: none;
          z-index: 2;
        }
        .ProseMirror table .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background-color: #8b5cf6;
          cursor: col-resize;
          opacity: 0;
          transition: opacity 0.15s;
          z-index: 3;
        }
        .ProseMirror table:hover .column-resize-handle {
          opacity: 0.6;
        }
        .tableWrapper {
          overflow-x: auto;
        }
        .resize-cursor {
          cursor: col-resize;
        }
      `}</style>
    </div>
  );
};

export default Editor;
