import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function PUT(
  req: Request,
  { params }: { params: { courseId: string; chapterId: string } }
) {
  try {
    const { userId } = await auth();
    const { isCompleted } = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Verify the chapter is accessible: either free or user has purchased the course
    const chapter = await db.chapter.findUnique({
      where: { id: params.chapterId, courseId: params.courseId, isPublished: true },
    });

    const purchase = await db.purchase.findUnique({
      where: { userId_courseId: { userId, courseId: params.courseId } },
    });

    if (!chapter) {
      return new NextResponse("Not Found", { status: 404 });
    }

    if (!chapter.isFree && !purchase) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const userProgress = await db.userProgress.upsert({
      where: {
        userId_chapterId: {
          userId,
          chapterId: params.chapterId,
        },
      },
      update: {
        isCompleted,
      },
      create: {
        userId,
        chapterId: params.chapterId,
        isCompleted,
      },
    });

    return NextResponse.json(userProgress);
  } catch (error) {
    console.log("[CHAPTER_ID_PROGRESS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

