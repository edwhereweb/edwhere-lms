'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Loader2,
  CheckCircle2,
  Clock,
  MapPin,
  Link2,
  Users,
  Upload,
  ClipboardList,
  PlusCircle,
  Trash2,
  AlertTriangle,
  FileText,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  location: string | null;
  meetLink: string | null;
  instructorId: string;
  completedAt: string | null;
  coInstructors: { id: string; userId: string }[];
  uploads: {
    id: string;
    type: string;
    filename: string;
    fileUrl: string;
    status: string;
    logs: { isLate: boolean }[];
  }[];
  mcq: {
    id: string;
    title: string;
    questions: { id: string; body: string; options: string[]; correctOption: number }[];
  } | null;
}

interface SessionDetailProps {
  batchId: string;
  moduleId: string;
  itemId: string;
}

const STATUS_COLORS: Record<string, string> = {
  APPROVED: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  PENDING: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  REJECTED: 'bg-red-500/15 text-red-600 dark:text-red-400'
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function SessionDetail({ batchId, moduleId, itemId }: SessionDetailProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Co-instructor add
  const [coUserId, setCoUserId] = useState('');
  const [addingCo, setAddingCo] = useState(false);

  // Upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'slides' | 'notes'>('slides');
  const [uploading, setUploading] = useState(false);

  // MCQ
  const [mcqTitle, setMcqTitle] = useState('Session MCQ');
  const [creatingMcq, setCreatingMcq] = useState(false);
  const [questionBody, setQuestionBody] = useState('');
  const [questionOptions, setQuestionOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState(0);
  const [addingQuestion, setAddingQuestion] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session`
      );
      setSession(data);
    } catch {
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [batchId, moduleId, itemId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleComplete = async () => {
    if (!confirm('Mark this session as complete? This will start the 30-minute MCQ window.'))
      return;
    try {
      setCompleting(true);
      const { data } = await axios.post(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/complete`,
        {}
      );
      setSession((s) => (s ? { ...s, completedAt: data.completedAt } : s));
      toast.success('Session marked complete');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setCompleting(false);
    }
  };

  const handleAddCo = async () => {
    if (!coUserId.trim()) {
      toast.error('Enter a user ID');
      return;
    }
    try {
      setAddingCo(true);
      const { data } = await axios.post(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/co-instructors`,
        { userId: coUserId.trim() }
      );
      setSession((s) => (s ? { ...s, coInstructors: [...s.coInstructors, data] } : s));
      setCoUserId('');
      toast.success('Co-instructor added');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) toast.error(err.response.data?.error ?? 'Error');
      else toast.error('Something went wrong');
    } finally {
      setAddingCo(false);
    }
  };

  const handleRemoveCo = async (userId: string) => {
    try {
      await axios.delete(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/co-instructors`,
        { data: { userId } }
      );
      setSession((s) =>
        s ? { ...s, coInstructors: s.coInstructors.filter((c) => c.userId !== userId) } : s
      );
      toast.success('Removed');
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !session) {
      toast.error('Select a file first');
      return;
    }
    try {
      setUploading(true);
      // Step 1: get presigned URL
      const { data: presign } = await axios.post('/api/upload/presign', {
        type: uploadType === 'slides' ? 'sessionSlides' : 'sessionNotes',
        filename: uploadFile.name,
        contentType: 'application/pdf',
        sessionId: session.id
      });
      // Step 2: PUT to R2
      await axios.put(presign.uploadUrl, uploadFile, {
        headers: { 'Content-Type': 'application/pdf' }
      });
      const fileUrl = `/api/files/${presign.key}`;
      // Step 3: register in DB
      const { data: upload } = await axios.post(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/uploads`,
        { fileUrl, filename: uploadFile.name, type: uploadType }
      );
      setSession((s) => (s ? { ...s, uploads: [...s.uploads, upload] } : s));
      if (upload.isLate) {
        toast.error('Uploaded late — pending admin approval before students can view this file.');
      } else {
        toast.success('File uploaded successfully');
      }
      setUploadFile(null);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response)
        toast.error(err.response.data?.error ?? 'Upload failed');
      else toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm('Delete this file?')) return;
    try {
      await axios.delete(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/uploads/${uploadId}`
      );
      setSession((s) => (s ? { ...s, uploads: s.uploads.filter((u) => u.id !== uploadId) } : s));
      toast.success('File deleted');
    } catch {
      toast.error('Something went wrong');
    }
  };

  const handleCreateMcq = async () => {
    try {
      setCreatingMcq(true);
      const { data } = await axios.post(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/mcq`,
        { title: mcqTitle }
      );
      setSession((s) => (s ? { ...s, mcq: { ...data, questions: [] } } : s));
      toast.success('MCQ created');
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) toast.error(err.response.data?.error ?? 'Error');
      else toast.error('Something went wrong');
    } finally {
      setCreatingMcq(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!session?.mcq) return;
    if (!questionBody.trim()) {
      toast.error('Question text required');
      return;
    }
    if (questionOptions.some((o) => !o.trim())) {
      toast.error('All 4 options are required');
      return;
    }
    try {
      setAddingQuestion(true);
      const { data } = await axios.patch(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/mcq`,
        { body: questionBody.trim(), options: questionOptions.map((o) => o.trim()), correctOption }
      );
      setSession((s) =>
        s && s.mcq ? { ...s, mcq: { ...s.mcq, questions: [...s.mcq.questions, data] } } : s
      );
      setQuestionBody('');
      setQuestionOptions(['', '', '', '']);
      setCorrectOption(0);
      toast.success('Question added');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await axios.delete(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/session/mcq`,
        { data: { questionId } }
      );
      setSession((s) =>
        s && s.mcq
          ? {
              ...s,
              mcq: { ...s.mcq, questions: s.mcq.questions.filter((q) => q.id !== questionId) }
            }
          : s
      );
      toast.success('Question deleted');
    } catch {
      toast.error('Something went wrong');
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  if (!session)
    return (
      <p className="text-sm text-muted-foreground text-center py-6">Session not configured yet.</p>
    );

  return (
    <div className="space-y-6">
      {/* Session Meta */}
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4 shrink-0" />
          {formatDateTime(session.scheduledAt)} · {session.durationMinutes} min
        </div>
        {session.location && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            {session.location}
          </div>
        )}
        {session.meetLink && (
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <a
              href={session.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline truncate"
            >
              {session.meetLink}
            </a>
          </div>
        )}
        <div className="flex items-center gap-2">
          {session.completedAt ? (
            <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Completed {formatDateTime(session.completedAt)}
            </span>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleComplete}
              disabled={completing}
              className="h-7 text-xs"
            >
              {completing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Mark Complete'}
            </Button>
          )}
        </div>
      </div>

      {/* Co-instructors */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Co-instructors
        </h4>
        <div className="flex flex-wrap gap-2">
          {session.coInstructors.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1.5 text-xs bg-muted rounded px-2 py-1"
            >
              {c.userId}
              <button
                onClick={() => handleRemoveCo(c.userId)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={coUserId}
            onChange={(e) => setCoUserId(e.target.value)}
            placeholder="Clerk User ID of co-instructor"
            className="h-8 text-sm max-w-xs"
          />
          <Button
            size="sm"
            className="h-8"
            onClick={handleAddCo}
            disabled={addingCo || !coUserId.trim()}
          >
            {addingCo ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Uploads */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Upload className="h-3.5 w-3.5" />
          Slides &amp; Notes
        </h4>
        {session.uploads.length > 0 && (
          <div className="divide-y border rounded-lg">
            {session.uploads.map((u) => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2">
                <FileText className="h-4 w-4 text-rose-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{u.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={cn('text-xs capitalize', STATUS_COLORS[u.status])}>
                      {u.status}
                    </Badge>
                    {u.status === 'PENDING' && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Awaiting admin approval
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground capitalize">{u.type}</span>
                    {u.logs.some((l) => l.isLate) && (
                      <span className="text-xs text-orange-500">Late upload</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteUpload(u.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            id="session-file-input"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => document.getElementById('session-file-input')?.click()}
          >
            {uploadFile ? uploadFile.name : 'Choose PDF…'}
          </Button>
          <select
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value as 'slides' | 'notes')}
            className="h-8 text-xs border rounded bg-background px-2"
          >
            <option value="slides">Slides</option>
            <option value="notes">Notes</option>
          </select>
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>

      {/* MCQ */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          MCQ
        </h4>
        {!session.mcq ? (
          <div className="flex items-center gap-2">
            <Input
              value={mcqTitle}
              onChange={(e) => setMcqTitle(e.target.value)}
              placeholder="MCQ title"
              className="h-8 text-sm max-w-xs"
            />
            <Button size="sm" className="h-8" onClick={handleCreateMcq} disabled={creatingMcq}>
              {creatingMcq ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Create MCQ'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {session.mcq.title}{' '}
              <span className="text-xs text-muted-foreground">
                ({session.mcq.questions.length} questions)
              </span>
            </p>

            {/* Question list */}
            {session.mcq.questions.length > 0 && (
              <div className="space-y-2">
                {session.mcq.questions.map((q, idx) => (
                  <div key={q.id} className="border rounded p-3 text-sm space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">
                        Q{idx + 1}. {q.body}
                      </span>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <ul className="space-y-0.5 pl-4">
                      {q.options.map((opt, i) => (
                        <li
                          key={i}
                          className={cn(
                            'text-xs',
                            i === q.correctOption &&
                              'text-emerald-600 font-medium flex items-center gap-1'
                          )}
                        >
                          {i === q.correctOption && <Check className="h-3 w-3" />}
                          {String.fromCharCode(65 + i)}. {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Add question form */}
            <div className="border rounded p-3 space-y-2 bg-muted/30">
              <p className="text-xs font-medium">Add Question</p>
              <Textarea
                value={questionBody}
                onChange={(e) => setQuestionBody(e.target.value)}
                placeholder="Question text…"
                rows={2}
                className="text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                {questionOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="correct"
                      checked={correctOption === i}
                      onChange={() => setCorrectOption(i)}
                      className="h-3.5 w-3.5 accent-emerald-500"
                      id={`opt-radio-${i}`}
                    />
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const o = [...questionOptions];
                        o[i] = e.target.value;
                        setQuestionOptions(o);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="h-7 text-xs flex-1"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Select the radio button next to the correct answer.
              </p>
              <Button
                size="sm"
                className="h-8"
                onClick={handleAddQuestion}
                disabled={addingQuestion}
              >
                {addingQuestion ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add Question'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
