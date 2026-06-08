'use client';

import { useState } from 'react';
import { TaskGrader } from './task-grader';
import { ClipboardList, Award, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { BatchContentModule } from '@/actions/get-batches';

interface Student {
  userId: string;
  name: string;
}

interface GradingHubProps {
  batchId: string;
  modules: BatchContentModule[];
  enrolledStudents: Student[];
}

export function GradingHub({ batchId, modules, enrolledStudents }: GradingHubProps) {
  // Extract all items of type TASK that have a task sub-object
  const allTasks = modules.flatMap((m) =>
    m.items
      .filter((i) => i.type === 'TASK' && i.task)
      .map((i) => ({
        moduleId: m.id,
        moduleTitle: m.title,
        itemId: i.id,
        itemTitle: i.title,
        task: i.task!
      }))
  );

  const [activeTaskId, setActiveTaskId] = useState<string>(() =>
    allTasks.length > 0 ? allTasks[0].task.id : ''
  );

  if (allTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed rounded-xl bg-card">
        <ClipboardList className="h-10 w-10 text-muted-foreground/60 mb-3" />
        <h4 className="text-base font-semibold text-foreground">No Tasks Created Yet</h4>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          There are no graded tasks in this batch yet. Add a **Task** inside the Curriculum Timeline
          to configure submission requirements and marks.
        </p>
      </div>
    );
  }

  const activeTaskInfo = allTasks.find((t) => t.task.id === activeTaskId) || allTasks[0];

  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      {/* Task List (Left Sidebar) */}
      <div className="space-y-3 md:col-span-1">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          Graded Tasks
        </h3>
        <div className="space-y-2">
          {allTasks.map((t) => {
            const task = t.task;
            const gradedCount = task.submissions.filter((s) => s.marks !== null).length;
            const totalCount = enrolledStudents.length;
            const isFullyGraded = totalCount > 0 && gradedCount === totalCount;
            const isActive = task.id === activeTaskId;

            return (
              <button
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
                className={cn(
                  'w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2',
                  isActive
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted/40'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-sm line-clamp-1">{t.itemTitle}</span>
                  {isFullyGraded ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Award className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{t.moduleTitle}</p>
                <div className="mt-1 w-full space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                    <span>Grading Progress</span>
                    <span>
                      {gradedCount} / {totalCount} (
                      {totalCount > 0 ? Math.round((gradedCount / totalCount) * 100) : 0}%)
                    </span>
                  </div>
                  <Progress
                    value={totalCount > 0 ? (gradedCount / totalCount) * 100 : 0}
                    className="h-1"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grading View (Right Panel) */}
      <div className="md:col-span-2 border rounded-xl p-6 bg-card shadow-sm">
        <div className="mb-4 pb-4 border-b">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {activeTaskInfo.moduleTitle}
          </span>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-2">
            {activeTaskInfo.itemTitle}
          </h2>
        </div>

        <TaskGrader
          batchId={batchId}
          moduleId={activeTaskInfo.moduleId}
          itemId={activeTaskInfo.itemId}
          task={activeTaskInfo.task}
          enrolledStudents={enrolledStudents}
        />
      </div>
    </div>
  );
}
