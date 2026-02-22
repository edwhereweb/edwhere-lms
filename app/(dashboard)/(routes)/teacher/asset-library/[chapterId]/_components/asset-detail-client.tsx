'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  Video,
  Youtube,
  FileText,
  Code2,
  FileType2,
  LayoutGrid,
  Pencil,
  X,
  Save,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Editor } from '@/components/editor';
import { Preview } from '@/components/preview';
import { HtmlEmbedPreview } from '@/components/html-embed-preview';
import { PdfViewer } from '@/components/pdf-viewer';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MuxData {
  assetId: string;
  playbackId: string | null;
}

interface Chapter {
  id: string;
  title: string;
  description: string | null;
  contentType: string | null;
  isPublished: boolean;
  videoUrl: string | null;
  youtubeVideoId: string | null;
  content: string | null;
  htmlContent: string | null;
  pdfUrl: string | null;
  courseId: string;
  muxData: MuxData | null;
  course: { id: string; title: string };
}

const editSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(10000).optional(),
  youtubeVideoId: z.string().max(50).nullable().optional(),
  content: z.string().max(100000).nullable().optional(),
  htmlContent: z.string().max(500000).nullable().optional(),
  pdfUrl: z.string().url('Must be a valid URL').nullable().optional()
});

type EditValues = z.infer<typeof editSchema>;

// ─── Content-type helpers ─────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  VIDEO_MUX: { label: 'Video (Mux)', icon: Video, color: 'text-blue-500' },
  VIDEO_YOUTUBE: { label: 'Video (YouTube)', icon: Youtube, color: 'text-red-500' },
  TEXT: { label: 'Text', icon: FileText, color: 'text-green-600' },
  HTML_EMBED: { label: 'HTML Embed', icon: Code2, color: 'text-purple-500' },
  PDF_DOCUMENT: { label: 'PDF Document', icon: FileType2, color: 'text-rose-500' }
};

function TypeBadge({ contentType }: { contentType: string | null }) {
  const meta = contentType ? TYPE_META[contentType] : null;
  const Icon = meta?.icon ?? LayoutGrid;
  return (
    <span className={`flex items-center gap-1.5 text-sm font-medium ${meta?.color ?? ''}`}>
      <Icon className="h-4 w-4" />
      {meta?.label ?? contentType ?? 'Unknown'}
    </span>
  );
}

// ─── Content preview ──────────────────────────────────────────────────────────

