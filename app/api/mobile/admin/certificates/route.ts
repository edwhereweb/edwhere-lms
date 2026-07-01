import crypto from 'crypto';
import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { createCertificateSchema } from '@/lib/validations';

function generateCredentialId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hex = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `CERT-${yy}${mm}${dd}-${hex}`;
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { recipientName: { contains: search, mode: 'insensitive' } },
        { courseName: { contains: search, mode: 'insensitive' } },
        { credentialId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const certificates = await db.certificate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return mobileSuccess(certificates);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CERTIFICATES_LIST', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await currentProfile();
    if (!profile || profile.role !== 'ADMIN') {
      return mobileError('FORBIDDEN', 'Forbidden', 403);
    }

    const body = await req.json();
    const result = validateMobileBody(createCertificateSchema, body);
    if (!result.success) return result.response;

    const certificate = await db.certificate.create({
      data: {
        credentialId: generateCredentialId(),
        recipientName: result.data.recipientName,
        courseName: result.data.courseName,
        duration: result.data.duration,
        deliveryMode: result.data.deliveryMode,
        dateOfAchievement: result.data.dateOfAchievement,
        score: result.data.score ?? null,
        issuedByUserId: userId
      }
    });

    return mobileCreated(certificate);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CERTIFICATES_CREATE', error);
  }
}
