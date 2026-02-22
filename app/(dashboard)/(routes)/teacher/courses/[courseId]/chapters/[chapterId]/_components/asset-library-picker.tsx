'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Library,
  Search,
  Video,
  Youtube,
  FileText,
  Code2,
  FileType2,
  LayoutGrid,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
}

interface AssetItem {
  id: string;
  title: string;
  contentType: string | null;
  isPublished: boolean;
  updatedAt: string;
  course: { id: string; title: string };
}

interface ApiResponse {
  items: AssetItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// ─── Static maps ─────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  VIDEO_MUX: { label: 'Video (Mux)', icon: Video, color: 'text-blue-500' },
  VIDEO_YOUTUBE: { label: 'YouTube', icon: Youtube, color: 'text-red-500' },
  TEXT: { label: 'Text', icon: FileText, color: 'text-green-600' },
  HTML_EMBED: { label: 'HTML Embed', icon: Code2, color: 'text-purple-500' },
  PDF_DOCUMENT: { label: 'PDF', icon: FileType2, color: 'text-rose-500' }
};

const TYPE_LABELS: Record<string, string> = {
  VIDEO_MUX: 'Video (Mux)',
  VIDEO_YOUTUBE: 'YouTube Video',
  TEXT: 'Text',
  HTML_EMBED: 'HTML Embed',
  PDF_DOCUMENT: 'PDF Document'
};

function TypeBadge({ contentType }: { contentType: string | null }) {
  const meta = contentType ? TYPE_META[contentType] : null;
  const Icon = meta?.icon ?? LayoutGrid;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${meta?.color ?? 'text-muted-foreground'}`}
    >
      <Icon className="h-3 w-3" />
      {meta?.label ?? contentType ?? '—'}
    </span>
  );
}

// ─── Picker component ─────────────────────────────────────────────────────────

interface AssetLibraryPickerProps {
  courseId: string;
  chapterId: string;
  /** The content type of the chapter being edited — results are locked to this type */
  currentContentType: string;
}

export const AssetLibraryPicker = ({
  courseId,
  chapterId,
  currentContentType
}: AssetLibraryPickerProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Filters (content type is NOT user-configurable — always equals currentContentType)
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Data
  const [data, setData] = useState<ApiResponse | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, courseFilter]);

  // Fetch available courses scoped to the current content type, once on open
  useEffect(() => {
    if (!open) return;
    // Fetch with the locked content type so the course list only reflects relevant courses
    fetch(`/api/admin/asset-library?pageSize=30&page=1&contentType=${currentContentType}`)
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        const seen = new Set<string>();
        const list: Course[] = [];
        d.items.forEach((item) => {
          if (!seen.has(item.course.id)) {
            seen.add(item.course.id);
            list.push(item.course);
          }
        });
        setCourses(list);
      })
      .catch(() => {});
  }, [open, currentContentType]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Content type is always locked to the chapter's type
      params.set('contentType', currentContentType);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (courseFilter !== 'ALL') params.set('courseId', courseFilter);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/admin/asset-library?${params.toString()}`);
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [currentContentType, debouncedSearch, courseFilter, page]);

  useEffect(() => {
    if (open) fetchAssets();
  }, [open, fetchAssets]);

  // Reset state when dialog closes
  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setSearch('');
      setDebouncedSearch('');
      setCourseFilter('ALL');
      setPage(1);
    }
  };

  const handleImport = async (sourceChapterId: string) => {
    setImporting(sourceChapterId);
    try {
      await axios.post(`/api/courses/${courseId}/chapters/${chapterId}/import-asset`, {
        sourceChapterId
      });
      toast.success('Asset imported successfully');
      setOpen(false);
      router.refresh();
    } catch {
      toast.error('Failed to import asset');
    } finally {
      setImporting(null);
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE)) : 1;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

  const typeLabel = TYPE_LABELS[currentContentType] ?? currentContentType;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 mt-3 w-full justify-center">
          <Library className="h-4 w-4" />
          Import from Asset Library
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Library className="h-5 w-5 text-primary" />
            Import from Asset Library
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Showing <span className="font-medium text-foreground">{typeLabel}</span> assets from
            your courses. Select one to copy its content into this chapter.
          </p>
        </DialogHeader>

        {/* Filters — search + course only */}
        <div className="px-6 py-4 border-b shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Course filter */}
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="All my courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All my courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {data && !loading && (
            <p className="text-xs text-muted-foreground">
              {data.totalCount === 0
                ? 'No assets found'
                : `${data.totalCount} asset${data.totalCount !== 1 ? 's' : ''} found`}
            </p>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Library className="h-10 w-10 opacity-30" />
              <p className="text-sm">No {typeLabel} assets found in your courses.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.items.map((item) => {
                const isSelf = item.id === chapterId;
                const isImporting = importing === item.id;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                      isSelf
                        ? 'opacity-40 bg-muted/20 cursor-not-allowed'
                        : 'bg-background hover:bg-muted/30'
                    }`}
                  >
                    {/* Type icon */}
                    <div className="shrink-0">
                      <TypeBadge contentType={item.contentType} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.course.title} · {formatDate(item.updatedAt)}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      {item.isPublished ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-green-600 border-green-300 bg-green-50 dark:bg-green-950 h-5"
                        >
                          Published
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          Draft
                        </Badge>
                      )}
                    </div>

                    {/* Import button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSelf || !!importing}
                      onClick={() => handleImport(item.id)}
                      className="shrink-0 gap-1.5 text-primary hover:text-primary"
                    >
                      {isImporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {isImporting ? 'Importing…' : isSelf ? 'Current' : 'Import'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div className="px-6 py-3 border-t flex items-center justify-center gap-1 shrink-0">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`e-${i}`} className="px-1 text-muted-foreground text-sm">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={page === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(p as number)}
                    className="h-8 w-8 p-0"
                  >
                    {p}
                  </Button>
                )
              )}

            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
