import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { canManagePlacement } from '@/lib/placement';
import { db } from '@/lib/db';
import { updatePlacementCompanySchema } from '@/lib/validations';

export async function GET(_req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await params;

    const company = await db.placementCompany.findUnique({
      where: { id: companyId },
      include: {
        jobs: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!company || !company.isActive) return mobileError('NOT_FOUND', 'Company not found', 404);

    return mobileSuccess(company);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_COMPANY_GET', error);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManagePlacement(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { companyId } = await params;

    const company = await db.placementCompany.findUnique({ where: { id: companyId } });
    if (!company) return mobileError('NOT_FOUND', 'Company not found', 404);

    const body = await req.json();
    const result = validateMobileBody(updatePlacementCompanySchema, body);
    if (!result.success) return result.response;

    const updated = await db.placementCompany.update({
      where: { id: companyId },
      data: result.data
    });

    return mobileSuccess(updated);
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_COMPANY_UPDATE', error);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const allowed = await canManagePlacement(userId);
    if (!allowed) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { companyId } = await params;

    const company = await db.placementCompany.findUnique({ where: { id: companyId } });
    if (!company) return mobileError('NOT_FOUND', 'Company not found', 404);

    await db.placementCompany.update({ where: { id: companyId }, data: { isActive: false } });

    return mobileSuccess({ success: true });
  } catch (error) {
    return handleMobileApiError('MOBILE_PLACEMENT_COMPANY_DELETE', error);
  }
}
