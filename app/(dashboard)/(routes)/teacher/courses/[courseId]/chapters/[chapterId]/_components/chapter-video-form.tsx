'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Video, Upload, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { type Chapter, type MuxData } from '@prisma/client';
import MuxPlayer from '@mux/mux-player-react';

import { Button } from '@/components/ui/button';

interface ChapterVideoFormProps {
  initialData: Chapter & { muxData?: MuxData | null };
  courseId: string;
  chapterId: string;
}

type UploadState =
  | { phase: 'idle' }
  | { phase: 'uploading'; progress: number }
  | { phase: 'processing' }
  | { phase: 'done' }
  | { phase: 'error'; message: string };

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ChapterVideoForm = ({ initialData, courseId, chapterId }: ChapterVideoFormProps) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ phase: 'idle' });

  // When the chapter gains a playbackId (e.g. after an Asset Library import or a
  // completed upload), automatically leave edit mode so the Mux player is shown.
  useEffect(() => {
    if (initialData.muxData?.playbackId) {
      setIsEditing(false);
      setSelectedFile(null);
      setUploadState({ phase: 'idle' });
    }
  }, [initialData.muxData?.playbackId]);

  const toggleEdit = () => {
    setIsEditing((c) => !c);
    setSelectedFile(null);
    setUploadState({ phase: 'idle' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }
    setSelectedFile(file);
    setUploadState({ phase: 'idle' });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file?.type.startsWith('video/')) {
      toast.error('Please drop a video file');
      return;
    }
    setSelectedFile(file);
    setUploadState({ phase: 'idle' });
  };

  const pollUntilReady = async (uploadId: string) => {
    const MAX_POLLS = 80; // ~4 min
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/admin/asset-library/mux-upload/${uploadId}`);
        const data = await res.json();
        if (data.status === 'asset_created') {
          setUploadState({ phase: 'done' });
          router.refresh();
          return;
        }
        if (data.status === 'errored') throw new Error('Mux processing failed');
      } catch (err) {
        if (err instanceof Error && err.message === 'Mux processing failed') throw err;
        // transient — keep polling
      }
    }
    throw new Error('Timed out waiting for Mux to process the video');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      // 1. Get a Mux Direct Upload URL for this chapter
      const { data } = await axios.post(
        `/api/courses/${courseId}/chapters/${chapterId}/mux-upload`
      );
      const { uploadUrl, uploadId } = data as { uploadUrl: string; uploadId: string };

      // 2. PUT the file directly to Mux
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', selectedFile.type || 'video/mp4');

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadState({
              phase: 'uploading',
              progress: Math.round((e.loaded / e.total) * 100)
            });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadState({ phase: 'processing' });
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(selectedFile);
      });

      // 3. Poll Mux until asset is ready
      await pollUntilReady(uploadId);
      toast.success('Video uploaded and ready');
      toggleEdit();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadState({ phase: 'error', message: msg });
      toast.error(msg);
    }
  };

  const hasVideo = !!initialData.muxData?.playbackId;
  const isUploading = uploadState.phase === 'uploading' || uploadState.phase === 'processing';

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-4 dark:bg-gray-800 dark:text-slate-300">
      {/* Header */}
      <div className="font-medium flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          Chapter video
        </span>
        <Button onClick={toggleEdit} variant="ghost" disabled={isUploading}>
          {isEditing ? 'Cancel' : hasVideo ? 'Replace video' : 'Add video'}
        </Button>
      </div>

      {/* Preview */}
      {!isEditing && (
        <>
          {hasVideo ? (
            <div className="relative aspect-video mt-2">
              <MuxPlayer playbackId={initialData.muxData!.playbackId!} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-60 bg-slate-200 rounded-md dark:bg-gray-700 mt-2">
              <Video className="h-10 w-10 text-slate-500" />
            </div>
          )}
          {hasVideo && (
            <p className="text-xs text-muted-foreground mt-2">
              Video is stored and streamed via Mux.
            </p>
          )}
        </>
      )}

      {/* Upload UI */}
      {isEditing && (
        <div className="mt-4 space-y-4">
          {/* Drop zone */}
          {!selectedFile && (
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10"
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Drop a video file here</p>
              <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Selected file info */}
          {selectedFile && uploadState.phase === 'idle' && (
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <Video className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(selectedFile.size)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Progress */}
          {uploadState.phase === 'uploading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading to Mux…</span>
                <span className="font-medium">{uploadState.progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadState.progress}%` }}
                />
              </div>
            </div>
          )}

          {uploadState.phase === 'processing' && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Mux is processing your video… this may take a minute.
            </div>
          )}

          {uploadState.phase === 'done' && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Video ready — refreshing…
            </div>
          )}

          {uploadState.phase === 'error' && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {uploadState.message}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {selectedFile && uploadState.phase === 'idle' && (
              <Button onClick={handleUpload} className="gap-2">
                <Upload className="h-4 w-4" />
                Upload to Mux
              </Button>
            )}
            {isUploading && (
              <Button disabled className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {uploadState.phase === 'uploading' ? 'Uploading…' : 'Processing…'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
