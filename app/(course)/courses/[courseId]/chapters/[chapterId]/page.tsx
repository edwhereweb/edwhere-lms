import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import { BookOpen } from 'lucide-react';

import { getChapter } from '@/actions/get-chapter';
import { Banner } from '@/components/banner';
import { Separator } from '@/components/ui/separator';
import { Preview } from '@/components/preview';

import { VideoPlayer } from './_components/video-player';
import { CourseEnrollButton } from './_components/course-enroll-button';
import { CourseProgressButton } from './_components/course-progress-button';
import { db } from '@/lib/db';

const HtmlEmbedPreview = dynamic(
  () => import('@/components/html-embed-preview').then((m) => m.HtmlEmbedPreview),
  { ssr: false }
);
const PdfViewer = dynamic(() => import('@/components/pdf-viewer').then((m) => m.PdfViewer), {
  ssr: false
});
const GamifiedSubmissionForm = dynamic(
  () => import('./_components/gamified-submission-form').then((m) => m.GamifiedSubmissionForm),
  { ssr: false }
);
const ProjectSubmissionForm = dynamic(
  () => import('./_components/project-submission-form').then((m) => m.ProjectSubmissionForm),
  { ssr: false }
);
const QuizPlayer = dynamic(() => import('./_components/quiz-player').then((m) => m.QuizPlayer), {
  ssr: false
});

