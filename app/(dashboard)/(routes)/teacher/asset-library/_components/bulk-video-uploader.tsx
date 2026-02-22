'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
  FolderOpen
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  title: string;
}

type UploadStatus = 'pending' | 'uploading' | 'processing' | 'ready' | 'error';

interface VideoEntry {
  file: File;
  title: string;
  // After API call:
  chapterId?: string;
  uploadUrl?: string;
  uploadId?: string;
  // Progress
  status: UploadStatus;
  progress: number; // 0-100 during upload
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function StatusBadge({ status, progress }: { status: UploadStatus; progress: number }) {
  if (status === 'pending')
    return (
      <Badge variant="secondary" className="text-[10px]">
        Ready
      </Badge>
    );
  if (status === 'uploading')
    return (
      <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
        {progress}%
      </Badge>
    );
  if (status === 'processing')
    return (
      <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
        Processing…
      </Badge>
    );
  if (status === 'ready')
    return (
      <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
        Ready
      </Badge>
    );
  return (
    <Badge variant="destructive" className="text-[10px]">
      Error
    </Badge>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface BulkVideoUploaderProps {
  courses: Course[];
}

export const BulkVideoUploader = ({ courses }: BulkVideoUploaderProps) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [_isStarting, setIsStarting] = useState(false);

  // Reset everything when dialog closes
  const handleOpenChange = (val: boolean) => {
    if (!val) {
      setStep(1);
      setSelectedCourseId('');
      setVideos([]);
      setIsStarting(false);
    }
    setOpen(val);
  };

  // ── File selection ──────────────────────────────────────────────────────────
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newEntries: VideoEntry[] = Array.from(files)
      .filter((f) => f.type.startsWith('video/'))
      .map((f) => ({
        file: f,
        title: f.name.replace(/\.[^/.]+$/, ''), // strip extension for title
        status: 'pending',
        progress: 0
      }));
    if (newEntries.length === 0) {
      toast.error('Please select video files only');
      return;
    }
    setVideos((prev) => [...prev, ...newEntries]);
  };

  const removeVideo = (idx: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateTitle = (idx: number, title: string) => {
    setVideos((prev) => prev.map((v, i) => (i === idx ? { ...v, title } : v)));
  };

  // Drag-and-drop handlers
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  // ── Upload flow ─────────────────────────────────────────────────────────────

  const uploadFileDirect = (entry: VideoEntry, url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', entry.file.type || 'video/mp4');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setVideos((prev) =>
            prev.map((v) =>
              v.file === entry.file ? { ...v, progress: pct, status: 'uploading' } : v
            )
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setVideos((prev) =>
            prev.map((v) =>
              v.file === entry.file ? { ...v, status: 'processing', progress: 100 } : v
            )
          );
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(entry.file);
    });
  };

