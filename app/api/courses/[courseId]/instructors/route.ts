import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: { courseId: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const profile = await db.profile.findUnique({ where: { userId } });
        if (!profile || !["ADMIN", "TEACHER"].includes(profile.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Fetch instructor profiles for this course
        const rows = await db.courseInstructor.findMany({
            where: { courseId: params.courseId },
            include: { profile: true },
        });

        return NextResponse.json(rows.map((r) => r.profile));
    } catch (error) {
        console.log("[INSTRUCTORS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: { courseId: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        // Only course owner or ADMIN can assign instructors
        const profile = await db.profile.findUnique({ where: { userId } });
        const isAdmin = profile?.role === "ADMIN";
        const course = await db.course.findUnique({ where: { id: params.courseId } });
        if (!course) return new NextResponse("Not Found", { status: 404 });
        if (!isAdmin && course.userId !== userId) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { profileId } = await req.json();
        if (!profileId) return new NextResponse("profileId required", { status: 400 });

        const instructor = await db.courseInstructor.create({
            data: { courseId: params.courseId, profileId },
            include: { profile: true },
        });

        return NextResponse.json(instructor.profile);
    } catch (error: any) {
        if (error?.code === "P2002") {
            return new NextResponse("Already an instructor", { status: 409 });
        }
        console.log("[INSTRUCTORS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { courseId: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const profile = await db.profile.findUnique({ where: { userId } });
        const isAdmin = profile?.role === "ADMIN";
        const course = await db.course.findUnique({ where: { id: params.courseId } });
        if (!course) return new NextResponse("Not Found", { status: 404 });
        if (!isAdmin && course.userId !== userId) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { profileId } = await req.json();
        await db.courseInstructor.deleteMany({
            where: { courseId: params.courseId, profileId },
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[INSTRUCTORS_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
