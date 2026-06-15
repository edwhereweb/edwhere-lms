import crypto from 'crypto';
import { auth } from '@clerk/nextjs/server';
import {
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { db } from '@/lib/db';
import { createCertificateSchema } from '@/lib/validations';
import { z } from 'zod';

const bulkCertificateSchema = z.array(createCertificateSchema).min(1).max(500);

function generateCredentialId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hex = crypto.randomBytes(5).toString('hex').toUpperCase();
  return `CERT-${yy}${mm}${dd}-${hex}`;
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
    const result = validateMobileBody(bulkCertificateSchema, body);
    if (!result.success) return result.response;

    const data = result.data.map((cert) => ({
      credentialId: generateCredentialId(),
      recipientName: cert.recipientName,
      courseName: cert.courseName,
      duration: cert.duration,
      deliveryMode: cert.deliveryMode,
      dateOfAchievement: cert.dateOfAchievement,
      score: cert.score ?? null,
      issuedByUserId: userId
    }));

    const createResult = await db.certificate.createMany({ data });

    return mobileCreated({ count: createResult.count });
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CERTIFICATES_BULK', error);
  }
}
