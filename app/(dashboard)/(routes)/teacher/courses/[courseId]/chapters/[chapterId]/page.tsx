import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import Link from 'next/link';
import { checkCourseEdit } from '@/lib/course-auth';
import { AlignLeft, ArrowLeft, Code2, Eye, LayoutDashboard, Video, Youtube } from 'lucide-react';
import { IconBadge } from '@/components/icon-badge';
import { ChapterTitleForm } from './_components/chapter-title-form';
import { ChapterDescriptionForm } from './_components/chapter-description-form';
import { ChapterAccessForm } from './_components/chapter-access-form';
import { ChapterVideoForm } from './_components/chapter-video-form';
import { ChapterYoutubeForm } from './_components/chapter-youtube-form';
import { ChapterContentForm } from './_components/chapter-content-form';
import { ChapterHtmlForm } from './_components/chapter-html-form';
import { ChapterPdfForm } from './_components/chapter-pdf-form';
import { Banner } from '@/components/banner';
import { ChapterActions } from './_components/chapter-actions';

interface ChapterIdPageProps {
  params: {
    courseId: string;
    chapterId: string;
  };
}

const CONTENT_TYPE_LABELS: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  VIDEO_MUX: {
    label: 'Recorded Video',
    icon: Video,
    color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
  },
  VIDEO_YOUTUBE: {
    label: 'YouTube Video',
    icon: Youtube,
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
  },
  TEXT: {
    label: 'Text Content',
    icon: AlignLeft,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  },
  HTML_EMBED: {
    label: 'HTML Embed',
    icon: Code2,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
  },
  PDF_DOCUMENT: {
    label: 'PDF Document',
    icon: AlignLeft,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
  }
};

