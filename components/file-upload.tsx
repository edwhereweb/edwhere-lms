'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Upload, Loader2, FileIcon } from 'lucide-react';
import type { UploadType } from '@/lib/validations';

interface FileUploadProps {
  onChange: (url?: string, originalFilename?: string) => void;
  endpoint: UploadType;
  courseId?: string;
  chapterId?: string;
}

export const FileUpload = ({ onChange, endpoint, courseId, chapterId }: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setSelectedFile(file);
      setIsUploading(true);
      setProgress(0);

      try {
        const presignRes = await axios.post<{ uploadUrl: string; key: string }>(
          '/api/upload/presign',
          {
            type: endpoint,
            filename: file.name,
            contentType: file.type || undefined,
            courseId,
            chapterId
          }
        );

        const { uploadUrl, key } = presignRes.data;

        await axios.put(uploadUrl, file, {
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          onUploadProgress: (e) => {
            if (e.total) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          }
        });

        const fileUrl = `/api/files/${key}`;
        onChange(fileUrl, file.name);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.data?.error) {
          toast.error(error.response.data.error);
        } else {
          toast.error('Upload failed');
        }
      } finally {
        setIsUploading(false);
        setProgress(0);
        setSelectedFile(null);
      }
    },
    [endpoint, courseId, chapterId, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled: isUploading
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative flex flex-col items-center justify-center
        border-2 border-dashed rounded-lg p-6 cursor-pointer
        transition-colors duration-200
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-slate-300 dark:border-slate-600 hover:border-primary/50'}
        ${isUploading ? 'pointer-events-none opacity-70' : ''}
      `}
    >
      <input {...getInputProps()} />

      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <FileIcon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate max-w-[200px]">{selectedFile.name}</span>
            </div>
          )}
          <div className="w-full max-w-[200px] bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">{progress}%</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload className="h-10 w-10 text-slate-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isDragActive ? 'Drop the file here' : 'Drag & drop a file, or click to select'}
          </p>
        </div>
      )}
    </div>
  );
};
