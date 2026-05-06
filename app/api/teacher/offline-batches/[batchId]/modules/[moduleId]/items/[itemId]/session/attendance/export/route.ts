import { auth } from '@clerk/nextjs/server';
import ExcelJS from 'exceljs';
import { apiError, handleApiError } from '@/lib/api-utils';
import { canManageBatch } from '@/lib/batch-auth';
import { db } from '@/lib/db';

type Params = { params: Promise<{ batchId: string; itemId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const allowed = await canManageBatch(userId);
    if (!allowed) return apiError('Forbidden', 403);

    const { batchId, itemId } = await params;

    const session = await db.offlineSession.findUnique({
      where: { itemId },
      include: { attendances: true }
    });
    if (!session) return apiError('Session not found', 404);

    // Export is only available once the attendance window has been finalized
    if (!session.attendanceSubmittedAt) {
      return apiError(
        'Attendance has not been submitted yet. Export is unavailable until the attendance window closes.',
        400
      );
    }

    // Gather batch title, enrollments, and profiles in parallel
    const [batch, enrollments, instructorProfile] = await Promise.all([
      db.batch.findUnique({ where: { id: batchId }, select: { title: true } }),
      db.batchEnrollment.findMany({ where: { batchId }, select: { userId: true } }),
      db.profile.findUnique({ where: { userId: session.instructorId }, select: { name: true } })
    ]);

    const enrolledIds = enrollments.map((e) => e.userId);

    const profiles = await db.profile.findMany({
      where: { userId: { in: enrolledIds } },
      select: { userId: true, name: true, email: true }
    });

    // Unused profileMap removed
    const attendanceMap = new Map(session.attendances.map((a) => [a.userId, a]));

    // ── Build the workbook ───────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Edwhere LMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Attendance');

    // Column widths
    sheet.columns = [
      { key: 'num', width: 6 },
      { key: 'name', width: 30 },
      { key: 'email', width: 36 },
      { key: 'status', width: 18 },
      { key: 'remarks', width: 40 }
    ];

    // Metadata header block
    const metaStyle: Partial<ExcelJS.Style> = {
      font: { size: 11, color: { argb: 'FF374151' } }
    };
    const addMeta = (label: string, value: string) => {
      const row = sheet.addRow([`${label}:`, value]);
      row.getCell(1).font = { bold: true, size: 11 };
      row.getCell(2).style = metaStyle;
    };

    addMeta('Batch', batch?.title ?? batchId);
    addMeta(
      'Session Date',
      new Date(session.scheduledAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    );
    addMeta('Instructor', instructorProfile?.name ?? session.instructorId);
    addMeta(
      'Submitted At',
      new Date(session.attendanceSubmittedAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    );

    sheet.addRow([]); // spacer

    // Column header row
    const headerRow = sheet.addRow(['#', 'Student Name', 'Email', 'Status', 'Remarks']);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };
    });

    // Status colours
    const STATUS_FILLS: Record<string, string> = {
      PRESENT: 'FFD1FAE5', // emerald-100
      LATE: 'FFFEF3C7', // amber-100
      ABSENT: 'FFFEE2E2' // red-100
    };
    const STATUS_FONTS: Record<string, string> = {
      PRESENT: 'FF065F46',
      LATE: 'FF92400E',
      ABSENT: 'FF991B1B'
    };

    // Data rows — sort by name for readability
    const sortedProfiles = [...profiles].sort((a, b) => a.name.localeCompare(b.name));

    sortedProfiles.forEach((profile, idx) => {
      const att = attendanceMap.get(profile.userId);
      const rawStatus = att?.status ?? 'ABSENT';

      // Human-readable status label
      let statusLabel = 'Absent';
      if (rawStatus === 'PRESENT') statusLabel = 'Present';
      if (rawStatus === 'LATE') statusLabel = 'Late';

      const dataRow = sheet.addRow([
        idx + 1,
        profile.name,
        profile.email,
        statusLabel,
        rawStatus === 'LATE' ? (att?.remarks ?? '') : ''
      ]);

      const fillColor = STATUS_FILLS[rawStatus];
      const fontColor = STATUS_FONTS[rawStatus];

      dataRow.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      dataRow.getCell(4).font = { color: { argb: fontColor }, bold: true };

      // Zebra stripe on non-status cells
      if (idx % 2 === 1) {
        [1, 2, 3, 5].forEach((col) => {
          dataRow.getCell(col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF9FAFB' }
          };
        });
      }
    });

    // Auto-filter on the header row
    sheet.autoFilter = {
      from: { row: 6, column: 1 },
      to: { row: 6 + sortedProfiles.length, column: 5 }
    };

    // Stream buffer back as xlsx
    const buffer = await workbook.xlsx.writeBuffer();

    const dateSlug = new Date(session.scheduledAt).toISOString().slice(0, 10);
    const filename = `attendance_${dateSlug}.xlsx`;

    return new Response(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    return handleApiError('EXPORT_ATTENDANCE', error);
  }
}
