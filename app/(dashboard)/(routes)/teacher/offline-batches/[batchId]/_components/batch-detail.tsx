'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Loader2,
  Trash2,
  UserPlus,
  BookPlus,
  X,
  CalendarDays,
  Users,
  BookOpen,
  LayoutList,
  Eye
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BatchContentEditor } from './batch-content-editor';
import { TaskGrader } from './task-grader';
import type { BatchContentModule } from '@/actions/get-batches';

interface Course {
  id: string;
  title: string;
  imageUrl: string | null;
  isPublished: boolean;
}

interface BatchCourseRow {
  id: string;
  courseId: string;
  course: Course;
}

interface Enrollment {
  id: string;
  userId: string;
  enrolledBy: string;
  createdAt: string;
}

interface BatchDetailProps {
  batchId: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  courses: BatchCourseRow[];
  enrollments: Enrollment[];
  isAdmin: boolean;
  allCourses: { id: string; title: string }[];
  modules: BatchContentModule[];
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  draft: 'bg-muted text-muted-foreground',
  archived: 'bg-orange-500/15 text-orange-700 dark:text-orange-400'
};

export function BatchDetail({
  batchId,
  title,
  description,
  startDate,
  endDate,
  status,
  courses: initialCourses,
  enrollments: initialEnrollments,
  isAdmin,
  allCourses,
  modules
}: BatchDetailProps) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [enrollments, setEnrollments] = useState(initialEnrollments);

  const [addCourseId, setAddCourseId] = useState('');
  const [enrollUserId, setEnrollUserId] = useState('');
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [removingCourse, setRemovingCourse] = useState<string | null>(null);
  const [removingEnroll, setRemovingEnroll] = useState<string | null>(null);

  const availableCourses = allCourses.filter((c) => !courses.some((bc) => bc.courseId === c.id));

  const handleAddCourse = async () => {
    if (!addCourseId) {
      toast.error('Select a course to add');
      return;
    }
    try {
      setLoadingCourse(true);
      await axios.post(`/api/teacher/offline-batches/${batchId}/courses`, {
        courseId: addCourseId
      });
      toast.success('Course added');
      setAddCourseId('');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoadingCourse(false);
    }
  };

  const handleRemoveCourse = async (courseId: string) => {
    try {
      setRemovingCourse(courseId);
      await axios.delete(`/api/teacher/offline-batches/${batchId}/courses`, {
        data: { courseId }
      });
      setCourses((prev) => prev.filter((bc) => bc.courseId !== courseId));
      toast.success('Course removed');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRemovingCourse(null);
    }
  };

  const handleEnroll = async () => {
    if (!enrollUserId.trim()) {
      toast.error('Enter a student user ID');
      return;
    }
    try {
      setLoadingEnroll(true);
      await axios.post(`/api/teacher/offline-batches/${batchId}/enroll`, {
        userId: enrollUserId.trim()
      });
      toast.success('Student enrolled');
      setEnrollUserId('');
      router.refresh();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        toast.error(err.response.data?.error ?? 'Something went wrong');
      } else {
        toast.error('Something went wrong');
      }
    } finally {
      setLoadingEnroll(false);
    }
  };

  const handleUnenroll = async (userId: string) => {
    try {
      setRemovingEnroll(userId);
      await axios.delete(`/api/teacher/offline-batches/${batchId}/enroll`, {
        data: { userId }
      });
      setEnrollments((prev) => prev.filter((e) => e.userId !== userId));
      toast.success('Student removed from batch');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRemovingEnroll(null);
    }
  };

  const handleDeleteBatch = async () => {
    if (!confirm('Delete this batch? This cannot be undone.')) return;
    try {
      await axios.delete(`/api/teacher/offline-batches/${batchId}`);
      toast.success('Batch deleted');
      router.push('/teacher/offline-batches');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="space-y-6">
      {/* Batch header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <Badge className={cn('capitalize', STATUS_BADGE[status] ?? 'bg-muted')}>{status}</Badge>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            <span>
              {formatDate(startDate)} → {formatDate(endDate)}
            </span>
          </div>
        </div>
        {isAdmin && (
          <Button id="delete-batch-btn" variant="destructive" size="sm" onClick={handleDeleteBatch}>
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete Batch
          </Button>
        )}
        <Link href={`/teacher/offline-batches/${batchId}/preview`}>
          <Button id="preview-batch-btn" variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-1.5" />
            Preview
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content">
        <TabsList id="batch-detail-tabs">
          <TabsTrigger value="content" id="tab-content">
            <LayoutList className="h-4 w-4 mr-1.5" />
            Content
          </TabsTrigger>
          <TabsTrigger value="courses" id="tab-courses">
            <BookOpen className="h-4 w-4 mr-1.5" />
            Courses ({courses.length})
          </TabsTrigger>
          <TabsTrigger value="students" id="tab-students">
            <Users className="h-4 w-4 mr-1.5" />
            Students ({enrollments.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Content tab ── */}
        <TabsContent value="content" className="mt-6">
          <BatchContentEditor batchId={batchId} initialModules={modules} />

          {/* Task graders — rendered per TASK item across all modules */}
          {modules.flatMap((m) =>
            m.items
              .filter((i) => i.type === 'TASK' && i.task)
              .map((i) => (
                <div key={i.id} className="mt-6 border rounded-lg p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                    {m.title} › {i.title}
                  </p>
                  <TaskGrader
                    batchId={batchId}
                    moduleId={m.id}
                    itemId={i.id}
                    task={i.task!}
                    enrolledStudents={enrollments.map((e) => ({
                      userId: e.userId,
                      name: e.userId
                    }))}
                  />
                </div>
              ))
          )}
        </TabsContent>

        {/* ── Courses tab ── */}
        <TabsContent value="courses" className="mt-6 space-y-4">
          {/* Add course */}
          <div className="flex gap-2 items-center">
            <select
              id="add-course-select"
              value={addCourseId}
              onChange={(e) => setAddCourseId(e.target.value)}
              className="flex-1 max-w-sm p-2 border rounded-md bg-background text-foreground text-sm"
            >
              <option value="">— Select a course to add —</option>
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <Button
              id="add-course-btn"
              size="sm"
              onClick={handleAddCourse}
              disabled={loadingCourse || !addCourseId}
            >
              {loadingCourse ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <BookPlus className="h-4 w-4 mr-1.5" />
                  Add
                </>
              )}
            </Button>
          </div>

          {/* Course list */}
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No courses in this batch yet.
            </p>
          ) : (
            <div className="divide-y border rounded-lg">
              {courses.map((bc) => (
                <div
                  key={bc.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/40"
                >
                  <div>
                    <p className="text-sm font-medium">{bc.course.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {bc.course.isPublished ? 'Published' : 'Draft'}
                    </p>
                  </div>
                  <Button
                    id={`remove-course-${bc.courseId}`}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveCourse(bc.courseId)}
                    disabled={removingCourse === bc.courseId}
                  >
                    {removingCourse === bc.courseId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Students tab ── */}
        <TabsContent value="students" className="mt-6 space-y-4">
          {/* Enroll student */}
          <div className="flex gap-2 items-center">
            <Input
              id="enroll-user-input"
              placeholder="Student Clerk userId…"
              value={enrollUserId}
              onChange={(e) => setEnrollUserId(e.target.value)}
              className="flex-1 max-w-sm"
            />
            <Button
              id="enroll-student-btn"
              size="sm"
              onClick={handleEnroll}
              disabled={loadingEnroll || !enrollUserId.trim()}
            >
              {loadingEnroll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1.5" />
                  Enroll
                </>
              )}
            </Button>
          </div>

          {/* Student list */}
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No students enrolled yet.
            </p>
          ) : (
            <div className="divide-y border rounded-lg">
              {enrollments.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-muted/40"
                >
                  <div>
                    <p className="text-sm font-mono font-medium">{e.userId}</p>
                    <p className="text-xs text-muted-foreground">
                      Enrolled by {e.enrolledBy} ·{' '}
                      {new Date(e.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <Button
                    id={`remove-student-${e.userId}`}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleUnenroll(e.userId)}
                    disabled={removingEnroll === e.userId}
                  >
                    {removingEnroll === e.userId ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
