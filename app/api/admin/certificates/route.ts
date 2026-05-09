import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { createCertificateSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function GET(_req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden — only admins can manage certificates', 403);
    }

    const certificates = await db.certificate.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(certificates);
  } catch (error) {
    return handleApiError('GET_CERTIFICATES', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const profile = await db.profile.findUnique({ where: { userId } });
    if (!profile || profile.role !== 'ADMIN') {
      return apiError('Forbidden — only admins can issue certificates', 403);
    }

    const body = await req.json();
    const validation = validateBody(createCertificateSchema, body);
    if (!validation.success) return validation.response;

    const { recipientName, courseName, duration, deliveryMode, dateOfAchievement, score } =
      validation.data;

    // Generate a unique 10-character alphanumeric credential ID
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

    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    return handleApiError('CREATE_CERTIFICATE', error);
  }
}