  const pollUntilReady = async (uploadId: string, file: File) => {
    const MAX_POLLS = 60; // ~3 min
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/admin/asset-library/mux-upload/${uploadId}`);
        const data = await res.json();
        if (data.status === 'asset_created') {
          setVideos((prev) => prev.map((v) => (v.file === file ? { ...v, status: 'ready' } : v)));
          return;
        }
        if (data.status === 'errored') {
          throw new Error('Mux processing failed');
        }
      } catch {
        // keep polling on transient errors
      }
    }
    throw new Error('Timed out waiting for Mux to process the video');
  };

  const handleStartUpload = async () => {
    if (videos.length === 0) return;
    setIsStarting(true);
    setStep(3);

    try {
      // Create all uploads in one API call
      const { data } = await axios.post('/api/admin/asset-library/mux-upload', {
        courseId: selectedCourseId,
        videos: videos.map((v) => ({ title: v.title }))
      });

      const uploads = data.uploads as {
        chapterId: string;
        uploadUrl: string;
        uploadId: string;
        title: string;
      }[];

      // Store upload metadata on each video entry
      setVideos((prev) =>
        prev.map((v, i) => ({
          ...v,
          chapterId: uploads[i].chapterId,
          uploadUrl: uploads[i].uploadUrl,
          uploadId: uploads[i].uploadId,
          status: 'uploading'
        }))
      );

      // Upload each file in parallel
      await Promise.allSettled(
        uploads.map(async (upload, i) => {
          const entry = videos[i];
          try {
            await uploadFileDirect(entry, upload.uploadUrl);
            await pollUntilReady(upload.uploadId, entry.file);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setVideos((prev) =>
              prev.map((v) => (v.file === entry.file ? { ...v, status: 'error', error: msg } : v))
            );
          }
        })
      );
    } catch {
      toast.error('Failed to start uploads. Please try again.');
      setStep(2);
    } finally {
      setIsStarting(false);
    }
  };

  const allDone =
    videos.length > 0 && videos.every((v) => v.status === 'ready' || v.status === 'error');
  const readyCount = videos.filter((v) => v.status === 'ready').length;

  const handleDone = () => {
    handleOpenChange(false);
    if (readyCount > 0) router.refresh();
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Videos
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Film className="h-5 w-5 text-primary" />
            Upload Videos to Asset Library
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Videos are uploaded directly to Mux and stored in your Asset Library.
          </p>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            {['Select course', 'Choose videos', 'Upload'].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <div className="h-px w-6 bg-border" />}
                <div
                  className={`flex items-center gap-1.5 text-xs font-medium ${
                    step === i + 1
                      ? 'text-primary'
                      : step > i + 1
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      step === i + 1
                        ? 'bg-primary text-primary-foreground'
                        : step > i + 1
                          ? 'bg-green-500 text-white'
                          : 'bg-muted'
                    }`}
                  >
                    {step > i + 1 ? '✓' : i + 1}
                  </div>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── Step 1: Course selector ──────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select the course these videos belong to. They will appear in the Asset Library
                under that course and can be imported into chapters later.
              </p>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a course…" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ── Step 2: File picker ──────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary/5"
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">Drop video files here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {/* File list with title editors */}
              {videos.length > 0 && (
                <div className="space-y-2">
                  {videos.map((v, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                    >
                      <Film className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <Input
                          value={v.title}
                          onChange={(e) => updateTitle(i, e.target.value)}
                          placeholder="Chapter title"
                          className="h-8 text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          {v.file.name} · {formatSize(v.file.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeVideo(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Upload progress ──────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-3">
              {videos.map((v, i) => (
                <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-3">
                    {v.status === 'ready' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    ) : v.status === 'error' ? (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    )}
                    <p className="text-sm font-medium flex-1 truncate">{v.title}</p>
                    <StatusBadge status={v.status} progress={v.progress} />
                  </div>

                  {/* Progress bar */}
                  {(v.status === 'uploading' || v.status === 'processing') && (
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          v.status === 'processing'
                            ? 'w-full bg-amber-400 animate-pulse'
                            : 'bg-primary'
                        }`}
                        style={v.status === 'uploading' ? { width: `${v.progress}%` } : undefined}
                      />
                    </div>
                  )}

                  {v.error && <p className="text-xs text-destructive">{v.error}</p>}
                </div>
              ))}

              {allDone && (
                <p className="text-sm text-center text-muted-foreground pt-2">
                  {readyCount} of {videos.length} video{videos.length !== 1 ? 's' : ''} ready in the
                  Asset Library.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t flex items-center justify-between shrink-0">
          {step === 1 && (
            <>
              <p className="text-xs text-muted-foreground">
                {courses.length} course{courses.length !== 1 ? 's' : ''} available
              </p>
              <Button disabled={!selectedCourseId} onClick={() => setStep(2)} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
              <Button
                disabled={videos.length === 0 || videos.some((v) => !v.title.trim())}
                onClick={handleStartUpload}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload {videos.length} video{videos.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <div /> {/* spacer */}
              <Button disabled={!allDone} onClick={handleDone} className="gap-2">
                {allDone ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Done
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
