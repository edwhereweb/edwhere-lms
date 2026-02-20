import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const profile = await db.profile.findUnique({ where: { userId } });
        if (!profile || !["ADMIN", "TEACHER"].includes(profile.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim();
        if (!q || q.length < 2) {
            return NextResponse.json([]);
        }

        const profiles = await db.profile.findMany({
            where: {
                OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                ],
                NOT: { userId },          // exclude self
                role: { in: ["TEACHER", "ADMIN"] }, // only teachers/admins can be instructors
            },
            select: { id: true, name: true, email: true, imageUrl: true },
            take: 10,
        });

        return NextResponse.json(profiles);
    } catch (error) {
        console.log("[PROFILES_SEARCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
