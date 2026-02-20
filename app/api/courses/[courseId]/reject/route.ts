import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
    req: Request,
    { params }: { params: { courseId: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const profile = await db.profile.findUnique({ where: { userId } });
        if (profile?.role !== "ADMIN") {
            return new NextResponse("Forbidden — admin only", { status: 403 });
        }

        const course = await db.course.update({
            where: { id: params.courseId },
            data: {
                isPublished: false,
                pendingApproval: false,
            },
        });

        return NextResponse.json(course);
    } catch (error) {
        console.log("[COURSE_REJECT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
