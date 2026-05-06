'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { BatchReportSummary } from '@/actions/get-batch-reports';

export const columns: ColumnDef<BatchReportSummary>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Batch Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => <div className="font-medium ml-4">{row.getValue('title')}</div>
  },
  {
    accessorKey: 'instructorName',
    header: 'Instructor'
  },
  {
    accessorKey: 'progressPercent',
    header: 'Session Progress',
    cell: ({ row }) => {
      const p = row.getValue<number>('progressPercent');
      return (
        <div className="w-32 flex items-center gap-2">
          <Progress value={p} className="h-2" />
          <span className="text-xs text-muted-foreground">{p}%</span>
        </div>
      );
    }
  },
  {
    accessorKey: 'avgAttendancePercent',
    header: 'Avg Attendance',
    cell: ({ row }) => {
      const a = row.getValue<number | null>('avgAttendancePercent');
      if (a === null) return <span className="text-muted-foreground italic">N/A</span>;
      return <span>{a}%</span>;
    }
  },
  {
    accessorKey: 'avgIeScore',
    header: 'Avg IE Score',
    cell: ({ row }) => {
      const ie = row.getValue<number | null>('avgIeScore');
      if (ie === null) return <span className="text-muted-foreground italic">N/A</span>;

      const needsAttention = ie < 5.0;

      return (
        <div className="flex items-center gap-2">
          <span className={needsAttention ? 'text-red-600 font-semibold' : ''}>
            {ie.toFixed(1)} / 10
          </span>
          {needsAttention && (
            <span title="Low IE Score">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </span>
          )}
        </div>
      );
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const { id } = row.original;
      return (
        <Link href={`/admin/reports/offline-batches/${id}`}>
          <Button variant="outline" size="sm">
            Drill-down
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
        </Link>
      );
    }
  }
];
