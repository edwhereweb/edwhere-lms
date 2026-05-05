'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Loader2, ExternalLink, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BatchContentTask, BatchContentSubmission } from '@/actions/get-batches';

interface Student {
  userId: string;
  name: string;
}

interface TaskGraderProps {
  batchId: string;
  moduleId: string;
  itemId: string;
  task: BatchContentTask;
  enrolledStudents: Student[];
}

export function TaskGrader({ batchId, moduleId, itemId, task, enrolledStudents }: TaskGraderProps) {
  // Build a map from userId → submission for O(1) lookup
  const subMap = new Map<string, BatchContentSubmission>(
    task.submissions.map((s) => [s.userId, s])
  );

  const [marks, setMarks] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const s of task.submissions) {
      if (s.marks !== null) init[s.userId] = String(s.marks);
    }
    return init;
  });
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const handleGrade = async (studentId: string) => {
    const raw = marks[studentId];
    const value = parseFloat(raw ?? '');
    if (isNaN(value) || value < 0) {
      toast.error('Enter a valid mark');
      return;
    }
    if (value > task.maxMarks) {
      toast.error(`Max marks: ${task.maxMarks}`);
      return;
    }
    try {
      setSaving((p) => ({ ...p, [studentId]: true }));
      await axios.post(
        `/api/teacher/offline-batches/${batchId}/modules/${moduleId}/items/${itemId}/grade`,
        { userId: studentId, marks: value }
      );
      setSaved((p) => ({ ...p, [studentId]: true }));
      setTimeout(() => setSaved((p) => ({ ...p, [studentId]: false })), 2000);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving((p) => ({ ...p, [studentId]: false }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <h3 className="font-semibold text-sm">{task.description}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Max Marks: <span className="font-medium">{task.maxMarks}</span>
            {' · '}Submission:{' '}
            <span className="font-medium capitalize">{task.submissionType.toLowerCase()}</span>
          </p>
        </div>
      </div>

      {enrolledStudents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No students enrolled yet.</p>
      ) : (
        <div className="divide-y border rounded-lg">
          {enrolledStudents.map((student) => {
            const sub = subMap.get(student.userId);
            const isSaving = saving[student.userId] ?? false;
            const isSaved = saved[student.userId] ?? false;

            return (
              <div key={student.userId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{student.name}</p>
                  {task.submissionType === 'ONLINE' && sub?.driveLink ? (
                    <a
                      href={sub.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-0.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View submission
                    </a>
                  ) : task.submissionType === 'ONLINE' ? (
                    <p className="text-xs text-muted-foreground mt-0.5">No submission yet</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Input
                    id={`marks-${student.userId}`}
                    type="number"
                    min={0}
                    max={task.maxMarks}
                    step="0.5"
                    placeholder={`/ ${task.maxMarks}`}
                    value={marks[student.userId] ?? ''}
                    onChange={(e) => setMarks((p) => ({ ...p, [student.userId]: e.target.value }))}
                    className="w-24 h-8 text-sm text-right"
                    disabled={isSaving}
                  />
                  <Button
                    id={`grade-btn-${student.userId}`}
                    size="sm"
                    variant={isSaved ? 'outline' : 'default'}
                    className="h-8 w-16"
                    onClick={() => handleGrade(student.userId)}
                    disabled={isSaving || !marks[student.userId]}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isSaved ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
