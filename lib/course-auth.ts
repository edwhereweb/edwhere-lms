import { db } from "@/lib/db";

/**
 * Returns true if userId is allowed to edit the course identified by courseId.
 * Allowed if the user is:
 *   1. The course owner (course.userId === userId)
 *   2. An assigned instructor on the course (CourseInstructor record)
 *   3. An ADMIN in the Profile table
 */
export async function canEditCourse(
    userId: string,
    courseId: string
): Promise<boolean> {
    // Check admin role first (cheapest escape hatch)
    const profile = await db.profile.findUnique({ where: { userId } });
    if (profile?.role === "ADMIN") return true;

    // Check owner or assigned instructor in one query
    const course = await db.course.findFirst({
        where: {
            id: courseId,
            OR: [
                { userId },
                {
                    instructors: {
                        some: { profile: { userId } },
                    },
                },
            ],
        },
        select: { id: true },
    });

    return !!course;
}

/**
 * Convenience wrapper — returns a 401 NextResponse string if the user
 * cannot edit the course, or null if they can.
 * Usage:
 *   const denied = await checkCourseEdit(userId, courseId);
 *   if (denied) return denied;
 */
export async function checkCourseEdit(
    userId: string | null | undefined,
    courseId: string
) {
    if (!userId) {
        const { NextResponse } = await import("next/server");
        return new NextResponse("Unauthorized", { status: 401 });
    }
    const allowed = await canEditCourse(userId, courseId);
    if (!allowed) {
        const { NextResponse } = await import("next/server");
        return new NextResponse("Unauthorized", { status: 401 });
    }
    return null;
}
