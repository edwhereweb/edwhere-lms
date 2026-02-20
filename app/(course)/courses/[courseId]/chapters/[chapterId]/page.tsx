import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { File, BookOpen } from 'lucide-react';

import { getChapter } from '@/actions/get-chapter';
import { Banner } from '@/components/banner';
import { Separator } from '@/components/ui/separator';
import { Preview } from '@/components/preview';

import { VideoPlayer } from './_components/video-player';
import { CourseEnrollButton } from './_components/course-enroll-button';
import { CourseProgressButton } from './_components/course-progress-button';
import { HtmlEmbedPreview } from '@/components/html-embed-preview';
import { PdfViewer } from '@/components/pdf-viewer';

const ChapterIdPage = async ({ params }: { params: { courseId: string; chapterId: string } }) => {
  const { userId } = await auth();

  if (!userId) {
    return redirect('/sign-in');
  }

  const { chapter, course, muxData, attachments, nextChapter, userProgress, purchase } =
    await getChapter({
      userId,
      chapterId: params.chapterId,
      courseId: params.courseId
    });

  if (!chapter || !course) {
    return redirect('/dashboard');
  }

  const isLocked = !chapter.isFree && !purchase;
  const completeOnEnd = !!purchase && !userProgress?.isCompleted;
  const isTextChapter = chapter.contentType === 'TEXT';
  const isHtmlChapter = chapter.contentType === 'HTML_EMBED';
  const isPdfChapter = chapter.contentType === 'PDF_DOCUMENT';

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

  const attachmentList = attachments && attachments.length > 0 && (
    <>
      <Separator />
      <div className="p-4 md:p-6">
        <p className="text-sm font-semibold mb-3 text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Attachments
        </p>
        {attachments.map((attachment) => (
          <a
            href={attachment.url}
            target="_blank"
            key={attachment.id}
            className="flex items-center gap-2 p-3 mb-2 w-full bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-md text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition text-sm"
          >
            <File className="h-4 w-4 flex-shrink-0" />
            <p className="line-clamp-1">{attachment.name}</p>
          </a>
        ))}
      </div>
    </>
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
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-0.5">
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

          {attachmentList}

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
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                <svg
                  className="h-5 w-5 text-violet-600 dark:text-violet-400"
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
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-0.5">
                  Interactive Content
                </p>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {chapter.title}
                </h1>
              </div>
            </div>
            <div className="flex-shrink-0">{progressOrEnrollButton}</div>
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

          {attachmentList}

          {!isLocked && <div className="mt-10 flex justify-end">{progressOrEnrollButton}</div>}
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
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
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

          {attachmentList}

          {!isLocked && <div className="mt-8 flex justify-end">{progressOrEnrollButton}</div>}
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
          {attachmentList}
        </div>
      </div>
    </div>
  );
};

export default ChapterIdPage;
