'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FileText,
  Link2,
  ClipboardList,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BatchContentModule, BatchContentSubmission } from '@/actions/get-batches';

// Note: StudentMcq requires dynamic fetching, so we will handle it with a client fetch hook internally or just a button.
const ITEM_TYPE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  PDF: { icon: FileText, label: 'PDF', color: 'text-rose-500' },
  RESOURCE_LINK: { icon: Link2, label: 'Resource Link', color: 'text-blue-500' },
  TASK: { icon: ClipboardList, label: 'Task', color: 'text-amber-500' },
  OFFLINE_SESSION: { icon: CalendarClock, label: 'Offline Session', color: 'text-violet-500' }
};

interface StudentBatchContentProps {
  batchId: string;
  modules: BatchContentModule[];
  isPreview?: boolean;
}

function SubmissionStatus({ sub, maxMarks }: { sub?: BatchContentSubmission; maxMarks: number }) {
  if (!sub) return null;
  return (
    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
      {sub.driveLink && (
        <a
          href={sub.driveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-500 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          View submitted link
        </a>
      )}
      {sub.marks !== null && (
        <span className="flex items-center gap-1 font-medium text-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Marks: {sub.marks} / {maxMarks}
        </span>
      )}
    </div>
  );
}

export function StudentBatchContent({
  batchId,
  modules,
  isPreview = false
}: StudentBatchContentProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.map((m) => m.id))
  );
  const [driveLinks, setDriveLinks] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [submissions, setSubmissions] = useState<Record<string, BatchContentSubmission>>(() => {
    const init: Record<string, BatchContentSubmission> = {};
    for (const m of modules) {
      for (const i of m.items) {
        if (i.task?.submissions[0]) init[i.id] = i.task.submissions[0];
      }
    }
    return init;
  });
  const [mcqData, setMcqData] = useState<Record<string, { windowOpen: boolean; title: string }>>(
    {}
  );
  const [loadingMcq, setLoadingMcq] = useState<Record<string, boolean>>({});

  const loadMcq = async (itemId: string) => {
    try {
      setLoadingMcq((p) => ({ ...p, [itemId]: true }));
      const { data } = await axios.get(
        `/api/student/offline-batches/${batchId}/sessions/${itemId}/mcq`
      );
      setMcqData((p) => ({ ...p, [itemId]: data }));
    } catch {
      toast.error('MCQ not available right now');
    } finally {
      setLoadingMcq((p) => ({ ...p, [itemId]: false }));
    }
  };

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async (itemId: string) => {
    const link = driveLinks[itemId]?.trim();
    if (!link) {
      toast.error('Paste your Google Drive link');
      return;
    }
    try {
      setSubmitting((p) => ({ ...p, [itemId]: true }));
      const { data } = await axios.post(
        `/api/student/offline-batches/${batchId}/tasks/${itemId}/submit`,
        { driveLink: link }
      );
      setSubmissions((p) => ({ ...p, [itemId]: data }));
      setDriveLinks((p) => ({ ...p, [itemId]: '' }));
      toast.success('Submitted!');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        toast.error(err.response.data?.error ?? 'Something went wrong');
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setSubmitting((p) => ({ ...p, [itemId]: false }));
    }
  };

  if (modules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No content has been added to this batch yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((mod) => {
        const expanded = expandedModules.has(mod.id);
        return (
          <div key={mod.id} className="border rounded-lg overflow-hidden">
            {/* Module header */}
            <button
              id={`module-toggle-${mod.id}`}
              onClick={() => toggleModule(mod.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <span className="font-semibold text-sm">{mod.title}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {mod.items.length} item{mod.items.length !== 1 ? 's' : ''}
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>

            {expanded && (
              <div className="divide-y">
                {mod.items.map((item) => {
                  const meta = ITEM_TYPE_META[item.type] ?? ITEM_TYPE_META.PDF;
                  const Icon = meta.icon;
                  const mySub = submissions[item.id];

                  return (
                    <div key={item.id} className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', meta.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{item.title}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {meta.label}
                            </Badge>
                          </div>

                          {/* PDF */}
                          {item.type === 'PDF' && item.pdfUrl && (
                            <a
                              href={item.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open PDF
                            </a>
                          )}

                          {/* Resource Link */}
                          {item.type === 'RESOURCE_LINK' && item.resourceUrl && (
                            <a
                              href={item.resourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm text-blue-500 hover:underline"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open Link
                            </a>
                          )}

                          {/* Task */}
                          {item.type === 'TASK' && item.task && (
                            <div className="mt-1 space-y-2">
                              <p className="text-sm text-muted-foreground">
                                {item.task.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Max marks: <span className="font-medium">{item.task.maxMarks}</span>
                              </p>

                              {item.task.submissionType === 'ONLINE' && !isPreview && (
                                <div className="flex gap-2 items-center mt-2">
                                  <Input
                                    id={`drive-link-${item.id}`}
                                    placeholder="Paste Google Drive link…"
                                    value={driveLinks[item.id] ?? ''}
                                    onChange={(e) =>
                                      setDriveLinks((p) => ({ ...p, [item.id]: e.target.value }))
                                    }
                                    className="h-8 text-sm max-w-xs"
                                    disabled={submitting[item.id]}
                                  />
                                  <Button
                                    id={`submit-task-${item.id}`}
                                    size="sm"
                                    className="h-8"
                                    onClick={() => handleSubmit(item.id)}
                                    disabled={submitting[item.id] || !driveLinks[item.id]?.trim()}
                                  >
                                    {submitting[item.id] ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      'Submit'
                                    )}
                                  </Button>
                                </div>
                              )}

                              {item.task.submissionType === 'OFFLINE' && !isPreview && (
                                <p className="text-xs text-muted-foreground italic">
                                  Offline submission — hand in to your instructor directly.
                                </p>
                              )}

                              <SubmissionStatus sub={mySub} maxMarks={item.task.maxMarks} />
                            </div>
                          )}

                          {/* Offline Session */}
                          {item.type === 'OFFLINE_SESSION' && item.session ? (
                            <div className="mt-2 space-y-3">
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarClock className="h-3 w-3" />
                                  {new Date(item.session.scheduledAt).toLocaleString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                {item.session.location && (
                                  <span>Location: {item.session.location}</span>
                                )}
                                {item.session.meetLink && (
                                  <a
                                    href={item.session.meetLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                  >
                                    Join Meeting
                                  </a>
                                )}
                              </div>
                              <div className="pt-2">
                                {item.session.uploads?.length > 0 ? (
                                  <div className="mb-4 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                      Materials
                                    </p>
                                    {item.session.uploads.map((u) => (
                                      <a
                                        key={u.id}
                                        href={u.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50 transition-colors"
                                      >
                                        <FileText className="h-4 w-4 text-rose-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate">
                                            {u.filename}
                                          </p>
                                          <p className="text-xs text-muted-foreground capitalize">
                                            {u.type}
                                          </p>
                                        </div>
                                      </a>
                                    ))}
                                  </div>
                                ) : item.session.completedAt ? (
                                  <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded border border-amber-500/20 mb-4">
                                    Notes pending upload/approval.
                                  </p>
                                ) : null}

                                {item.session.attendanceStatus === 'ABSENT' ? (
                                  <p className="text-xs text-red-600 bg-red-500/10 p-2 rounded border border-red-500/20">
                                    MCQ unavailable: Marked absent for this session.
                                  </p>
                                ) : mcqData[item.id] ? (
                                  <div className="mt-2">
                                    {/* We dynamically import the MCQ component to avoid circular deps or complex passing, or we just render it if we have the data */}
                                    {mcqData[item.id].windowOpen ? (
                                      <div className="border rounded p-3">
                                        <p className="font-semibold text-sm mb-2">
                                          {mcqData[item.id].title}
                                        </p>
                                        <p className="text-xs text-muted-foreground mb-3">
                                          MCQ questions have been loaded. Please submit via the
                                          standalone MCQ view.
                                        </p>
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            (window.location.href = `/offline-batches/${batchId}/sessions/${item.id}/mcq`)
                                          }
                                          className="h-8"
                                        >
                                          Take MCQ Assessment
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                        The MCQ window is not open. You can only access the MCQ
                                        during the session or up to 30 minutes after it finishes.
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => loadMcq(item.id)}
                                    disabled={loadingMcq[item.id] || isPreview}
                                  >
                                    {loadingMcq[item.id] ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      'Check MCQ Availability'
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : item.type === 'OFFLINE_SESSION' ? (
                            <p className="text-xs text-muted-foreground italic mt-1">
                              Session details not configured yet.
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
