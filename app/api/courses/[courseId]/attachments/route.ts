import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkCourseEdit } from "@/lib/course-auth";

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = await auth();
    const { url, originalFilename } = await req.json();

    const denied = await checkCourseEdit(userId, params.courseId);
    if (denied) return denied;

    let name = url ? url.split("/").pop() : "Untitled";
    if (originalFilename) name = originalFilename;

    const attachment = await db.attachment.create({
      data: {
        url,
        name,
        courseId: params.courseId,
      },
    });

    return NextResponse.json(attachment);
  } catch (error) {
    console.log("COURSE_ID_ATTACHMENTS", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
