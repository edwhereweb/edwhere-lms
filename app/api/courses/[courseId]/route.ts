import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { userId } = await auth();
    const { courseId } = params;
    const body = await req.json();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Whitelist only safe, editable fields — prevents mass-assignment
    const { title, description, imageUrl, price, categoryId } = body;
    const safeData: Record<string, unknown> = {};
    if (title !== undefined) safeData.title = title;
    if (description !== undefined) safeData.description = description;
    if (imageUrl !== undefined) safeData.imageUrl = imageUrl;
    if (price !== undefined) safeData.price = price;
    if (categoryId !== undefined) safeData.categoryId = categoryId;

    const course = await db.course.update({
      where: {
        id: courseId,
        userId,
      },
      data: safeData,
    });

    return NextResponse.json(course);
  } catch (error) {
    console.log("[COURSE_ID]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
