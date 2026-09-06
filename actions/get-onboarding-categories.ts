import { db } from '@/lib/db';
import { logError } from '@/lib/debug';

/**
 * Curated categories featured on the new-user onboarding dashboard.
 * Matching is case-insensitive against `Category.name` so minor naming
 * variations (e.g. "AWS Cloud") still surface the tile.
 */
const FEATURED_CATEGORY_NAMES = ['Programming', 'Cybersecurity', 'AWS'];

const COURSES_PER_CATEGORY = 4;

export type OnboardingCategoryCourse = {
  id: string;
  title: string;
  slug: string | null;
  imageUrl: string | null;
  price: number | null;
};

export type OnboardingCategory = {
  id: string;
  name: string;
  courses: OnboardingCategoryCourse[];
};

/**
 * Fetches a small sample of published courses per featured category, for the
 * new-user onboarding dashboard. Categories with no published courses are
 * omitted entirely so the UI never renders an empty tile.
 */
export const getOnboardingCategories = async (): Promise<OnboardingCategory[]> => {
  try {
    const categories = await db.category.findMany({
      where: {
        OR: FEATURED_CATEGORY_NAMES.map((name) => ({
          name: { equals: name, mode: 'insensitive' as const }
        }))
      },
      include: {
        courses: {
          where: { isPublished: true },
          select: { id: true, title: true, slug: true, imageUrl: true, price: true },
          take: COURSES_PER_CATEGORY,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));

    return FEATURED_CATEGORY_NAMES.map((name) => byName.get(name.toLowerCase()))
      .filter((c): c is NonNullable<typeof c> => Boolean(c) && c!.courses.length > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        courses: c.courses
      }));
  } catch (error) {
    logError('GET_ONBOARDING_CATEGORIES', error);
    return [];
  }
};
