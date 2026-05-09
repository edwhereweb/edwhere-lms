import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { apiError, handleApiError } from '@/lib/api-utils';
import { createCertificateSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden — only admins can issue certificates', 403);
    }

    const body = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
      return apiError('Expected an array of certificate data', 400);
    }

    const successful = [];
    const failed = [];

    for (let index = 0; index < body.length; index++) {
      const row = body[index];
      const validation = createCertificateSchema.safeParse(row);

      if (!validation.success) {
        failed.push({
          row: index + 1,
          data: row,
          reason: validation.error.errors.map((e) => e.message).join(', ')
        });
        continue;
      }

      const { recipientName, courseName, duration, deliveryMode, dateOfAchievement, score } =
        validation.data;

      try {
        const randomStr = crypto.randomBytes(5).toString('hex').toUpperCase();
        const datePrefix = dateOfAchievement.replace(/-/g, '').slice(2, 8); // YYMMDD
        const credentialId = `CERT-${datePrefix}-${randomStr}`;

        const certificate = await db.certificate.create({
          data: {
            credentialId,
            recipientName,
            courseName,
            duration,
            deliveryMode,
            dateOfAchievement,
            score,
            issuedByUserId: userId
          }
        });

        successful.push(certificate);
      } catch {
        failed.push({
          row: index + 1,
          data: row,
          reason: 'Database error'
        });
      }
    }

    return NextResponse.json(
      {
        successCount: successful.length,
        failedCount: failed.length,
        successful,
        failed
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError('BULK_CREATE_CERTIFICATES', error);
  }
}