function ContentPreview({ chapter }: { chapter: Chapter }) {
  switch (chapter.contentType) {
    case 'VIDEO_MUX':
      if (chapter.muxData?.playbackId) {
        return (
          <div className="rounded-lg overflow-hidden border aspect-video bg-black">
            <iframe
              src={`https://stream.mux.com/${chapter.muxData.playbackId}`}
              className="w-full h-full"
              allowFullScreen
              title={chapter.title}
            />
          </div>
        );
      }
      return (
        <p className="text-sm text-muted-foreground italic">
          Mux video not yet processed or no playback ID available.
        </p>
      );

    case 'VIDEO_YOUTUBE':
      if (chapter.youtubeVideoId) {
        return (
          <div className="rounded-lg overflow-hidden border aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${chapter.youtubeVideoId}`}
              className="w-full h-full"
              allowFullScreen
              title={chapter.title}
            />
          </div>
        );
      }
      return <p className="text-sm text-muted-foreground italic">No YouTube video ID set.</p>;

    case 'TEXT':
      if (chapter.content) {
        return (
          <div className="border rounded-lg p-4 bg-muted/20">
            <Preview value={chapter.content} />
          </div>
        );
      }
      return <p className="text-sm text-muted-foreground italic">No text content yet.</p>;

    case 'HTML_EMBED':
      if (chapter.htmlContent) {
        return (
          <div className="border rounded-lg overflow-hidden">
            <HtmlEmbedPreview html={chapter.htmlContent} />
          </div>
        );
      }
      return <p className="text-sm text-muted-foreground italic">No HTML content yet.</p>;

    case 'PDF_DOCUMENT':
      if (chapter.pdfUrl) {
        return <PdfViewer url={chapter.pdfUrl} title={chapter.title} />;
      }
      return <p className="text-sm text-muted-foreground italic">No PDF URL set.</p>;

    default:
      return <p className="text-sm text-muted-foreground italic">Unknown content type.</p>;
  }
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function AssetEditForm({
  chapter,
  onCancel,
  onSaved
}: {
  chapter: Chapter;
  onCancel: () => void;
  onSaved: (updated: Chapter) => void;
}) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: chapter.title,
      description: chapter.description ?? '',
      youtubeVideoId: chapter.youtubeVideoId ?? '',
      content: chapter.content ?? '',
      htmlContent: chapter.htmlContent ?? '',
      pdfUrl: chapter.pdfUrl ?? ''
    }
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: EditValues) => {
    try {
      const payload = {
        ...values,
        youtubeVideoId: values.youtubeVideoId || null,
        content: values.content || null,
        htmlContent: values.htmlContent || null,
        pdfUrl: values.pdfUrl || null
      };
      const { data } = await axios.patch<Chapter>(
        `/api/admin/asset-library/${chapter.id}`,
        payload
      );
      toast.success('Asset updated successfully');
      onSaved({ ...chapter, ...data });
    } catch {
      toast.error('Failed to save changes');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Chapter title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Editor {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* YouTube Video ID */}
        {chapter.contentType === 'VIDEO_YOUTUBE' && (
          <FormField
            control={form.control}
            name="youtubeVideoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>YouTube Video ID</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} placeholder="e.g. dQw4w9WgXcQ" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Text content (Rich text) */}
        {chapter.contentType === 'TEXT' && (
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Text Content</FormLabel>
                <FormControl>
                  <Editor {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* HTML embed */}
        {chapter.contentType === 'HTML_EMBED' && (
          <FormField
            control={form.control}
            name="htmlContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>HTML Embed Code</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Paste your HTML / embed code here…"
                    className="font-mono text-xs min-h-[200px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* PDF URL */}
        {chapter.contentType === 'PDF_DOCUMENT' && (
          <FormField
            control={form.control}
            name="pdfUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PDF URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="https://…/document.pdf"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AssetDetailClient({ chapter: initial }: { chapter: Chapter }) {
  const router = useRouter();
  const [chapter, setChapter] = useState<Chapter>(initial);
  const [isEditing, setIsEditing] = useState(false);

  const handleSaved = (updated: Chapter) => {
    setChapter(updated);
    setIsEditing(false);
    router.refresh();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/teacher/asset-library"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to Asset Library
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{chapter.title}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <TypeBadge contentType={chapter.contentType} />
            <span className="text-sm text-muted-foreground">
              Course:{' '}
              <Link
                href={`/teacher/courses/${chapter.courseId}/details`}
                className="hover:underline text-foreground inline-flex items-center gap-1"
              >
                {chapter.course.title}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </span>
            {chapter.isPublished ? (
              <Badge
                variant="outline"
                className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950"
              >
                Published
              </Badge>
            ) : (
              <Badge variant="secondary">Draft</Badge>
            )}
          </div>
        </div>

        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline" className="shrink-0">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Content preview */}
      {!isEditing && (
        <div className="space-y-4">
          {chapter.description && (
            <div className="border rounded-lg p-4 bg-muted/20">
              <h2 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                Description
              </h2>
              <Preview value={chapter.description} />
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              Content
            </h2>
            <ContentPreview chapter={chapter} />
          </div>
        </div>
      )}

      {/* Edit form */}
      {isEditing && (
        <div className="border rounded-lg p-6 bg-muted/10">
          <h2 className="text-sm font-semibold mb-5 text-muted-foreground uppercase tracking-wide">
            Editing Asset
          </h2>
          <AssetEditForm
            chapter={chapter}
            onCancel={() => setIsEditing(false)}
            onSaved={handleSaved}
          />
        </div>
      )}
    </div>
  );
}
