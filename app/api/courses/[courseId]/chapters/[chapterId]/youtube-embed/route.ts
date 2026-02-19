import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: { courseId: string; chapterId: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const chapter = await db.chapter.findUnique({
            where: {
                id: params.chapterId,
                courseId: params.courseId,
            },
        });

        if (!chapter || !chapter.youtubeVideoId) {
            return new NextResponse("Not Found", { status: 404 });
        }

        // Free chapters: anyone authenticated can view
        if (chapter.isFree) {
            return NextResponse.json({
                embedUrl: `https://www.youtube-nocookie.com/embed/${chapter.youtubeVideoId}?rel=0&modestbranding=1&iv_load_policy=3&controls=1`,
            });
        }

        // Paid chapters: verify purchase
        const purchase = await db.purchase.findUnique({
            where: {
                userId_courseId: {
                    userId,
                    courseId: params.courseId,
                },
            },
        });

        if (!purchase) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        return NextResponse.json({
            embedUrl: `https://www.youtube-nocookie.com/embed/${chapter.youtubeVideoId}?rel=0&modestbranding=1&iv_load_policy=3&controls=1`,
        });
    } catch (error) {
        console.log("[YOUTUBE_EMBED]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
