import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { apiError, handleApiError } from '@/lib/api-utils';
import { format } from 'date-fns';

interface Params {
  params: { webinarId: string };
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') return apiError('Forbidden', 403);

    const [webinar, registrations] = await Promise.all([
      db.webinar.findUnique({ where: { id: params.webinarId }, select: { title: true } }),
      db.webinarRegistration.findMany({
        where: { webinarId: params.webinarId },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    if (!webinar) return apiError('Webinar not found', 404);

    // Build CSV rows
    const header = 'Name,Email,Phone,Registered At\r\n';
    const rows = registrations
      .map((r) => {
        const phone = `${r.countryCode}${r.phone}`;
        const registeredAt = format(r.createdAt, 'yyyy-MM-dd HH:mm:ss');
        // Wrap fields containing commas/quotes in double-quotes and escape inner quotes
        const escape = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
        return `${escape(r.name)},${escape(r.email)},${escape(phone)},${escape(registeredAt)}\r\n`;
      })
      .join('');

    const csv = header + rows;
    const filename = `webinar-registrations-${params.webinarId}-${format(new Date(), 'yyyyMMdd')}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return handleApiError('ADMIN_WEBINAR_REGISTRATIONS_EXPORT', error);
  }
}
