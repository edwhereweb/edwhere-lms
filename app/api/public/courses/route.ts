import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const title = searchParams.get('title') || undefined;
        const categoryId = searchParams.get('categoryId') || undefined;

        const courses = await db.course.findMany({
            where: {
                isPublished: true,
                ...(title && {
                    title: { contains: title, mode: 'insensitive' as const }
                }),
                ...(categoryId === 'uncategorized'
                    ? { categoryId: null }
                    : categoryId
                        ? { categoryId }
                        : {})
            },
            include: {
                category: true,
                chapters: {
                    where: { isPublished: true },
                    select: { id: true }
                },
                instructors: {
                    include: {
                        profile: {
                            select: { name: true, imageUrl: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        const result = courses.map((course) => ({
            id: course.id,
            title: course.title,
            description: course.description,
            imageUrl: course.imageUrl,
            price: course.price,
            slug: course.slug,
            category: course.category,
            chaptersCount: course.chapters.length,
            instructors: course.instructors.map((i) => ({
                name: i.profile.name,
                imageUrl: i.profile.imageUrl
            }))
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('[PUBLIC_COURSES]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
