import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkCourseEdit } from "@/lib/course-auth";

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    const chapter = await db.chapter.findUnique({
      where: {
        id: params.chapterId,
        courseId: params.courseId,
      },
    });

    const muxData = await db.muxData.findUnique({
      where: {
        chapterId: params.chapterId,
      },
    });

    if (!chapter || !chapter.title || !chapter.description) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // A chapter can be published if it has EITHER a Mux video OR a YouTube video
    const hasVideo =
      (!!chapter.videoUrl && !!muxData) || !!chapter.youtubeVideoId;

    if (!hasVideo) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const publishedChapter = await db.chapter.update({
      where: {
        id: params.chapterId,
        courseId: params.courseId,
      },
      data: {
        isPublished: true,
      },
    });

    return NextResponse.json(publishedChapter);
  } catch (error) {
    console.log("[CHAPTER_PUBLISH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
