import { db } from '@/lib/db';
import { notFound } from 'next/navigation';

function injectFavicon(html: string): string {
  const faviconHtml =
    '\n  <link rel="icon" href="/edwhere-logo.png" type="image/png" />\n  <link rel="apple-touch-icon" href="/edwhere-logo.png" />';

  const headIndex = html.toLowerCase().indexOf('<head>');
  if (headIndex !== -1) {
    const insertPosition = headIndex + '<head>'.length;
    return html.slice(0, insertPosition) + faviconHtml + html.slice(insertPosition);
  }

  const htmlIndex = html.toLowerCase().indexOf('<html>');
  if (htmlIndex !== -1) {
    const insertPosition = htmlIndex + '<html>'.length;
    return (
      html.slice(0, insertPosition) + `\n<head>${faviconHtml}\n</head>` + html.slice(insertPosition)
    );
  }

  return `<head>${faviconHtml}\n</head>\n` + html;
}

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

    const htmlContent = injectFavicon(landingPage.htmlContent);

    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : error;
    const { logError } = await import('@/lib/debug');
    logError('LANDING_PAGE_GET', message);
    return new Response('Internal Server Error', { status: 500 });
  }
}
