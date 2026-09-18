import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { handleApiError } from '@/lib/api-utils';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const profile = await currentProfile();

    // Only Admins can export leads
    if (profile?.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const leads = await db.lead.findMany({
      include: { campaign: true },
      orderBy: { createdAt: 'desc' }
    });

    const headers = [
      'ID',
      'Name',
      'Email',
      'Phone',
      'Source',
      'Status',
      'Campaign',
      'Message',
      'Closure Status',
      'Agreed Amount',
      'Created At'
    ];

    const escapeCsv = (str: string | null | undefined) => {
      if (str == null) return '""';
      const cleanStr = String(str).replace(/"/g, '""');
      return `"${cleanStr}"`;
    };

    const rows = leads.map((lead) =>
      [
        escapeCsv(lead.id),
        escapeCsv(lead.name),
        escapeCsv(lead.email),
        escapeCsv(lead.phone),
        escapeCsv(lead.source),
        escapeCsv(lead.status),
        escapeCsv(lead.campaign?.name),
        escapeCsv(lead.message),
        escapeCsv(lead.closureStatus),
        escapeCsv(lead.agreedAmount?.toString()),
        escapeCsv(format(new Date(lead.createdAt), 'yyyy-MM-dd HH:mm:ss'))
      ].join(',')
    );

    const csvContent = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="leads_export.csv"'
      }
    });
  } catch (error) {
    return handleApiError('EXPORT_LEADS', error);
  }
}
