'use client';

import { useState } from 'react';
import axios from 'axios';
import { Loader2, UploadCloud, AlertCircle, Download } from 'lucide-react';
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

export function BulkIssueModal({ isOpen, onClose, onSuccess }: BulkModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDownloadTemplate = () => {
    const headers = [
      'recipientName',
      'courseName',
      'duration',
      'deliveryMode',
      'dateOfAchievement'
    ];
    const csvContent =
      headers.join(',') + '\nJohn Doe,Full Stack Bootcamp,6 Months,Online,2023-05-15';

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

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { data } = await axios.post('/api/admin/certificates/bulk', results.data);

          if (data.failedCount > 0) {
            toast.error(`Uploaded ${data.successCount}. Failed: ${data.failedCount}`, {
              duration: 5000
            });
            console.error('Failed rows:', data.failed);
          } else {
            toast.success(`Successfully issued ${data.successCount} certificates`);
          }

          setFile(null);
          onSuccess();
          onClose();
        } catch {
          toast.error('Failed to process bulk upload');
        } finally {
          setLoading(false);
        }
      },
      error: () => {
        toast.error('Failed to parse CSV file');
        setLoading(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
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
                <p>Ensure your CSV has these exact headers:</p>
                <code className="text-xs bg-muted px-1 rounded mt-1 inline-block">
                  recipientName, courseName, duration, deliveryMode, dateOfAchievement
                </code>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-1" /> Template
            </Button>
          </div>

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
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <Button
              variant="secondary"
              onClick={() => document.getElementById('csv-upload')?.click()}
            >
              Select File
            </Button>
          </div>

          {file && (
            <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded border border-emerald-200 flex justify-between items-center">
              <span className="truncate">{file.name}</span>
              <Button size="sm" onClick={handleUpload} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Process Upload
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
