import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const categories = await db.category.findMany({
            orderBy: { name: "asc" },
        });

        return NextResponse.json(categories);
    } catch (error) {
        console.log("[CATEGORIES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        // Only ADMIN or TEACHER can create categories
        const profile = await db.profile.findUnique({ where: { userId } });
        if (!profile || !["ADMIN", "TEACHER"].includes(profile.role)) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { name } = await req.json();
        if (!name || typeof name !== "string" || !name.trim()) {
            return new NextResponse("Name is required", { status: 400 });
        }

        const category = await db.category.create({
            data: { name: name.trim() },
        });

        return NextResponse.json(category);
    } catch (error) {
        console.log("[CATEGORIES_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
