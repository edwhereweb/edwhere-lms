'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { MessageCircle, ArrowLeft, BookOpen, User } from 'lucide-react';
import { MentorChat } from '@/app/(course)/courses/[courseId]/chat/_components/mentor-chat';
import { cn } from '@/lib/utils';

interface LastMessage {
  id: string;
  content: string;
  createdAt: string | Date;
  author: { name: string };
}

interface CourseItem {
  id: string;
  title: string;
  imageUrl: string | null;
  lastMessage: LastMessage | null;
  unreadCount: number;
}

interface StudentItem {
  id: string;
  name: string;
  imageUrl: string | null;
  lastMessage: LastMessage | null;
  unreadCount: number;
}

interface MentorConnectHubProps {
  courses: CourseItem[];
  instructorProfileId: string;
}

type View =
  | { type: 'courses' }
  | { type: 'students'; course: CourseItem }
  | { type: 'chat'; course: CourseItem; student: StudentItem };

export function MentorConnectHub({
  courses: initialCourses,
  instructorProfileId
}: MentorConnectHubProps) {
  const [view, setView] = useState<View>({ type: 'courses' });
  const [courses, setCourses] = useState(initialCourses);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // When entering student list for a course, fetch students
  const loadStudents = useCallback(async (courseId: string) => {
    setLoadingStudents(true);
    try {
      const { data } = await axios.get(`/api/courses/${courseId}/chat-students`);
      setStudents(data);
    } catch {
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (view.type === 'students') {
      loadStudents(view.course.id);
    }
  }, [view, loadStudents]);

  // After instructor reads a thread, refresh students + update course unread count
  const handleThreadRead = useCallback((courseId: string, studentId: string) => {
    // Clear unread locally for the specific student thread
    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, unreadCount: 0 } : s)));
    // Recompute unread for the course card
    setStudents((prev) => {
      const remaining = prev.reduce((sum, s) => sum + (s.id === studentId ? 0 : s.unreadCount), 0);
      setCourses((cs) => cs.map((c) => (c.id === courseId ? { ...c, unreadCount: remaining } : c)));
      return prev;
    });
  }, []);

  /* ── Course list ─────────────────────────────────────────────────────── */
  if (view.type === 'courses') {
    return (
      <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {courses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 gap-3">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p className="text-sm font-medium">No courses yet</p>
          </div>
        )}
        {courses.map((course, idx) => {
          const hasUnread = course.unreadCount > 0;
          return (
            <button
              key={course.id}
              onClick={() => setView({ type: 'students', course })}
              className={cn(
                'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                idx !== 0 && 'border-t border-slate-100 dark:border-slate-800'
              )}
            >
              <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 overflow-hidden">
                {course.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : (
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      'text-sm font-semibold truncate',
                      hasUnread
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {course.title}
                  </p>
                  {hasUnread && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  )}
                </div>
                {course.lastMessage ? (
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    <span className="font-medium">{course.lastMessage.author.name}: </span>
                    {course.lastMessage.content}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic mt-0.5">No messages yet</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {course.lastMessage && (
                  <span className="text-[10px] text-slate-400">
                    {format(new Date(course.lastMessage.createdAt), 'dd MMM')}
                  </span>
                )}
                {hasUnread && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                    {course.unreadCount > 99 ? '99+' : course.unreadCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  /* ── Student list ────────────────────────────────────────────────────── */
  if (view.type === 'students') {
    const { course } = view;
    return (
      <div>
        <button
          onClick={() => setView({ type: 'courses' })}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> All courses
        </button>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-1">
          {course.title}
        </h2>
        <p className="text-sm text-slate-500 mb-5">Select a student to view their chat</p>

        <div className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {loadingStudents && (
            <div className="py-10 text-center text-slate-400 text-sm">Loading…</div>
          )}
          {!loadingStudents && students.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <MessageCircle className="h-10 w-10 opacity-30" />
              <p className="text-sm">No students have messaged yet.</p>
            </div>
          )}
          {students.map((student, idx) => {
            const hasUnread = student.unreadCount > 0;
            return (
              <button
                key={student.id}
                onClick={() => setView({ type: 'chat', course, student })}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  idx !== 0 && 'border-t border-slate-100 dark:border-slate-800'
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white',
                    'bg-blue-500'
                  )}
                >
                  {student.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={student.imageUrl}
                      alt={student.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    student.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        'text-sm font-semibold truncate',
                        hasUnread
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {student.name}
                    </p>
                    {hasUnread && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    )}
                  </div>
                  {student.lastMessage ? (
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {student.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 italic mt-0.5">No messages</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  {student.lastMessage && (
                    <span className="text-[10px] text-slate-400">
                      {format(new Date(student.lastMessage.createdAt), 'dd MMM, h:mm a')}
                    </span>
                  )}
                  {hasUnread && (
                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                      {student.unreadCount > 99 ? '99+' : student.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Private chat ────────────────────────────────────────────────────── */
  const { course, student } = view;
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] rounded-xl border bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-slate-50 dark:bg-slate-800 shrink-0">
        <button
          onClick={() => setView({ type: 'students', course })}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {course.title}
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <User className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
          {student.name}
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        <MentorChat
          courseId={course.id}
          currentProfileId={instructorProfileId}
          currentRole="TEACHER"
          threadStudentId={student.id}
          onMarkedRead={() => handleThreadRead(course.id, student.id)}
        />
      </div>
    </div>
  );
}
