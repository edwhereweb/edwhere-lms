'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, MoreHorizontal, Pencil, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface LandingPage {
  id: string;
  title: string;
  slug: string;
  htmlContent: string;
  isPublished: boolean;
  isApproved: boolean;
  createdBy: string;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface ColumnsProps {
  onPublish?: (id: string, isPublished: boolean) => void;
  onApprove?: (id: string) => void;
  isAdmin?: boolean;
}

export const createColumns = ({
  onPublish,
  onApprove,
  isAdmin
}: ColumnsProps): ColumnDef<LandingPage>[] => [
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium ml-4">{row.getValue('title')}</div>
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => (
      <code className="text-xs bg-slate-100 px-1 rounded">/pages/{row.getValue('slug')}</code>
    )
  },
  {
    accessorKey: 'isApproved',
    header: 'Status',
    cell: ({ row }) => {
      const isApproved = !!row.getValue('isApproved');
      const isPublished = !!row.original.isPublished;

      return (
        <div className="flex gap-2">
          <Badge
            className={cn(
              isApproved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
            )}
          >
            {isApproved ? 'Approved' : 'Pending Approval'}
          </Badge>
          {isPublished && isApproved && (
            <Badge variant="default" className="bg-blue-500">
              Live
            </Badge>
          )}
          {!isPublished && <Badge variant="secondary">Draft</Badge>}
        </div>
      );
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const { id, slug, isPublished, isApproved } = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <Link href={`/pages/${slug}`} target="_blank">
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                Preview Page
              </DropdownMenuItem>
            </Link>

            <DropdownMenuItem
              onClick={() => {
                const currentPath = window.location.pathname;
                window.location.href = currentPath.includes('/admin')
                  ? `/admin/landing-pages/${id}`
                  : currentPath.includes('/marketer')
                    ? `/marketer/landing-pages/${id}`
                    : `/blogger/landing-pages/${id}`;
              }}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit Content
            </DropdownMenuItem>

            {isAdmin && !isApproved && (
              <DropdownMenuItem onClick={() => onApprove?.(id)} className="text-emerald-600">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Page
              </DropdownMenuItem>
            )}

            {isApproved && (
              <DropdownMenuItem onClick={() => onPublish?.(id, !isPublished)}>
                {isPublished ? (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Publish Live
                  </>
                )}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];
