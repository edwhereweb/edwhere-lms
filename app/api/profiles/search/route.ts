import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const myProfile = await db.profile.findUnique({ where: { userId } });
        if (!myProfile || !["ADMIN", "TEACHER"].includes(myProfile.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim() ?? "";
        if (q.length < 1) return NextResponse.json([]);

        // MongoDB does not support mode:"insensitive" on non-fulltext fields.
        // Fetch a broader set and filter in JS instead.
        const allProfiles = await db.profile.findMany({
            where: {
                NOT: { userId }, // exclude self
            },
            select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                role: true,
            },
            take: 200, // reasonable upper bound
        });

        const lower = q.toLowerCase();
        const results = allProfiles
            .filter(
                (p) =>
                    p.name.toLowerCase().includes(lower) ||
                    p.email.toLowerCase().includes(lower)
            )
            .slice(0, 10);

        return NextResponse.json(results);
    } catch (error) {
        console.log("[PROFILES_SEARCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
