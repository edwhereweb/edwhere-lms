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
  Eye,
  Upload,
  Award
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BatchContentEditor } from './batch-content-editor';
import { GradingHub } from './grading-hub';
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
  name?: string;
  email?: string;
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
  allowSameDayOfflineSession: boolean;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
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
  modules,
  allowSameDayOfflineSession
}: BatchDetailProps) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [enrollments, setEnrollments] = useState(initialEnrollments);

  const [addCourseId, setAddCourseId] = useState('');
  const [enrollInput, setEnrollInput] = useState('');
  const [loadingCourse, setLoadingCourse] = useState(false);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [removingCourse, setRemovingCourse] = useState<string | null>(null);
  const [removingEnroll, setRemovingEnroll] = useState<string | null>(null);

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configTitle, setConfigTitle] = useState(title);
  const [configDesc, setConfigDesc] = useState(description || '');
  const [configStart, setConfigStart] = useState(toDatetimeLocal(startDate));
  const [configEnd, setConfigEnd] = useState(toDatetimeLocal(endDate));
  const [configAllowSameDay, setConfigAllowSameDay] = useState(allowSameDayOfflineSession);
  const [savingConfig, setSavingConfig] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage] = useState(1);
  const itemsPerPage = 10;

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setEnrollInput((prev) => (prev ? prev + '\n' + text : text));
        toast.success('File loaded');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
    if (!enrollInput.trim()) {
      toast.error('Enter at least one email address');
      return;
    }
    const emails = enrollInput
      .split(/[\n,]+/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      toast.error('No valid emails found');
      return;
    }

    try {
      setLoadingEnroll(true);
      const { data } = await axios.post(`/api/teacher/offline-batches/${batchId}/enroll/bulk`, {
        emails
      });
      if (data.failed?.length > 0) {
        toast.error(`Enrolled ${data.enrolled.length}. Not found: ${data.failed.join(', ')}`, {
          duration: 6000
        });
      } else {
        toast.success(`Successfully enrolled ${data.enrolled.length} students`);
      }
      setEnrollInput('');
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

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true);
      await axios.patch(`/api/teacher/offline-batches/${batchId}`, {
        title: configTitle,
        description: configDesc,
        startDate: configStart ? new Date(configStart).toISOString() : null,
        endDate: configEnd ? new Date(configEnd).toISOString() : null,
        allowSameDayOfflineSession: configAllowSameDay
      });
      toast.success('Batch updated');
      setIsConfigOpen(false);
      router.refresh();
    } catch {
      toast.error('Failed to update batch');
    } finally {
      setSavingConfig(false);
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

  const filteredEnrollments = enrollments.filter((e) => {
    const searchLower = studentSearch.toLowerCase();
    return (
      e.userId.toLowerCase().includes(searchLower) ||
      e.name?.toLowerCase().includes(searchLower) ||
      e.email?.toLowerCase().includes(searchLower)
    );
  });

  const totalStudentPages = Math.ceil(filteredEnrollments.length / itemsPerPage);
  const paginatedEnrollments = filteredEnrollments.slice(
    (studentPage - 1) * itemsPerPage,
    studentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Batch header */}
      <div className="flex items-start justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h1>
            <Badge
              className={cn(
                'capitalize px-2.5 py-0.5 text-xs font-semibold',
                STATUS_BADGE[status] ?? 'bg-muted'
              )}
            >
              {status}
            </Badge>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              id="delete-batch-btn"
              variant="destructive"
              size="sm"
              onClick={handleDeleteBatch}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete Batch
            </Button>
          )}
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Edit Settings
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Batch Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={configTitle} onChange={(e) => setConfigTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea value={configDesc} onChange={(e) => setConfigDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="datetime-local"
                      value={configStart}
                      onChange={(e) => setConfigStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="datetime-local"
                      value={configEnd}
                      onChange={(e) => setConfigEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <Checkbox
                    id="edit-batch-allow-same-day"
                    checked={configAllowSameDay}
                    onCheckedChange={(checked) => setConfigAllowSameDay(!!checked)}
                  />
                  <div className="space-y-1 leading-none">
                    <label htmlFor="edit-batch-allow-same-day" className="text-sm font-medium">
                      Allow same-day session scheduling
                    </label>
                    <p className="text-sm text-muted-foreground">
                      If checked, instructors will be permitted to schedule offline sessions on the
                      exact same day. By default, 24h notice is required.
                    </p>
                  </div>
                </div>
                <Button className="w-full" onClick={handleSaveConfig} disabled={savingConfig}>
                  {savingConfig ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Link href={`/teacher/offline-batches/${batchId}/preview`}>
            <Button id="preview-batch-btn" variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Button>
          </Link>
        </div>
      </div>

      {/* Batch Overview Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        <div className="p-4 border rounded-xl bg-card shadow-sm flex items-center gap-3">
          <div className="p-3 bg-violet-500/10 rounded-lg text-violet-500">
            <LayoutList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Curriculum Structure</p>
            <h4 className="text-sm font-bold">
              {modules.length} Module{modules.length !== 1 ? 's' : ''}
            </h4>
          </div>
        </div>

        <div className="p-4 border rounded-xl bg-card shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Linked Courses</p>
            <h4 className="text-sm font-bold">
              {courses.length} Course{courses.length !== 1 ? 's' : ''}
            </h4>
          </div>
        </div>

        <div className="p-4 border rounded-xl bg-card shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium font-bold">Enrolled Students</p>
            <h4 className="text-sm font-bold">
              {enrollments.length} Learner{enrollments.length !== 1 ? 's' : ''}
            </h4>
          </div>
        </div>

        <div className="p-4 border rounded-xl bg-card shadow-sm flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-500">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Batch Timeline</p>
            <h4
              className="text-xs font-semibold mt-0.5 truncate max-w-[150px]"
              title={`${formatDate(startDate)} → ${formatDate(endDate)}`}
            >
              {formatDate(startDate)} → {formatDate(endDate)}
            </h4>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="curriculum" className="space-y-6">
        <TabsList
          id="batch-detail-tabs"
          className="bg-muted/60 p-1 rounded-xl w-full sm:w-auto overflow-x-auto flex flex-nowrap sm:flex-wrap"
        >
          <TabsTrigger value="curriculum" id="tab-curriculum" className="rounded-lg shrink-0">
            <LayoutList className="h-4 w-4 mr-1.5" />
            Curriculum
          </TabsTrigger>
          <TabsTrigger value="grades" id="tab-grades" className="rounded-lg shrink-0">
            <Award className="h-4 w-4 mr-1.5" />
            Grades / Tasks
          </TabsTrigger>
          <TabsTrigger value="courses" id="tab-courses" className="rounded-lg shrink-0">
            <BookOpen className="h-4 w-4 mr-1.5" />
            Linked Courses ({courses.length})
          </TabsTrigger>
          <TabsTrigger value="students" id="tab-students" className="rounded-lg shrink-0">
            <Users className="h-4 w-4 mr-1.5" />
            Learners Directory ({enrollments.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Curriculum tab ── */}
        <TabsContent
          value="curriculum"
          forceMount
          className="mt-0 outline-none data-[state=inactive]:hidden"
        >
          <BatchContentEditor batchId={batchId} initialModules={modules} />
        </TabsContent>

        {/* ── Grades tab ── */}
        <TabsContent
          value="grades"
          forceMount
          className="mt-0 outline-none data-[state=inactive]:hidden"
        >
          <GradingHub
            batchId={batchId}
            modules={modules}
            enrolledStudents={enrollments.map((e) => ({
              userId: e.userId,
              name: e.name || e.userId
            }))}
          />
        </TabsContent>

        {/* ── Courses tab ── */}
        <TabsContent
          value="courses"
          forceMount
          className="mt-6 space-y-4 data-[state=inactive]:hidden"
        >
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
        <TabsContent
          value="students"
          forceMount
          className="mt-6 space-y-4 data-[state=inactive]:hidden"
        >
          {/* Enroll student */}
          <div className="flex gap-4 items-start">
            <div className="flex-1 flex flex-col gap-2 max-w-lg">
              <Textarea
                id="enroll-email-input"
                placeholder="Enter student emails, separated by commas or new lines..."
                value={enrollInput}
                onChange={(e) => setEnrollInput(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="csv-upload"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('csv-upload')?.click()}
                  className="text-xs"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload CSV/TXT
                </Button>
                <span className="text-xs text-muted-foreground">Appends to the list above</span>
              </div>
            </div>
            <Button
              id="enroll-student-btn"
              onClick={handleEnroll}
              disabled={loadingEnroll || !enrollInput.trim()}
            >
              {loadingEnroll ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <UserPlus className="h-4 w-4 mr-1.5" />
              )}
              Bulk Enroll
            </Button>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4">
            <h3 className="text-lg font-medium">
              Enrolled Students ({filteredEnrollments.length})
            </h3>
            <div className="flex items-center gap-2 max-w-sm w-full">
              <Input
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  setStudentPage(1);
                }}
                className="h-9"
              />
            </div>
          </div>

          {/* Student list */}
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No students enrolled yet.
            </p>
          ) : filteredEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No students found matching &quot;{studentSearch}&quot;
            </p>
          ) : (
            <>
              <div className="divide-y border rounded-lg">
                {paginatedEnrollments.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {e.name || 'Anonymous'}
                        </p>
                        <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
                          {e.userId}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{e.email}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Enrolled by {e.enrolledBy} ·{' '}
                        {new Date(e.createdAt).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <Button
                      id={`remove-student-${e.userId}`}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive ml-4"
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

              {totalStudentPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                    disabled={studentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {studentPage} of {totalStudentPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStudentPage((p) => Math.min(totalStudentPages, p + 1))}
                    disabled={studentPage === totalStudentPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
