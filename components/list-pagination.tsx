'use client';

import { Button } from '@/components/ui/button';
import { LogoSpinner } from '@/components/logo-spinner';
import { useListParams } from '@/hooks/use-list-params';

interface ListPaginationProps {
  page: number;
  pageCount: number;
  // Lists paged in the browser pass this; server-paged lists use the URL.
  onPageChange?: (page: number) => void;
}

export const ListPagination = ({ page, pageCount, onPageChange }: ListPaginationProps) => {
  const { setParams, isPending } = useListParams();

  if (pageCount <= 1) return null;

  const goTo = (next: number) =>
    onPageChange ? onPageChange(next) : setParams({ page: next > 1 ? String(next) : null });

  return (
    <div className="flex items-center justify-end gap-2 py-4">
      {isPending && <LogoSpinner size={20} />}
      <span className="text-sm text-muted-foreground">
        Page {page} of {pageCount}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1 || isPending}
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => goTo(page + 1)}
        disabled={page >= pageCount || isPending}
      >
        Next
      </Button>
    </div>
  );
};