const ChapterIdPage = async ({ params }: { params: { courseId: string; chapterId: string } }) => {
  const { userId } = await auth();

  if (!userId) {
    return redirect('/sign-in');
  }

  const { chapter, course, muxData, nextChapter, userProgress, purchase } = await getChapter({
    userId,
    chapterId: params.chapterId,
    courseId: params.courseId
  });

  if (!chapter || !course) {
    return redirect('/dashboard');
  }

  // Fetch student's own project submission (if any)
  let projectSubmission = null;
  if (chapter.contentType === 'HANDS_ON_PROJECT') {
    try {
      projectSubmission = await db.projectSubmission.findUnique({
        where: { userId_chapterId: { userId, chapterId: params.chapterId } }
      });
    } catch {
      // Prisma client may be stale — submission form still renders, just without prefill
      projectSubmission = null;
    }
  }

  const isLocked = !chapter.isFree && !purchase;
  const completeOnEnd = !!purchase && !userProgress?.isCompleted;
  const isTextChapter = chapter.contentType === 'TEXT';
  const isHtmlChapter = chapter.contentType === 'HTML_EMBED';
  const isPdfChapter = chapter.contentType === 'PDF_DOCUMENT';
  const isProjectChapter = chapter.contentType === 'HANDS_ON_PROJECT';
  const isEvaluationChapter = chapter.contentType === 'EVALUATION';

  let quizConfig = null;
  if (isEvaluationChapter) {
    quizConfig = await db.quiz.findUnique({
      where: { chapterId: params.chapterId },
      include: {
        _count: {
          select: { questions: true }
        }
      }
    });
  }

  const progressOrEnrollButton = purchase ? (
    <CourseProgressButton
      chapterId={params.chapterId}
      courseId={params.courseId}
      nextChapterId={nextChapter?.id}
      isCompleted={!!userProgress?.isCompleted}
    />
  ) : (
    <CourseEnrollButton courseId={params.courseId} price={course.price!} />
  );

  /* ── TEXT chapter layout ───────────────────────────────────────────── */
  if (isTextChapter) {
    return (
      <div>
        {userProgress?.isCompleted && (
          <Banner variant="success" label="You already completed this chapter." />
        )}
        {isLocked && (
          <Banner
            variant="warning"
            label="You need to purchase this course to read this chapter."
          />
        )}

        <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
          {/* Chapter header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/40">
                <BookOpen className="h-5 w-5 text-[#F80602] dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#F80602] dark:text-red-400 mb-0.5">
                  Reading
                </p>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {chapter.title}
                </h1>
              </div>
            </div>
            <div className="flex-shrink-0">{progressOrEnrollButton}</div>
          </div>

          <Separator className="mb-8" />

          {/* Locked state */}
          {isLocked ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 dark:text-slate-400">
              <BookOpen className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">This chapter is locked.</p>
              <p className="text-sm mt-1">Purchase the course to unlock this reading.</p>
            </div>
          ) : (
            <>
              {/* Description */}
              {chapter.description && (
                <div className="mb-6 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                  <Preview value={chapter.description} />
                </div>
              )}

              {/* Body content — the main text */}
              {chapter.content ? (
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                  <Preview value={chapter.content} />
                </div>
              ) : (
                <p className="text-slate-400 italic text-center py-10">
                  No content has been added to this chapter yet.
                </p>
              )}
            </>
          )}

          {/* Bottom complete button for easy access */}
          {!isLocked && <div className="mt-10 flex justify-end">{progressOrEnrollButton}</div>}
        </div>
      </div>
    );
  }

  /* ── HTML Embed chapter layout ─────────────────────────────────────── */
  if (isHtmlChapter) {
    const htmlContent = (chapter as unknown as { htmlContent?: string }).htmlContent ?? '';
    return (
      <div>
        {userProgress?.isCompleted && (
          <Banner variant="success" label="You already completed this chapter." />
        )}
        {isLocked && (
          <Banner
            variant="warning"
            label="You need to purchase this course to access this chapter."
          />
        )}

        <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/40">
                <svg
                  className="h-5 w-5 text-[#F80602] dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#F80602] dark:text-red-400 mb-0.5">
                  Gamified Lesson
                </p>
                <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {chapter.title}
                </h1>
              </div>
            </div>
          </div>

          <Separator className="mb-8" />

          {isLocked ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 dark:text-slate-400">
              <p className="text-lg font-medium">This chapter is locked.</p>
              <p className="text-sm mt-1">Purchase the course to access this content.</p>
            </div>
          ) : (
            <>
              {chapter.description && (
                <div className="mb-6">
                  <Preview value={chapter.description} />
                </div>
              )}
              {htmlContent ? (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white shadow-sm">
                  <HtmlEmbedPreview html={htmlContent} />
                </div>
              ) : (
                <p className="text-slate-400 italic text-center py-10">
                  No HTML content added yet.
                </p>
              )}
            </>
          )}

          {!isLocked && (
            <div className="mt-10">
              {purchase ? (
                <GamifiedSubmissionForm
                  courseId={params.courseId}
                  chapterId={params.chapterId}
                  isCompleted={!!userProgress?.isCompleted}
                  nextChapterId={nextChapter?.id}
                />
              ) : (
                <div className="flex justify-end">{progressOrEnrollButton}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Hands-on Project chapter layout ──────────────────────────────────── */
  if (isProjectChapter) {
    return (
      <div>
        {userProgress?.isCompleted && (
          <Banner variant="success" label="You have already submitted this project!" />
        )}
        {isLocked && (
          <Banner
            variant="warning"
            label="You need to purchase this course to access this project."
          />
        )}

        <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-50 dark:bg-orange-900/40">
                <svg
                  className="h-5 w-5 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2m-6 9 2 2 4-4"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400 mb-0.5">
                  Hands-on Project
                </p>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {chapter.title}
                </h1>
              </div>
            </div>
          </div>

          <Separator className="mb-8" />

          {isLocked ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 dark:text-slate-400 border border-dashed rounded-xl">
              <p className="text-lg font-medium">This project is locked.</p>
              <p className="text-sm mt-1">Purchase the course to access this project.</p>
            </div>
          ) : (
            <>
              {/* Task statement — HTML or rich text */}
              {(() => {
                const htmlContent = (chapter as unknown as { htmlContent?: string }).htmlContent;
                if (htmlContent) {
                  return (
                    <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-6 mb-4">
                      <h2 className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-3">
                        📋 Your Task
                      </h2>
                      <div className="rounded-md overflow-hidden border border-orange-100 dark:border-orange-900 bg-white">
                        <HtmlEmbedPreview html={htmlContent} />
                      </div>
                    </div>
                  );
                }
                if (chapter.content) {
                  return (
                    <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 p-6 mb-4">
                      <h2 className="text-sm font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-3">
                        📋 Your Task
                      </h2>
                      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 text-sm">
                        <Preview value={chapter.content} />
                      </div>
                    </div>
                  );
                }
                return (
                  <p className="text-slate-400 italic text-center py-10">
                    Task statement coming soon.
                  </p>
                );
              })()}

              {/* Submission form */}
              <ProjectSubmissionForm
                courseId={params.courseId}
                chapterId={params.chapterId}
                initialSubmission={
                  projectSubmission
                    ? {
                        id: projectSubmission.id,
                        driveUrl: projectSubmission.driveUrl,
                        status: projectSubmission.status as 'PENDING' | 'APPROVED' | 'REJECTED',
                        reviewNote: projectSubmission.reviewNote,
                        updatedAt: projectSubmission.updatedAt.toISOString()
                      }
                    : null
                }
                isLocked={isLocked}
              />
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── PDF chapter layout ─────────────────────────────────────────────── */
  if (isPdfChapter) {
    const pdfUrl = (chapter as unknown as { pdfUrl?: string }).pdfUrl ?? '';
    return (
      <div>
        {userProgress?.isCompleted && (
          <Banner variant="success" label="You already completed this chapter." />
        )}
        {isLocked && (
          <Banner
            variant="warning"
            label="You need to purchase this course to access this chapter."
          />
        )}

        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#F80602] dark:text-red-400 mb-1">
                PDF Document
              </p>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {chapter.title}
              </h1>
              {chapter.description && (
                <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  <Preview value={chapter.description} />
                </div>
              )}
            </div>
            <div className="flex-shrink-0">{progressOrEnrollButton}</div>
          </div>

          {isLocked ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 dark:text-slate-400 border border-dashed rounded-xl">
              <p className="text-lg font-medium">This chapter is locked.</p>
              <p className="text-sm mt-1">Purchase the course to read this document.</p>
            </div>
          ) : pdfUrl ? (
            <PdfViewer url={pdfUrl} title={chapter.title} />
          ) : (
            <p className="text-center py-10 text-slate-400 italic">No PDF available yet.</p>
          )}

          {!isLocked && <div className="mt-8 flex justify-end">{progressOrEnrollButton}</div>}
        </div>
      </div>
    );
  }

  /* ── EVALUATION chapter layout ─────────────────────────────────────────────── */
  if (isEvaluationChapter) {
    // Determine if we show the QuizPlayer or a locked message
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
        {userProgress?.isCompleted && (
          <Banner variant="success" label="You already completed this evaluation." />
        )}
        {isLocked && (
          <Banner
            variant="warning"
            label="You need to purchase this course to access this evaluation."
          />
        )}

        <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/40">
                <svg
                  className="h-5 w-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-0.5">
                  Evaluation
                </p>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {chapter.title}
                </h1>
              </div>
            </div>
          </div>

          {isLocked ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 dark:text-slate-400 border border-dashed rounded-xl bg-white dark:bg-slate-900">
              <p className="text-lg font-medium">This evaluation is locked.</p>
              <p className="text-sm mt-1">Purchase the course to take this quiz.</p>
            </div>
          ) : !quizConfig || quizConfig._count.questions === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 dark:text-slate-400 border border-dashed rounded-xl bg-white dark:bg-slate-900">
              <p className="text-lg font-medium">No questions available.</p>
              <p className="text-sm mt-1">
                The instructor has not added any questions to this evaluation yet.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              {/* Dynamically import the player or just render it directly */}
              <QuizPlayer
                courseId={params.courseId}
                chapterId={params.chapterId}
                quizConfig={quizConfig}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Video chapter layout (default) ───────────────────────────────── */
  return (
    <div>
      {userProgress?.isCompleted && (
        <Banner variant="success" label="You already completed this chapter." />
      )}
      {isLocked && (
        <Banner variant="warning" label="You need to purchase this course to watch this chapter." />
      )}
      <div className="flex flex-col max-w-4xl mx-auto pb-20">
        <div className="p-4">
          <VideoPlayer
            chapterId={params.chapterId}
            title={chapter.title}
            courseId={params.courseId}
            nextChapterId={nextChapter?.id}
            playbackId={muxData?.playbackId}
            youtubeVideoId={chapter.youtubeVideoId}
            isLocked={isLocked}
            completeOnEnd={completeOnEnd}
          />
        </div>
        <div>
          <div className="p-4 flex flex-col md:flex-row items-center justify-between">
            <h2 className="text-2xl font-semibold mb-2">{chapter.title}</h2>
            {progressOrEnrollButton}
          </div>
          <Separator />
          <div>
            <Preview value={chapter.description!} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterIdPage;
