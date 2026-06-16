'use client';

import { useState } from 'react';
import axios from 'axios';
import { Loader2, UploadCloud, AlertCircle, Download, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

interface BulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FailedRow {
  row: number;
  data: Record<string, unknown>;
  reason: string;
}

interface UploadResult {
  successCount: number;
  failedCount: number;
  failed: FailedRow[];
}

const REQUIRED_HEADERS = [
  'recipientName',
  'courseName',
  'duration',
  'deliveryMode',
  'dateOfAchievement',
  'score'
] as const;

export function BulkIssueModal({ isOpen, onClose, onSuccess }: BulkModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      REQUIRED_HEADERS.join(',') + '\nJohn Doe,Full Stack Bootcamp,6 Months,Online,2023-05-15,85';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'certificate_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        try {
          // Validate that the CSV has all required columns before sending to the server
          const actualHeaders = parsed.meta.fields ?? [];
          const missingHeaders = REQUIRED_HEADERS.filter((h) => !actualHeaders.includes(h));

          if (missingHeaders.length > 0) {
            toast.error(
              `Invalid template: missing column${missingHeaders.length > 1 ? 's' : ''} — ${missingHeaders.join(', ')}`,
              { duration: 6000 }
            );
            setLoading(false);
            return;
          }

          if (parsed.data.length === 0) {
            toast.error('The CSV file has no data rows.');
            setLoading(false);
            return;
          }

          const { data } = await axios.post<UploadResult>(
            '/api/admin/certificates/bulk',
            parsed.data
          );

          setResult(data);

          if (data.failedCount === 0) {
            toast.success(
              `Successfully issued ${data.successCount} certificate${data.successCount !== 1 ? 's' : ''}.`
            );
            setFile(null);
            onSuccess();
            onClose();
          } else if (data.successCount === 0) {
            toast.error(`All ${data.failedCount} rows failed. See details below.`, {
              duration: 5000
            });
          } else {
            toast.error(
              `${data.successCount} issued, ${data.failedCount} failed. See details below.`,
              { duration: 5000 }
            );
            onSuccess();
          }
        } catch {
          toast.error('Something went wrong while processing the upload. Please try again.');
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        toast.error(`Failed to parse CSV: ${err.message}`);
        setLoading(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Issue Certificates</DialogTitle>
          <DialogDescription>
            Upload a CSV file to issue multiple certificates at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p>Your CSV must have exactly these headers:</p>
                <code className="text-xs bg-muted px-1 rounded mt-1 inline-block">
                  {REQUIRED_HEADERS.join(', ')}
                </code>
                <p className="text-xs mt-1">
                  Date format: <strong>YYYY-MM-DD</strong> &nbsp;·&nbsp; Score: 0–100 (optional)
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-1" /> Template
            </Button>
          </div>

          {!result && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4 hover:bg-muted/50 transition-colors">
              <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto" />
              <div>
                <p className="text-sm font-medium">Click to select or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">Only CSV files are supported</p>
              </div>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                id="csv-upload"
                onChange={(e) => {
                  setResult(null);
                  setFile(e.target.files?.[0] || null);
                }}
              />
              <Button
                variant="secondary"
                onClick={() => document.getElementById('csv-upload')?.click()}
              >
                Select File
              </Button>
            </div>
          )}

          {file && !result && (
            <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded border border-emerald-200 flex justify-between items-center">
              <span className="truncate">{file.name}</span>
              <Button size="sm" onClick={handleUpload} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Process Upload
              </Button>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex gap-3">
                {result.successCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 flex-1">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>{result.successCount}</strong> certificate
                      {result.successCount !== 1 ? 's' : ''} issued
                    </span>
                  </div>
                )}
                {result.failedCount > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 flex-1">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>{result.failedCount}</strong> row{result.failedCount !== 1 ? 's' : ''}{' '}
                      failed
                    </span>
                  </div>
                )}
              </div>

              {result.failed.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 uppercase tracking-wide">
                    Failed Rows
                  </div>
                  <ul className="divide-y divide-red-100 max-h-48 overflow-y-auto">
                    {result.failed.map((f) => (
                      <li key={f.row} className="px-3 py-2 text-xs text-red-800">
                        <span className="font-medium">Row {f.row}</span>
                        {f.data?.recipientName ? (
                          <span className="text-red-600"> ({String(f.data.recipientName)})</span>
                        ) : null}
                        <span className="text-red-500"> — {f.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                  }}
                >
                  Upload Another
                </Button>
                <Button size="sm" onClick={handleClose}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
