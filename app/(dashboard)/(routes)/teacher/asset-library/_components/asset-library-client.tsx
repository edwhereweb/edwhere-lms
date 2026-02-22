'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  Video,
  Youtube,
  FileText,
  Code2,
  FileType2,
  LayoutGrid,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type Course = { id: string; title: string };

interface AssetItem {
  id: string;
  title: string;
  description: string | null;
  contentType: string | null;
  isPublished: boolean;
  courseId: string;
  updatedAt: string;
  course: { id: string; title: string };
}

interface ApiResponse {
  items: AssetItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

const CONTENT_TYPE_OPTIONS = [
  { value: 'ALL', label: 'All Types' },
  { value: 'VIDEO_MUX', label: 'Video (Mux)' },
  { value: 'VIDEO_YOUTUBE', label: 'Video (YouTube)' },
  { value: 'TEXT', label: 'Text' },
  { value: 'HTML_EMBED', label: 'HTML Embed' },
  { value: 'PDF_DOCUMENT', label: 'PDF Document' }
];

const PAGE_SIZES = [10, 20, 30];

function ContentTypeIcon({ contentType }: { contentType: string | null }) {
  switch (contentType) {
    case 'VIDEO_MUX':
      return <Video className="h-4 w-4 text-blue-500" />;
    case 'VIDEO_YOUTUBE':
      return <Youtube className="h-4 w-4 text-red-500" />;
    case 'TEXT':
      return <FileText className="h-4 w-4 text-green-600" />;
    case 'HTML_EMBED':
      return <Code2 className="h-4 w-4 text-purple-500" />;
    case 'PDF_DOCUMENT':
      return <FileType2 className="h-4 w-4 text-rose-500" />;
    default:
      return <LayoutGrid className="h-4 w-4 text-muted-foreground" />;
  }
}

function ContentTypeLabel({ contentType }: { contentType: string | null }) {
  const map: Record<string, string> = {
    VIDEO_MUX: 'Video (Mux)',
    VIDEO_YOUTUBE: 'Video (YouTube)',
    TEXT: 'Text',
    HTML_EMBED: 'HTML Embed',
    PDF_DOCUMENT: 'PDF Document'
  };
  return <span>{map[contentType ?? ''] ?? contentType ?? '—'}</span>;
}

interface AssetLibraryClientProps {
  courses: Course[];
}

export const AssetLibraryClient = ({ courses }: AssetLibraryClientProps) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [contentType, setContentType] = useState('ALL');
  const [courseId, setCourseId] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, contentType, courseId, pageSize]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (contentType && contentType !== 'ALL') params.set('contentType', contentType);
      if (courseId && courseId !== 'ALL') params.set('courseId', courseId);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));

      const res = await fetch(`/api/admin/asset-library?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json: ApiResponse = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, contentType, courseId, page, pageSize]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / pageSize)) : 1;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

  return (
    <div className="space-y-5">
      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or content…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Content type filter */}
        <Select value={contentType} onValueChange={setContentType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Content Type" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Course filter */}
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Page size */}
        <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
          <SelectTrigger className="w-[110px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      {data && !loading && (
        <p className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-medium text-foreground">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, data.totalCount)}
          </span>{' '}
          of <span className="font-medium text-foreground">{data.totalCount}</span> assets
        </p>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium w-[30%]">Title</th>
              <th className="text-left px-4 py-3 font-medium w-[25%]">Course</th>
              <th className="text-left px-4 py-3 font-medium w-[16%]">Type</th>
              <th className="text-left px-4 py-3 font-medium w-[10%]">Status</th>
              <th className="text-left px-4 py-3 font-medium w-[13%]">Updated</th>
              <th className="px-4 py-3 w-[6%]" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                </td>
              </tr>
            ) : !data || data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-muted-foreground">
                  No assets found.
                </td>
              </tr>
            ) : (
              data.items.map((item, idx) => (
                <tr
                  key={item.id}
                  className={
                    idx % 2 === 0
                      ? 'bg-background hover:bg-muted/30 transition-colors'
                      : 'bg-muted/10 hover:bg-muted/30 transition-colors'
                  }
                >
                  <td className="px-4 py-3 font-medium max-w-[240px] truncate">{item.title}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                    {item.course.title}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <ContentTypeIcon contentType={item.contentType} />
                      <ContentTypeLabel contentType={item.contentType} />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.isPublished ? (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950"
                      >
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDate(item.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/teacher/asset-library/${item.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <PencilLine className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="h-8 px-3"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-1 text-muted-foreground text-sm">
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
            className="h-8 px-3"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
