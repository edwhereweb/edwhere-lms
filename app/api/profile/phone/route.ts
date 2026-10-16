import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiError, validateBody, handleApiError } from '@/lib/api-utils';
import { updateProfilePhoneSchema } from '@/lib/validations';

/**
 * POST /api/profile/phone
 *
 * Updates the current user's phone number in their Profile and syncs it with Clerk.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return apiError('Unauthorized', 401);

    const body = await req.json();
    const validation = validateBody(updateProfilePhoneSchema, body);
    if (!validation.success) return validation.response;

    const { countryCode, phone } = validation.data;
    const fullPhone = `${countryCode}${phone}`;

    // Update DB Profile
    const updatedProfile = await db.profile.update({
      where: { userId },
      data: { phoneNumber: fullPhone },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        phoneNumber: true
      }
    });

    // Mirror to Clerk (best-effort, fail-safe)
    try {
      const client = await clerkClient();
      await client.phoneNumbers.createPhoneNumber({
        userId,
        phoneNumber: fullPhone,
        verified: true
      });
    } catch {
      // Fail-safe: some Clerk tenant setups have custom phone verification policies
    }

    return NextResponse.json({
      success: true,
      phoneNumber: updatedProfile.phoneNumber
    });
  } catch (error) {
    return handleApiError('PROFILE_PHONE_POST', error);
  }
}