const ChapterIdPage: React.FC<ChapterIdPageProps> = async ({ params }) => {
  const { userId } = await auth();

  if (!userId) {
    return redirect('/sign-in');
  }

  const denied = await checkCourseEdit(userId, params.courseId);
  if (denied) return redirect('/');

  const chapter = await db.chapter.findUnique({
    where: {
      id: params.chapterId,
      courseId: params.courseId
    },
    include: {
      muxData: true
    }
  });

  if (!chapter) {
    return redirect('/teacher/courses');
  }

  const contentType = chapter.contentType ?? 'VIDEO_MUX';
  const typeInfo = CONTENT_TYPE_LABELS[contentType] ?? CONTENT_TYPE_LABELS.VIDEO_MUX;
  const TypeIcon = typeInfo.icon;

  // Required fields vary by content type
  const hasVideo = !!(chapter.videoUrl || chapter.youtubeVideoId);
  const requiredFields =
    contentType === 'TEXT'
      ? [chapter.title, chapter.description, chapter.content]
      : contentType === 'HTML_EMBED'
        ? [
            chapter.title,
            chapter.description,
            (chapter as unknown as { htmlContent?: string }).htmlContent
          ]
        : contentType === 'PDF_DOCUMENT'
          ? [chapter.title, chapter.description, (chapter as unknown as { pdfUrl?: string }).pdfUrl]
          : [chapter.title, chapter.description, hasVideo];

  const totalFields = requiredFields.length;
  const completedFields = requiredFields.filter(Boolean).length;
  const completionText = `(${completedFields}/${totalFields})`;
  const isComplete = requiredFields.every(Boolean);

  return (
    <>
      {!chapter.isPublished && (
        <Banner
          variant="warning"
          label="This chapter is unpublished. It will not be visible in the course"
        />
      )}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="w-full">
            <Link
              href={`/teacher/courses/${params.courseId}/structure`}
              className="flex items-center text-sm hover:opacity-75 transition mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to course setup
            </Link>
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col gap-y-2">
                <h1 className="text-2xl font-medium">Chapter Creation</h1>
                {/* Content type badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit ${typeInfo.color}`}
                >
                  <TypeIcon className="h-3.5 w-3.5" />
                  {typeInfo.label}
                </div>
              </div>
            </div>
            <span className="text-sm text-slate-700 dark:text-slate-300 ">
              Complete all fields {completionText}
            </span>
          </div>
          <ChapterActions
            disabled={!isComplete}
            courseId={params.courseId}
            chapterId={params.chapterId}
            isPublished={chapter.isPublished}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
          {/* Left column — always shown */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-x-2">
                <IconBadge icon={LayoutDashboard} />
                <h2 className="text-xl font-medium">Customize your chapter</h2>
              </div>
              <ChapterTitleForm
                initialData={chapter}
                courseId={params.courseId}
                chapterId={params.chapterId}
              />
              <ChapterDescriptionForm
                initialData={chapter}
                courseId={params.courseId}
                chapterId={params.chapterId}
              />
            </div>
            <div className="flex items-center gap-x-2">
              <IconBadge icon={Eye} />
              <h2 className="text-xl font-medium">Access Settings</h2>
            </div>
            <ChapterAccessForm
              initialData={chapter}
              courseId={params.courseId}
              chapterId={params.chapterId}
            />
          </div>

          {/* Right column — conditional by content type */}
          <div className="space-y-4">
            {contentType === 'VIDEO_MUX' && (
              <>
                <div className="flex items-center gap-x-2">
                  <IconBadge icon={Video} />
                  <h2 className="text-xl font-medium">Upload Video</h2>
                </div>
                <ChapterVideoForm
                  initialData={chapter}
                  courseId={params.courseId}
                  chapterId={params.chapterId}
                />
              </>
            )}

            {contentType === 'VIDEO_YOUTUBE' && (
              <>
                <div className="flex items-center gap-x-2">
                  <IconBadge icon={Youtube} />
                  <h2 className="text-xl font-medium">Embed YouTube Video</h2>
                </div>
                <ChapterYoutubeForm
                  initialData={chapter}
                  courseId={params.courseId}
                  chapterId={params.chapterId}
                />
              </>
            )}

            {contentType === 'TEXT' && (
              <>
                <div className="flex items-center gap-x-2">
                  <IconBadge icon={AlignLeft} />
                  <h2 className="text-xl font-medium">Body Content</h2>
                </div>
                <ChapterContentForm
                  initialData={chapter}
                  courseId={params.courseId}
                  chapterId={params.chapterId}
                />
              </>
            )}

            {contentType === 'HTML_EMBED' && (
              <>
                <div className="flex items-center gap-x-2">
                  <IconBadge icon={Code2} />
                  <h2 className="text-xl font-medium">HTML Embed</h2>
                </div>
                <ChapterHtmlForm
                  initialData={chapter}
                  courseId={params.courseId}
                  chapterId={params.chapterId}
                />
              </>
            )}

            {contentType === 'PDF_DOCUMENT' && (
              <>
                <div className="flex items-center gap-x-2">
                  <IconBadge icon={AlignLeft} />
                  <h2 className="text-xl font-medium">PDF Document</h2>
                </div>
                <ChapterPdfForm
                  initialData={chapter}
                  courseId={params.courseId}
                  chapterId={params.chapterId}
                />
              </>
            )}

            {/* Legacy chapters (no contentType) — show all */}
            {!chapter.contentType && (
              <>
                <div className="flex items-center gap-x-2">
                  <IconBadge icon={Video} />
                  <h2 className="text-xl font-medium">Upload Video (Mux)</h2>
                </div>
                <ChapterVideoForm
                  initialData={chapter}
                  courseId={params.courseId}
                  chapterId={params.chapterId}
                />
                <div className="flex items-center gap-x-2 mt-4">
                  <IconBadge icon={Youtube} />
                  <h2 className="text-xl font-medium">Or embed YouTube</h2>
                </div>
                <ChapterYoutubeForm
                  initialData={chapter}
                  courseId={params.courseId}
                  chapterId={params.chapterId}
                />
                <div className="flex items-center gap-x-2 mt-4">
                  <IconBadge icon={AlignLeft} />
                  <h2 className="text-xl font-medium">Body Content</h2>
                </div>
                <ChapterContentForm
                  initialData={chapter}
                  courseId={params.courseId}
                  chapterId={params.chapterId}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChapterIdPage;
