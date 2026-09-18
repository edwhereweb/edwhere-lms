'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const ExportLeadsButton = () => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    try {
      setExporting(true);

      // We use an anchor tag to trigger the browser download directly
      // this way we don't have to load the entire CSV into memory
      // or handle blob URLs manually if it's large.
      const link = document.createElement('a');
      link.href = '/api/leads/export';
      link.setAttribute('download', 'leads_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Export started');
    } catch {
      toast.error('Failed to export leads');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={exporting}
      variant="outline"
      className="gap-2 text-neutral-600 dark:text-neutral-300"
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export CSV
    </Button>
  );
};
