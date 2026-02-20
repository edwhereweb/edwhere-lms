import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkCourseEdit } from "@/lib/course-auth";

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = await auth();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    // Verify required fields before submitting for approval
    const course = await db.course.findUnique({
      where: { id: params.courseId },
      include: {
        chapters: {
          include: { muxData: true },
        },
      },
    });

    if (!course) {
      return new NextResponse("Not found", { status: 404 });
    }

    const hasPublishedChapter = course.chapters.some((c) => c.isPublished);

    if (
      !course.title ||
      !course.description ||
      !course.imageUrl ||
      !course.categoryId ||
      !hasPublishedChapter
    ) {
      return new NextResponse("Missing required fields", { status: 401 });
    }

    // Submit for admin review instead of publishing directly
    const updatedCourse = await db.course.update({
      where: { id: params.courseId },
      data: {
        pendingApproval: true,
        isPublished: false,
      },
    });

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.log("[COURSE_ID_PUBLISH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
