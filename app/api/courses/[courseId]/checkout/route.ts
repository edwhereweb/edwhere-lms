import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";

export async function POST(
  req: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const user = await currentUser();
    if (!user || !user.id || !user.emailAddresses?.[0]?.emailAddress) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const course = await db.course.findUnique({
      where: { id: params.courseId, isPublished: true },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    if (!course.price || course.price <= 0) {
      return new NextResponse("Invalid course price", { status: 400 });
    }

    const existingPurchase = await db.purchase.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: params.courseId,
        },
      },
    });

    if (existingPurchase) {
      return new NextResponse("Already purchased", { status: 400 });
    }

    const amountInPaise = Math.round(course.price * 100);

    // Razorpay receipt max = 40 chars.
    // courseId slice (16) + '_' + base36 timestamp (~9) = ~26 chars
    const receipt = `${params.courseId.slice(-16)}_${Date.now().toString(36)}`;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        courseId: params.courseId,
        userId: user.id,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      courseName: course.title,
      userEmail: user.emailAddresses[0].emailAddress,
      userName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.emailAddresses[0].emailAddress.split("@")[0],
    });
  } catch (error) {
    console.error("[CHECKOUT_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}