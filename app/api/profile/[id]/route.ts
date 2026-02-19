import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { name, imageUrl } = await req.json();

    const ownProfile = await db.profile.findUnique({
      where: {
        userId,
      },
    });

    if (!ownProfile) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Update only the authenticated user's own profile, never by params.id
    // Only allow safe fields — role, userId, email cannot be changed here
    const profile = await db.profile.update({
      where: {
        userId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(imageUrl !== undefined && { imageUrl }),
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.log("[PROFILE_ID]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
