import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { sortChapters } from '@/lib/chapter-utils';

const CourseStartPage = async ({ params }: { params: { courseId: string } }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      chapters: {
        where: { isPublished: true, isLibraryAsset: false },
        include: { module: { select: { position: true } } }
      }
    }
  });

  if (!course || !course.chapters.length) return redirect('/dashboard');

  // Check if the student has a purchase with a saved resume point
  const purchase = await db.purchase.findUnique({
    where: { userId_courseId: { userId, courseId: params.courseId } }
  });

  // Sort chapters correctly considering modules
  const sortedChapters = sortChapters(course.chapters);

  // Determine target chapter
  let targetChapterId = sortedChapters[0].id;

  if (purchase) {
    const chapterIds = sortedChapters.map((c) => c.id);
    const completedProgress = await db.userProgress.findMany({
      where: { userId, chapterId: { in: chapterIds }, isCompleted: true },
      select: { chapterId: true }
    });
    const completedIds = new Set(completedProgress.map((p) => p.chapterId));

    if (purchase.lastVisitedChapterId && !completedIds.has(purchase.lastVisitedChapterId)) {
      // Last visited exists and is NOT complete -> resume there
      const resumeChapter = sortedChapters.find((c) => c.id === purchase.lastVisitedChapterId);
      if (resumeChapter) {
        targetChapterId = resumeChapter.id;
      }
    } else {
      // Last visited is complete, or doesn't exist -> find first incomplete
      const firstIncomplete = sortedChapters.find((c) => !completedIds.has(c.id));
      if (firstIncomplete) {
        targetChapterId = firstIncomplete.id;
      } else if (purchase.lastVisitedChapterId) {
        // Course is fully complete, but we have a last visited. Just go back there.
        targetChapterId = purchase.lastVisitedChapterId;
      }
    }
  }

  return redirect(`/courses/${course.id}/chapters/${targetChapterId}`);
};

export default CourseStartPage;
