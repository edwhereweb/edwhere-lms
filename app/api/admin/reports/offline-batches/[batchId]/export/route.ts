import { auth } from '@clerk/nextjs/server';
import ExcelJS from 'exceljs';
import { apiError, handleApiError } from '@/lib/api-utils';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';

type Params = { params: Promise<{ batchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await getSafeProfile();
    if (profile?.role !== 'ADMIN') return apiError('Forbidden', 403);

    const { batchId } = await params;

    const batch = await db.batch.findUnique({
      where: { id: batchId },
      include: {
        enrollments: true,
        modules: {
          include: {
            items: {
              where: { type: 'OFFLINE_SESSION' },
              include: {
                session: {
                  include: {
                    attendances: true,
                    mcq: {
                      include: {
                        submissions: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!batch) return apiError('Batch not found', 404);

    const enrolledUserIds = batch.enrollments.map((e) => e.userId);
    const profiles = await db.profile.findMany({
      where: { userId: { in: enrolledUserIds } },
      select: { userId: true, name: true, email: true }
    });
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    interface ExportSession {
      item: unknown;
      session: {
        scheduledAt: Date;
        attendances: { userId: string; status: string }[];
        mcq: { submissions: { userId: string; score: number; total: number }[] } | null;
      };
    }

    const sessions: ExportSession[] = [];
    batch.modules.forEach((m) => {
      m.items.forEach((i) => {
        if (i.session) {
          sessions.push({ item: i, session: i.session as unknown as ExportSession['session'] });
        }
      });
    });

    sessions.sort((a, b) => a.session.scheduledAt.getTime() - b.session.scheduledAt.getTime());

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Edwhere LMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Aggregated Batch Report');

    // Columns: Name, Email, Session 1 (Att), Session 1 (MCQ), Session 2 ...
    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'Student Name', key: 'name', width: 25 },
      { header: 'Email', key: 'email', width: 30 }
    ];

    sessions.forEach((s, i) => {
      const idx = i + 1;
      columns.push({ header: `S${idx} Att`, key: `s${idx}_att`, width: 12 });
      if (s.session.mcq) {
        columns.push({ header: `S${idx} MCQ`, key: `s${idx}_mcq`, width: 12 });
      }
    });

    sheet.columns = columns;

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    batch.enrollments.forEach((enrollment) => {
      const p = profileMap.get(enrollment.userId);
      const rowData: Record<string, string | number> = {
        name: p?.name || enrollment.userId,
        email: p?.email || 'N/A'
      };

      sessions.forEach((s, i) => {
        const idx = i + 1;
        const att = s.session.attendances.find((a) => a.userId === enrollment.userId);
        rowData[`s${idx}_att`] = att ? att.status : 'N/A';

        if (s.session.mcq) {
          const sub = s.session.mcq.submissions.find((m) => m.userId === enrollment.userId);
          rowData[`s${idx}_mcq`] = sub ? `${sub.score}/${sub.total}` : 'N/A';
        }
      });

      sheet.addRow(rowData);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const filename = `Batch_Report_${batch.title.replace(/\s+/g, '_')}.xlsx`;

    return new Response(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return handleApiError('EXPORT_BATCH_REPORT', error);
  }
}
