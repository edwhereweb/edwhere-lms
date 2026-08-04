import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { db } from '@/lib/db';
import { createPlacementUserSchema, updatePlacementUserSchema } from '@/lib/validations';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const profile = await db.placementUser.findUnique({ where: { userId } });
    if (!profile) return mobileError('NOT_FOUND', 'Placement profile not found', 404);

    return mobileSuccess(profile);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_PROFILE_GET', error);
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const existing = await db.placementUser.findUnique({ where: { userId } });
    if (existing) return mobileError('CONFLICT', 'Placement profile already exists', 409);

    const body = await req.json();
    const result = validateMobileBody(createPlacementUserSchema, body);
    if (!result.success) return result.response;

    const placementUser = await db.placementUser.create({
      data: { ...result.data, userId }
    });

    return mobileCreated(placementUser);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_PROFILE_CREATE', error);
  }
}

export async function PATCH(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const existing = await db.placementUser.findUnique({ where: { userId } });
    if (!existing) return mobileError('NOT_FOUND', 'Placement profile not found', 404);

    const body = await req.json();
    const result = validateMobileBody(updatePlacementUserSchema, body);
    if (!result.success) return result.response;

    const updated = await db.placementUser.update({
      where: { userId },
      data: result.data
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_PROFILE_UPDATE', error);
  }
}
