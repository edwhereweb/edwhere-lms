import { db } from '@/lib/db';
import { notFound } from 'next/navigation';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  try {
    const landingPage = await db.landingPage.findUnique({
      where: {
        slug: params.slug,
        isPublished: true,
        isApproved: true
      }
    });

    if (!landingPage) return notFound();

    return new Response(landingPage.htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error('[LANDING_PAGE_GET]', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
