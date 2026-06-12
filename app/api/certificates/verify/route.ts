import { NextResponse } from 'next/server';
import { validateBody, apiError, handleApiError } from '@/lib/api-utils';
import { verifyCertificateSchema } from '@/lib/validations';
import { db } from '@/lib/db';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (isRateLimited(`cert-verify:${ip}`, { maxRequests: 10, windowMs: 60_000 })) {
      return apiError('Too many requests', 429);
    }

    const body = await req.json();
    const validation = validateBody(verifyCertificateSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { credentialId, dateOfAchievement } = validation.data;

    // Search case-insensitively for credential ID
    const certificate = await db.certificate.findFirst({
      where: {
        credentialId: { equals: credentialId, mode: 'insensitive' },
        dateOfAchievement: dateOfAchievement
      }
    });

    if (!certificate) {
      return apiError('Certificate not found or details do not match', 404);
    }

    return NextResponse.json(certificate);
  } catch (error) {
    return handleApiError('VERIFY_CERTIFICATE', error);
  }
}
