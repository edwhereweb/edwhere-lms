import { auth } from '@clerk/nextjs/server';
import {
  mobileSuccess,
  mobileCreated,
  mobileError,
  validateMobileBody,
  handleMobileApiError
} from '@/lib/api-mobile-utils';
import { currentProfile } from '@/lib/current-profile';
import { createCategory, listCategories } from '@/lib/services/category-service';
import { isTeacher } from '@/lib/teacher';
import { categorySchema } from '@/lib/validations';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const categories = await listCategories(true);

    return mobileSuccess(categories);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CATEGORIES_LIST', error);
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
    const result = validateMobileBody(categorySchema, body);
    if (!result.success) return result.response;

    const category = await createCategory(result.data);

    return mobileCreated(category);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_CATEGORIES_CREATE', error);
  }
}
