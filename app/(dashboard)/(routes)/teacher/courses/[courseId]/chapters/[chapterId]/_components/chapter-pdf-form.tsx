'use client';

import axios from 'axios';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { type Chapter } from '@prisma/client';

import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/file-upload';

interface ChapterPdfFormProps {
  initialData: Chapter;
  courseId: string;
  chapterId: string;
}

export const ChapterPdfForm = ({ initialData, courseId, chapterId }: ChapterPdfFormProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  const pdfUrl = (initialData as unknown as { pdfUrl?: string }).pdfUrl;

  const toggleEdit = () => setIsEditing((prev) => !prev);

  const onUpload = async (url?: string) => {
    if (!url) return;
    try {
      await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, {
        pdfUrl: url
      });
      toast.success('PDF uploaded');
      toggleEdit();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  const onRemove = async () => {
    try {
      await axios.patch(`/api/courses/${courseId}/chapters/${chapterId}`, {
        pdfUrl: null
      });
      toast.success('PDF removed');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 dark:bg-slate-800 rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          PDF Document
        </div>
        <Button onClick={toggleEdit} variant="ghost">
          {isEditing ? (
            <>Cancel</>
          ) : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              {pdfUrl ? 'Replace PDF' : 'Upload PDF'}
            </>
          )}
        </Button>
      </div>

      {!isEditing && (
        <>
          {pdfUrl ? (
            <div className="mt-3 flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-md">
              <FileText className="h-8 w-8 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                  PDF uploaded successfully
                </p>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Preview in new tab ↗
                </a>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="text-slate-500 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm mt-2 text-slate-500 italic">
              No PDF uploaded yet. Max file size: 16 MB.
            </p>
          )}
        </>
      )}

      {isEditing && (
        <div className="mt-4">
          <FileUpload endpoint="chapterPdf" onChange={(url) => onUpload(url)} />
          <p className="text-xs text-slate-500 mt-2">
            Upload a PDF document (max 16 MB). Students will be able to view it in-platform.
          </p>
        </div>
      )}
    </div>
  );
};
